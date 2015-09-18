'use strict';

/*jshint -W098 */

var helpers = {};

// helper variable to avoid error when creating multiple sheets
// without passing a name parameter
helpers.newSheetCount = 1;
helpers.DEFAULT_NEW_WORKSHEET_TITLE = 1;
helpers.DEFAULT_NEW_WORKSHEET_ROWS = 50;
helpers.DEFAULT_NEW_WORKSHEET_COLUMNS = 20;

helpers.forceArray = function forceArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  return [val];
};

helpers.getLinksDict = function getLinksDict(linkArray) {
  var dataLinkArray = helpers.forceArray(linkArray);
  var resultLinkDict = {};
  dataLinkArray.forEach(function(link) {
    resultLinkDict[link.$.rel] = link.$.href;
  });

  return resultLinkDict;
};

helpers.xmlSafeValue = function xmlSafeValue(val) {
  if (val == null) return '';
  return String(val).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
};

helpers.xmlSafeColumnName = function xmlSafeColumnName(val) {
  if (!val) return '';
  return String(val).replace(/[\s_]+/g, '')
      .toLowerCase();
};

module.exports = helpers;
