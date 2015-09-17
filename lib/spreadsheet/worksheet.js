'use strict';

var helpers = require('../helpers');

var SpreadsheetWorksheet = function SpreadsheetWorksheet(spreadsheet, data) {
  var _this = this;

  _this.data = data;
  _this.id = data.id.substring(data.id.lastIndexOf('/') + 1);
  _this.title = data.title._;
  _this.rowCount = data['gs:rowCount'];
  _this.colCount = data['gs:colCount'];
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

  _this.delete = function(cb) {
    spreadsheet.makeFeedRequest(_this.links.edit, 'DELETE', null, cb);
  };
};

module.exports = SpreadsheetWorksheet;
