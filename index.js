(function() {
  'use strict';

  var async = require('async');
  var request = require('request');
  var xml2js = require('xml2js');
  var http = require('http');
  var querystring = require('querystring');
  var _ = require('lodash');
  var GoogleAuth = require('google-auth-library');
  var GOOGLE_FEED_URL = 'https://spreadsheets.google.com/feeds/';
  var GOOGLE_AUTH_SCOPE = ['https://spreadsheets.google.com/feeds'];

  // The main class that represents a single sheet
  // this is the main module.exports
  var GoogleSheets = function(ssKey, authId, options) {
    var _this = this;
    var googleAuth = null;
    var visibility = 'public';
    var projection = 'values';

    var authMode = 'anonymous';

    var authClient = new GoogleAuth();
    var jwtClient;

    options = options || {};

    var xmlParser = new xml2js.Parser({
      // options carried over from older version of xml2js
      // might want to update how the code works, but for now this is fine
      explicitArray: false,
      explicitRoot: false,
    });

    if (!ssKey) {
      throw new Error('Spreadsheet key not provided.');
    }

    function setAuthAndDependencies(auth) {
      googleAuth = auth;
      if (!options.visibility) {
        visibility = googleAuth ? 'private' : 'public';
      }

      if (!options.projection) {
        projection = googleAuth ? 'full' : 'values';
      }
    }

    // authId may be null
    setAuthAndDependencies(authId);

    // Authentication Methods
    this.setAuthToken = function(authId) {
      if (authMode === 'anonymous') authMode = 'token';
      setAuthAndDependencies(authId);
    };

    // deprecated username/password login method
    // leaving it here to help notify users why it doesn't work
    this.setAuth = function(username, password, cb) {
      return cb(new Error('Google has officially deprecated ClientLogin.' +
      'Please upgrade this module and see the readme for more instrucations'));
    };

    function renewJwtAuth(cb) {
      authMode = 'jwt';
      jwtClient.authorize(function(err, token) {
        if (err) return cb(err);
        _this.setAuthToken({
          /* jshint camelcase: false */
          /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
          type: token.token_type,
          value: token.access_token,
          expires: token.expiry_date,
          /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
        });
        cb();
      });
    }

    this.useServiceAccountAuth = function(creds, cb) {
      if (typeof creds === 'string') creds = require(creds);
      /* jshint camelcase: false */
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      jwtClient = new authClient.JWT(creds.client_email, null,
        creds.private_key, GOOGLE_AUTH_SCOPE, null);
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      renewJwtAuth(cb);
    };

    // This method is used internally to make all requests
    this.makeFeedRequest = function(urlParams, method, queryOrData, cb) {
      var url;
      var headers = {};
      if (!cb) cb = function() {};

      if (typeof (urlParams) === 'string') {
        // used for edit / delete requests
        url = urlParams;
      } else if (Array.isArray(urlParams)) {
        //used for get and post requets
        urlParams.push(visibility, projection);
        url = GOOGLE_FEED_URL + urlParams.join('/');
      }

      async.series([

        //authentication
        function(step) {
          if (authMode !== 'jwt') return step(null);

          // check if jwt token is expired
          if (googleAuth.expires > +new Date()) return step(null);
          renewJwtAuth(function(err) {
            if (err) step(err);
            else step(null);
          });
        },

        //make request
        function(step) {
          if (googleAuth) {
            if (googleAuth.type === 'Bearer') {
              headers.Authorization = 'Bearer ' + googleAuth.value;
            } else {
              headers.Authorization = 'GoogleLogin auth=' + googleAuth;
            }
          }

          if (method === 'POST' || method === 'PUT') {
            headers['content-type'] = 'application/atom+xml';
          }

          if (method === 'GET' && queryOrData) {
            url += '?' + querystring.stringify(queryOrData);
          }

          request({
            url: url,
            method: method,
            headers: headers,
            body: method === 'POST' || method === 'PUT' ? queryOrData : null,
          }, function(err, response, body) {
            if (err) {
              return step(err);
            } else if (response.statusCode === 401) {
              return step(new Error('Invalid authorization key.'));
            } else if (response.statusCode >= 400) {
              return step(new Error('HTTP error ' + response.statusCode + ': ' +
                http.STATUS_CODES[response.statusCode]) + ' ' +
                JSON.stringify(body));
            } else if (response.statusCode === 200 &&
                  response.headers['content-type'].indexOf('text/html') >= 0) {
              return step(new Error('Sheet is private. Use authentication or ' +
              'make public. (see ' + 'https://github.com/theoephraim/' +
              'node-google-spreadsheet#a-note-on-authentication ' +
              'for details)'));
            }

            if (body) {
              xmlParser.parseString(body, function(err, result) {
                if (err) return step(err);

                step(null, { result: result, body: body });
              });
            } else {
              if (err) step(err);
              else step(null, true);
            }
          });
        },

      ], function(err, results) {
        if (err) cb(err);
        cb(null, results[1].result, results[1].body);
      });
    };

    // public API methods
    this.getInfo = function(cb) {
      _this.makeFeedRequest(['worksheets', ssKey], 'GET', null,
                            function(err, data) {
        if (err) return cb(err);
        if (data === true) {
          return cb(new Error('No response to getInfo call'));
        }

        var ssData = {
          id: data.id,
          title: data.title._,
          updated: data.updated,
          author: data.author,
          worksheets: [],
        };

        var worksheets = forceArray(data.entry);

        worksheets.forEach(function(wsData) {
          ssData.worksheets.push(new SpreadsheetWorksheet(_this, wsData));
        });

        cb(null, ssData);
      });
    };

    // NOTE: worksheet IDs start at 1

    this.getRows = function(worksheetId, opts, cb) {
      // the first row is used as titles/keys and is not included

      // opts is optional
      if (typeof (opts) === 'function') {
        cb = opts;
        opts = {};
      }

      var query  = {};
      if (opts.start) query['start-index'] = opts.start;
      if (opts.num) query['max-results'] = opts.num;
      if (opts.orderby) query.orderby = opts.orderby;
      if (opts.reverse) query.reverse = opts.reverse;
      if (opts.query) query.sq = opts.query;

      _this.makeFeedRequest(['list', ssKey, worksheetId], 'GET', query,
                            function(err, data, xml) {
        if (err) return cb(err);
        if (data === true) {
          return cb(new Error('No response to getRows call'));
        }

        // gets the raw xml for each entry -- this is passed to the row object
        // so we can do updates on it later
        var entriesXML = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g);
        var rows = [];
        var entries = forceArray(data.entry);
        var i = 0;
        entries.forEach(function(rowData) {
          rows.push(new SpreadsheetRow(_this, rowData, entriesXML[ i++ ]));
        });

        cb(null, rows);
      });
    };

    this.addWorkSheet = function(name, data, cb) {
      var dataXML = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
        'xmlns:gsx="http://schemas.google.com/spreadsheets/2006">' +
        '<title>' + name +
        '</title><gsx:rowCount>50</gsx:rowCount>' +
        '<gsx:colCount>20</gsx:colCount>' +
        '</entry>';
      _this.makeFeedRequest(['worksheets', ssKey], 'POST', dataXML, cb);
    };

    this.addRow = function(worksheetId, data, cb) {
      var dataXML = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
      'xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">\n';
      Object.keys(data).forEach(function(key) {
        if (key !== 'id' &&
            key !== 'title' &&
            key !== 'content' &&
            key !== '_links') {
          dataXML += '<gsx:' + xmlSafeColumnName(key) + '>' +
                     xmlSafeValue(data[key]) + '</gsx:' +
                     xmlSafeColumnName(key) + '>' + '\n';
        }
      });

      dataXML += '</entry>';
      _this.makeFeedRequest(['list', ssKey, worksheetId], 'POST', dataXML, cb);
    };

    this.getCells = function(worksheetId, opts, cb) {
      // opts is optional
      if (typeof (opts) === 'function') {
        cb = opts;
        opts = {};
      }

      // Supported options are:
      // min-row, max-row, min-col, max-col, return-empty
      var query = _.assign({}, opts);

      _this.makeFeedRequest(['cells', ssKey, worksheetId], 'GET', query,
                            function(err, data) {
        if (err) return cb(err);
        if (data === true) {
          return cb(new Error('No response to getCells call'));
        }

        var cells = [];
        var entries = forceArray(data.entry);
        entries.forEach(function(cellData) {
          cells.push(new SpreadsheetCell(_this, worksheetId, cellData));
        });

        cb(null, cells);
      });
    };

  };

  // Classes
  var SpreadsheetWorksheet = function(spreadsheet, data) {
    var _this = this;

    _this.id = data.id.substring(data.id.lastIndexOf('/') + 1);
    _this.title = data.title._;
    _this.rowCount = data['gs:rowCount'];
    _this.colCount = data['gs:colCount'];

    this.getRows = function(opts, cb) {
      spreadsheet.getRows(_this.id, opts, cb);
    };

    this.getCells = function(opts, cb) {
      spreadsheet.getCells(_this.id, opts, cb);
    };

    this.addRow = function(data, cb) {
      spreadsheet.addRow(_this.id, data, cb);
    };

    this.addWorkSheet = function(data, cb) {
      spreadsheet.addWorkSheet(_this.id, data, cb);
    };
  };

  var SpreadsheetRow = function(spreadsheet, data, xml) {
    var _this = this;
    _this._xml = xml;
    Object.keys(data).forEach(function(key) {
      var val = data[key];
      if (key.substring(0, 4) === 'gsx:') {
        if (typeof val === 'object' && Object.keys(val).length === 0) {
          val = null;
        }

        if (key === 'gsx:') {
          _this[key.substring(0, 3)] = val;
        } else {
          _this[key.substring(4)] = val;
        }
      } else {
        if (key === 'id') {
          _this[key] = val;
        } else if (val._) {
          _this[key] = val._;
        } else if (key === 'link') {
          _this._links = [];
          val = forceArray(val);
          val.forEach(function(link) {
            _this._links[link.$.rel] = link.$.href;
          });
        }
      }
    }, this);

    _this.save = function(cb) {
      /*
      API for edits is very strict with the XML it accepts
      So we just do a find replace on the original XML.
      It's dumb, but I couldnt get any JSON->XML conversion to work reliably
      */

      var dataXML = _this._xml;

      // probably should make this part more robust?
      dataXML = dataXML.replace('<entry>',
        '<entry xmlns=\'http://www.w3.org/2005/Atom\' ' +
        'xmlns:gsx=\'http://schemas.google.com/spreadsheets/2006/extended\'>');
      Object.keys(_this).forEach(function(key) {
        if (key.substr(0, 1) !== '_' && typeof (_this[key] === 'string')) {
          dataXML = dataXML.replace(new RegExp('<gsx:' +
            xmlSafeColumnName(key) + '>([\\s\\S]*?)</gsx:' +
            xmlSafeColumnName(key) + '>'),
            '<gsx:' + xmlSafeColumnName(key) +
            '>' + xmlSafeValue(_this[key]) +
            '</gsx:' + xmlSafeColumnName(key) + '>');
        }
      });

      spreadsheet.makeFeedRequest(_this._links.edit, 'PUT', dataXML, cb);
    };

    _this.del = function(cb) {
      spreadsheet.makeFeedRequest(_this._links.edit, 'DELETE', null, cb);
    };
  };

  var SpreadsheetCell = function(spreadsheet, worksheetId, data) {
    var _this = this;

    _this.id = data.id;

    _this.row = parseInt(data['gs:cell'].$.row);
    _this.col = parseInt(data['gs:cell'].$.col);
    _this.value = data['gs:cell']._;
    _this.numericValue = data['gs:cell'].$.numericValue;

    _this._links = [];
    var links = forceArray(data.link);
    links.forEach(function(link) {
      _this._links[link.$.rel] = link.$.href;
    });

    _this.setValue = function(newValue, cb) {
      _this.value = newValue;
      _this.save(cb);
    };

    _this.save = function(cb) {
      var newValue = xmlSafeValue(_this.value);
      var editId = 'https://spreadsheets.google.com/feeds/cells/key/' +
        'worksheetId/private/full/R' + _this.row + 'C' + _this.col;
      var dataXML = '<entry><id>' + editId + '</id>' +
      '<link rel="edit" type="application/atom+xml" href="' + editId + '"/>' +
      '<gs:cell row="' + _this.row + '" col="' + _this.col +
      '" inputValue="' + newValue + '"/></entry>';

      dataXML = dataXML.replace('<entry>',
        '<entry xmlns=\'http://www.w3.org/2005/Atom\' ' +
        'xmlns:gs=\'http://schemas.google.com/spreadsheets/2006\'>');

      spreadsheet.makeFeedRequest(_this._links.edit, 'PUT', dataXML, cb);
    };

    _this.del = function(cb) {
      _this.setValue('', cb);
    };
  };

  module.exports = GoogleSheets;

  //utils
  var forceArray = function(val) {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    return [val];
  };

  var xmlSafeValue = function(val) {
    if (val == null) return '';
    return String(val).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
  };

  var xmlSafeColumnName = function(val) {
    if (!val) return '';
    return String(val).replace(/[\s_]+/g, '')
        .toLowerCase();
  };
}());
