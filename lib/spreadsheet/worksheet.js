'use strict';

var helpers = require('../helpers');

var SpreadsheetWorksheet = function SpreadsheetWorksheet(spreadsheet,
                                                                  data, xml) {
  var _this = this;

  _this._xml = xml;
  _this.data = data;
  _this.id = data.id.substring(data.id.lastIndexOf('/') + 1);
  _this.title = data.title._;
  _this.rowCount = parseInt(data['gs:rowCount']);
  _this.colCount = parseInt(data['gs:colCount']);
  _this.links = helpers.getLinksDict(data.link);

  _this.getRows = function(opts, cb) {
    spreadsheet.getRows(_this.id, opts, cb);
  };

  _this.getCells = function(opts, cb) {
    spreadsheet.getCells(_this.id, opts, cb);
  };

  _this.addRow = function(data, cb) {
    spreadsheet.addRow(_this.id, data, cb);
  };

  _this.update = function(opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }

    if (opts.title) _this.title = opts.title;
    if (opts.rowCount) _this.rowCount = opts.rowCount;
    if (opts.colCount) _this.colCount = opts.colCount;

    var dataXML = _this._xml;

    dataXML = dataXML.replace('<entry>',
      '<entry xmlns=\'http://www.w3.org/2005/Atom\' ' +
      'xmlns:gs=\'http://schemas.google.com/spreadsheets/2006\'>');

    Object.keys(_this).forEach(function(key) {
      if (key.substr(0, 1) !== '_' &&
          key !== 'links' &&
          (typeof _this[key] !== 'function')) {

        var xmlOpeningElement = '';
        var xmlClosingElement = '';
        if (key === 'title') {
          xmlOpeningElement = key + ' type=\'text\'';
          xmlClosingElement = key;
        } else {
          xmlOpeningElement = 'gs:' + key;
          xmlClosingElement = xmlOpeningElement;
        }

        var regex = new RegExp('<' + xmlOpeningElement +
          '>([\\s\\S]*?)</' +
          xmlClosingElement + '>');

        dataXML = dataXML.replace(regex,
          '<' + xmlOpeningElement +
          '>' + helpers.xmlSafeValue(_this[key]) +
          '</' + xmlClosingElement + '>');
      }
    });

    spreadsheet.makeFeedRequest(_this.links.edit, 'PUT', dataXML, cb);
  };

  _this.delete = function(cb) {
    spreadsheet.makeFeedRequest(_this.links.edit, 'DELETE', null, cb);
  };
};

module.exports = SpreadsheetWorksheet;
