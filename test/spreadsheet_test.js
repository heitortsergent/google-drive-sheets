'use strict';

/*jshint -W101 */
/*
These tests use the test spreadsheet accessible at https://docs.google.com/spreadsheets/d/148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y/edit#gid=0

In order to allow other devs to test both read and write funcitonality,
the doc must be public read/write which means if someone feels like it,
they could mess up the sheet which would mess up the tests.
Please don't do that...
*/
/*jshint +W101 */

var async = require('async');

var GoogleSheets = require('../index.js');
var doc = new GoogleSheets('148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y');
var creds = require('./test_creds');
var sheet;

module.exports.nodeGoogleSheets = {
  testInfo: function(test) {
    test.expect(2);
    doc.getInfo(function(err, sheetInfo) {
      // even with public read/write, I think sheet author should stay constant
      test.equal(sheetInfo.author.email, 'theozero@gmail.com',
        'can read sheet info from google doc');

      sheet = sheetInfo.worksheets[0];
      test.equal(sheet.title, 'Sheet1', 'can read sheet names from doc');

      test.done();
    });
  },

  checkInitAuth: function(test) {
    doc.useServiceAccountAuth(creds, function(err) {
      test.done(err);
    });
  },

  clearSheet: function(test) {
    sheet.getRows(function(err, rows) {
      if (rows.length === 0) return test.done();
      async.each(rows, function(row, cb) {
        row.del(cb);
      },

      function(err) {
        if (err) console.log(err);
        test.done();
      });
    });
  },

  checkDelete: function(test) {
    test.expect(1);
    async.waterfall([
      function read(cb) {
        sheet.getRows(cb);
      },

      function check(rows, cb) {
        test.equal(rows.length, 0, 'sheet should be empty after delete calls');
        cb();
      },

    ], function(err) {
      if (err) console.log(err);
      test.done();
    });
  },

  basicWriteAndRead: function(test) {
    test.expect(2);
    async.waterfall([
      function write(cb) {
        // NOTE -- key and val are arbitrary headers.
        // These are the column headers in the first row of the spreadsheet.
        sheet.addRow({ col1: 'test-col1', col2: 'test-col2' }, function(err) {
          cb(err);
        });
      },

      function read(cb) {
        sheet.getRows(cb);
      },

      function check(rows, cb) {
        test.equal(rows[0].col1, 'test-col1',
          'newly written value should match read value');
        test.equal(rows[0].col2, 'test-col2',
          'newly written value should match read value');
        cb();
      },

    ], function(err) {
      if (err) console.log(err);
      test.done();
    });
  },

  checkNewlinesRead: function(test) {
    test.expect(2);
    async.waterfall([
      function write(cb) {
        sheet.addRow({ col1: 'Newline\ntest', col2: 'Double\n\nnewline test' },
        function() {
          cb();
        });
      },

      function read(cb) {
        sheet.getRows(cb);
      },

      function check(rows, cb) {
        // this was an issue before with an older version of xml2js
        test.ok(rows[1].col1.indexOf('\n') > 0,
          'newline is read from sheet');
        test.ok(rows[1].col2.indexOf('\n\n') > 0,
          'double newline is read from sheet');
        cb();
      },

    ], function(err) {
      if (err) console.log(err);
      test.done();
    });
  },

  // TODO - test cell based feeds
};
