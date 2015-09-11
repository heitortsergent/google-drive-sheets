'use strict';

/*jshint -W098 */

var forceArray = function forceArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  return [val];
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
  xmlSafeValue: xmlSafeValue,
  xmlSafeColumnName: xmlSafeColumnName,
};
