'use strict';

var helpers = require('../helpers');

var SpreadsheetRow = function SpreadsheetRow(spreadsheet, data, xml) {
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
        val = helpers.forceArray(val);
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
          helpers.xmlSafeColumnName(key) + '>([\\s\\S]*?)</gsx:' +
          helpers.xmlSafeColumnName(key) + '>'),
          '<gsx:' + helpers.xmlSafeColumnName(key) +
          '>' + helpers.xmlSafeValue(_this[key]) +
          '</gsx:' + helpers.xmlSafeColumnName(key) + '>');
      }
    });

    spreadsheet.makeFeedRequest(_this._links.edit, 'PUT', dataXML, cb);
  };

  _this.del = function(cb) {
    spreadsheet.makeFeedRequest(_this._links.edit, 'DELETE', null, cb);
  };
};

module.exports = SpreadsheetRow;
