'use strict';

/*jshint -W101 */
/*
These tests use the test spreadsheet accessible at https://docs.google.com/spreadsheets/d/148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y/edit#gid=0 // jshint ignore:line

In order to allow other devs to test both read and write funcitonality,
the doc must be public read/write which means if someone feels like it,
they could mess up the sheet which would mess up the tests.
Please don't do that...
*/
/*jshint +W101 */

/*jshint -W117 */

require('dotenv').load();

var async = require('async');
var GoogleSheets = require('../lib/index.js');
var doc = new GoogleSheets(process.env.GOOGLE_SPREADSHEET_ID);
var sheet;
var worksheet;

var chai = require('chai');
var expect = chai.expect; // jshint ignore:line
var should = chai.should(); // jshint ignore:line

describe('Spreadsheet', function() {
  this.timeout(5000);

  describe('#useServiceAccountAuth', function() {
    it('should authenticate', function(done) {
      var creds = {
        /* jshint camelcase: false */
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        client_email: process.env.CLIENT_EMAIL,
        private_key: process.env.PRIVATE_KEY,
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      };
      doc.useServiceAccountAuth(creds, function(err) {
        done(err);
      });
    });
  });

  describe('#getInfo()', function() {
    it('should get Spreadsheet information', function(done) {
      doc.getInfo(function(err, sheetInfo) {
        // even with public read/write sheet author should stay constant
        sheet = sheetInfo;
        sheet.author.email.should.equal('heitortsergent@gmail.com');

        worksheet = sheetInfo.worksheets[0];
        worksheet.title.should.equal('Sheet1');

        done(err);
      });
    });
  });

  describe('#worksheets', function() {
    it('should add a worksheet', function(done) {
      var opts = {
        title: 'AwesomeSheet',
      };

      doc.addWorksheet(opts, function(err) {
        if (err) done(err);
        doc.getInfo(function(err, sheetInfo) {
          if (err) done(err);

          sheet = sheetInfo;

          sheetInfo.worksheets.should.have.length(2);
          worksheet = sheetInfo.worksheets[1];
          worksheet.title.should.equal('AwesomeSheet');

          done();
        });
      });
    });

    it('should update a worksheet', function(done) {
      var opts = {
        title: 'UpdatedTitle',
        rowCount: 10,
        colCount: 15,
      };

      worksheet.update(opts, function(err) {
        if (err) done(err);

        doc.getInfo(function(err, sheetInfo) {
          if (err) done(err);

          sheet = sheetInfo;

          worksheet = sheetInfo.worksheets[1];
          worksheet.title.should.equal(opts.title);
          worksheet.rowCount.should.equal(opts.rowCount);
          worksheet.colCount.should.equal(opts.colCount);

          done();
        });
      });
    });
  });

  describe('#addRow', function() {
    it('should add first row for headers', function(done) {
      worksheet.getCells({ 'min-row': 1, 'max-row': 1,
                           'max-col': 2, 'return-empty': true, },
                           function(err, cells) {
        if (err) done(err);

        async.forEachOf(cells, function(cell, key, callback) {
          cell.setValue('col' + (key + 1), callback);
        },

        done);
      });
    });

    it('should check if row was added', function(done) {
      async.waterfall([
        function write(cb) {
          // NOTE -- key and val are arbitrary headers.
          // These are the column headers in the first row of the spreadsheet.
          worksheet.addRow({ col1: 'test-col1', col2: 'test-col2' },
            function(err) {
              cb(err);
            });
        },

        function read(cb) {
          worksheet.getRows(cb);
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
          worksheet.addRow({ col1: 'Newline\ntest',
                         col2: 'Double\n\nnewline test', },
          function() {
            cb();
          });
        },

        function read(cb) {
          worksheet.getRows(cb);
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

  describe('#getRows', function() {
    it('should clear all rows except for headers', function(done) {
      worksheet.getRows(function(err, rows) {
        if (rows.length === 0) return done(err);
        rows.reverse();
        async.eachSeries(rows, function(row, cb) {
          row.del(cb);
        }, done);
      });
    });

    it('should check if rows are empty except for headers', function(done) {
      worksheet.getRows(function(err, rows) {
        rows.length.should.equal(0);
        done(err);
      });
    });
  });

  describe('#worksheets', function() {
    it('should delete a worksheet', function(done) {
      worksheet.delete(done);
    });
  });

  // TODO - test cell based feeds
});
