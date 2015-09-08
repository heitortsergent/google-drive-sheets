'use strict';

/*jshint -W101 */
/*jshint -W098 */
/*
These tests use the test spreadsheet accessible at https://docs.google.com/spreadsheets/d/148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y/edit#gid=0

In order to allow other devs to test both read and write funcitonality,
the doc must be public read/write which means if someone feels like it,
they could mess up the sheet which would mess up the tests.
Please don't do that...
*/
/*jshint +W101 */

/*jshint -W117 */

var async = require('async');
var GoogleSheets = require('../index.js');
var doc = new GoogleSheets('148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y');
var creds = require('./test_creds');
var sheet;
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

describe('Spreadsheet', function() {
  this.timeout(5000);

  describe('#getInfo()', function() {
    it('should get Spreadsheet information', function(done) {
      doc.getInfo(function(err, sheetInfo) {
        // even with public read/write sheet author should stay constant
        sheetInfo.author.email.should.equal('theozero@gmail.com');

        sheet = sheetInfo.worksheets[0];
        sheet.title.should.equal('Sheet1');

        done(err);
      });
    });
  });

  describe('#useServiceAccountAuth', function() {
    it('should authenticate', function(done) {
      doc.useServiceAccountAuth(creds, function(err) {
        done(err);
      });
    });
  });

  describe('#getRows', function() {
    it('should clear all rows', function(done) {
      sheet.getRows(function(err, rows) {
        if (rows.length === 0) return done(err);
        async.each(rows, function(row, cb) {
          row.del(cb);
        }, done);
      });
    });

    it('should check if rows are empty', function(done) {
      async.waterfall([
        function read(cb) {
          sheet.getRows(cb);
        },

        function check(rows, cb) {
          rows.length.should.equal(0);
          cb();
        },

      ], done);
    });
  });

  describe('#addRow', function() {
    it('should check if row was added', function(done) {
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
          rows[0].col1.should.equal('test-col1');
          rows[0].col2.should.equal('test-col2');
          cb();
        },

      ], done);
    });

    it('should add and read newlines', function(done) {
      async.waterfall([
        function write(cb) {
          sheet.addRow({ col1: 'Newline\ntest',
                         col2: 'Double\n\nnewline test', },
          function() {
            cb();
          });
        },

        function read(cb) {
          sheet.getRows(cb);
        },

        function check(rows, cb) {
          // this was an issue before with an older version of xml2js
          rows[1].col1.indexOf('\n').should.be.greaterThan(0);
          rows[1].col2.indexOf('\n\n').should.be.greaterThan(0);
          cb();
        },

      ], done);
    });
  });

  // TODO - test cell based feeds
});
