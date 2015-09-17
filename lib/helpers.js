'use strict';

/*jshint -W098 */

var forceArray = function forceArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  return [val];
};

var getLinksDict = function getLinksDict(linkArray) {
  var dataLinkArray = forceArray(linkArray);
  var resultLinkDict = {};
  dataLinkArray.forEach(function(link) {
    resultLinkDict[link.$.rel] = link.$.href;
  });

  return resultLinkDict;
};

var xmlSafeValue = function xmlSafeValue(val) {
  if (val == null) return '';
  return String(val).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
};

var xmlSafeColumnName = function xmlSafeColumnName(val) {
  if (!val) return '';
  return String(val).replace(/[\s_]+/g, '')
      .toLowerCase();
};

module.exports = {
  forceArray: forceArray,
  getLinksDict: getLinksDict,
  xmlSafeValue: xmlSafeValue,
  xmlSafeColumnName: xmlSafeColumnName,
};
