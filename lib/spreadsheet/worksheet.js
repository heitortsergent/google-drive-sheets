'use strict';

var SpreadsheetWorksheet = function SpreadsheetWorksheet(spreadsheet, data) {
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

module.exports = SpreadsheetWorksheet;
