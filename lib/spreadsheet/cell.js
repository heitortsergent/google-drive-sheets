'use strict';

var helpers = require('../helpers');

var SpreadsheetCell = function SpreadsheetCell(spreadsheet, worksheetId, data) {
  var _this = this;

  _this.id = data.id;

  _this.row = parseInt(data['gs:cell'].$.row);
  _this.col = parseInt(data['gs:cell'].$.col);
  _this.value = data['gs:cell']._;
  _this.numericValue = data['gs:cell'].$.numericValue;
  _this.links = helpers.getLinksDict(data.link);

  _this.setValue = function(newValue, cb) {
    _this.value = newValue;
    _this.save(cb);
  };

  _this.save = function(cb) {
    var newValue = helpers.xmlSafeValue(_this.value);
    var editId = 'https://spreadsheets.google.com/feeds/cells/key/' +
      'worksheetId/private/full/R' + _this.row + 'C' + _this.col;
    var dataXML = '<entry><id>' + editId + '</id>' +
    '<link rel="edit" type="application/atom+xml" href="' + editId + '"/>' +
    '<gs:cell row="' + _this.row + '" col="' + _this.col +
    '" inputValue="' + newValue + '"/></entry>';

    dataXML = dataXML.replace('<entry>',
      '<entry xmlns=\'http://www.w3.org/2005/Atom\' ' +
      'xmlns:gs=\'http://schemas.google.com/spreadsheets/2006\'>');

    spreadsheet.makeFeedRequest(_this.links.edit, 'PUT', dataXML, cb);
  };

  _this.del = function(cb) {
    _this.setValue('', cb);
  };
};

module.exports = SpreadsheetCell;
