'use strict';

var async = require('async');
var request = require('request');
var xml2js = require('xml2js');
var http = require('http');
var querystring = require('querystring');
var _ = require('lodash');
var GOOGLE_FEED_URL = 'https://spreadsheets.google.com/feeds/';

var SpreadsheetWorksheet = require('./spreadsheet/worksheet');
var SpreadsheetRow = require('./spreadsheet/row');
var SpreadsheetCell = require('./spreadsheet/cell');
var helpers = require('./helpers');
var Auth = require('./auth.js');

// The main class that represents a single sheet
// this is the main module.exports
var GoogleSheets = function(ssKey, authId, options) {
  if (!ssKey) {
    throw new Error('Spreadsheet key not provided.');
  }

  var _this = this;
  var auth = new Auth(options);

  _this.useServiceAccountAuth = auth.useServiceAccountAuth;

  var xmlParser = new xml2js.Parser({
    // options carried over from older version of xml2js
    // might want to update how the code works, but for now this is fine
    explicitArray: false,
    explicitRoot: false,
  });

  // authId may be null
  auth.setAuthAndDependencies(authId);

  // This method is used internally to make all requests
  _this.makeFeedRequest = function(urlParams, method, queryOrData, cb) {
    var url;
    var headers = {};
    if (!cb) cb = function() {};

    if (typeof urlParams === 'string') {
      // used for edit / delete requests
      url = urlParams;
    } else if (Array.isArray(urlParams)) {
      //used for get and post requets
      urlParams.push(auth.visibility, auth.projection);
      url = GOOGLE_FEED_URL + urlParams.join('/');
    }

    async.series([

      //authentication
      function(step) {
        if (auth.authMode !== 'jwt') return step(null);

        // check if jwt token is expired
        if (auth.googleAuth.expires > +new Date()) return step(null);
        auth.renewJwtAuth(function(err) {
          if (err) step(err);
          else step(null);
        });
      },

      //make request
      function(step) {
        if (auth.googleAuth) {
          if (auth.googleAuth.type === 'Bearer') {
            headers.Authorization = 'Bearer ' + auth.googleAuth.value;
          } else {
            headers.Authorization = 'GoogleLogin auth=' + auth.googleAuth;
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
      else cb(null, results[1].result, results[1].body);
    });
  };

  // public API methods
  _this.getInfo = function(cb) {
    _this.makeFeedRequest(['worksheets', ssKey], 'GET', null,
                          function(err, data, xml) {
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

      // gets the raw xml for each worksheet so we can do updates on it
      var entriesXML = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g);
      var i = 0;

      var worksheets = helpers.forceArray(data.entry);
      worksheets.forEach(function(wsData) {
        ssData.worksheets.push(
          new SpreadsheetWorksheet(_this, wsData, entriesXML[i++]));
      });

      cb(null, ssData);
    });
  };

  _this.addWorksheet = function(opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }

    var worksheetName = opts.title ||
      (helpers.DEFAULT_NEW_WORKSHEET_TITLE + helpers.newSheetCount++);
    var rowCount = opts.rowCount || helpers.DEFAULT_NEW_WORKSHEET_ROWS;
    var colCount = opts.colCount || helpers.DEFAULT_NEW_WORKSHEET_COLUMNS;

    var dataXML = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
      'xmlns:gs="http://schemas.google.com/spreadsheets/2006">' +
      '<title>' + worksheetName +
      '</title><gs:rowCount>' + rowCount + '</gs:rowCount>' +
      '<gs:colCount>' + colCount + '</gs:colCount>' +
      '</entry>';
    _this.makeFeedRequest(['worksheets', ssKey], 'POST', dataXML, cb);
  };

  // NOTE: worksheet IDs start at 1

  _this.getRows = function(worksheetId, opts, cb) {
    // the first row is used as titles/keys and is not included

    if (typeof opts === 'function') {
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
      var entries = helpers.forceArray(data.entry);
      var i = 0;
      entries.forEach(function(rowData) {
        rows.push(new SpreadsheetRow(_this, rowData, entriesXML[i++]));
      });

      cb(null, rows);
    });
  };

  _this.addRow = function(worksheetId, data, cb) {
    var dataXML = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
    'xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">\n';
    Object.keys(data).forEach(function(key) {
      if (key !== 'id' &&
          key !== 'title' &&
          key !== 'content' &&
          key !== 'links') {
        dataXML += '<gsx:' + helpers.xmlSafeColumnName(key) + '>' +
                   helpers.xmlSafeValue(data[key]) + '</gsx:' +
                   helpers.xmlSafeColumnName(key) + '>' + '\n';
      }
    });

    dataXML += '</entry>';
    _this.makeFeedRequest(['list', ssKey, worksheetId], 'POST', dataXML, cb);
  };

  _this.getCells = function(worksheetId, opts, cb) {
    // opts is optional
    if (typeof opts === 'function') {
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
      var entries = helpers.forceArray(data.entry);
      entries.forEach(function(cellData) {
        cells.push(new SpreadsheetCell(_this, worksheetId, cellData));
      });

      cb(null, cells);
    });
  };

};

module.exports = GoogleSheets;
