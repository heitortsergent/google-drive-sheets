# Google Drive Sheets

__Important: This package is not being maintained anymore. I recommend looking at Google's official package [here](https://developers.google.com/sheets/api/quickstart/nodejs).__

[![NPM version](http://img.shields.io/npm/v/google-drive-sheets.svg)](https://www.npmjs.org/package/google-drive-sheets) [![npm](https://img.shields.io/npm/l/express.svg)](LICENSE) [![Build Status via Travis CI](https://travis-ci.org/heitortsergent/google-drive-sheets.svg?branch=master)](https://travis-ci.org/heitortsergent/google-drive-sheets) [![Coverage Status](https://coveralls.io/repos/heitortsergent/google-drive-sheets/badge.svg?branch=master&service=github)](https://coveralls.io/github/heitortsergent/google-drive-sheets?branch=master) [![Dependency Status](https://david-dm.org/heitortsergent/google-drive-sheets.svg)](https://david-dm.org/heitortsergent/google-drive-sheets) [![devDependency Status](https://david-dm.org/heitortsergent/google-drive-sheets/dev-status.svg)](https://david-dm.org/heitortsergent/google-drive-sheets#info=devDependencies)

A simple Node.js library to read and manipulate data in Google Spreadsheets.

Works without authentication for read-only sheets or with auth for adding/editing/deleting data.
Supports both list-based and cell-based feeds.

You can find more information about the Google Sheets API [here](https://developers.google.com/google-apps/spreadsheets/).

* [Installation](#installation)
* [Basic Usage](#basic-usage)
* [Authentication](#authentication)
* [API](#api)
* [Further possibilities & to-do](#further-possibilities--to-do)
* [Thanks](#thanks)


## Installation

```sh
$ npm install --save google-drive-sheets
```


## Basic Usage

``` javascript
var GoogleSheets = require('google-drive-sheets');

// spreadsheet key is the long id in the sheets URL
var mySheet = new GoogleSheets('<spreadsheet key>');

// Without auth -- read only
// IMPORTANT: See note below on how to make a sheet public-readable!
// # is worksheet id - IDs start at 1
mySheet.getRows(1, function(err, rowData) {
	console.log('Pulled in '+rowData.length + ' rows');
});

// With auth -- read + write
// see below for authentication instructions
var creds = require('./google-generated-creds.json');
// OR, if you cannot save the file locally (like on heroku)
var creds = {
  client_email: 'yourserviceaccountemailhere@google.com',
  private_key: 'your long private key stuff here'
}

mySheet.useServiceAccountAuth(creds, function(err) {
	// getInfo returns info about the sheet and an array of "worksheet" objects
	mySheet.getInfo(function(err, sheetInfo) {
		console.log(sheetInfo.title + ' is loaded');
		// use worksheet object if you want to stop using the # in your calls

		var sheet1 = sheetInfo.worksheets[0];
		sheet1.getRows(function(err, rows) {
			rows[0].colname = 'new val';
			rows[0].save();	//async and takes a callback
			rows[0].del();  //async and takes a callback
		});
	});

	// column names are set by google and are based
  // on the header row (first row) of your sheet
	mySheet.addRow(2, { colname: 'col value' });

	mySheet.getRows(2, {
		start: 100,			 // start index
		num: 100,			   // number of rows to pull
		orderby: 'name'  // column to order results by
	}, function(err, rowData) {
		// do something...
	});
})
```


## Authentication

### Unauthenticated access (read-only access on public docs)

By default, this module makes unauthenticated requests and can therefore
only access spreadsheets that are "public".

If you wish to work with a Google Spreadsheet without authenticating, not only
must the Spreadsheet in question be visible to the web, but it must also have
been explicitly published using "File > Publish to the web" menu option in
the google spreadsheets GUI.

### Service Account (recommended method)

This is a 2-legged OAuth method and designed to be "an account that belongs to your application instead of to an individual end user".
Use this for an app that needs to access a set of documents that you have full access to.
([read more](https://developers.google.com/identity/protocols/OAuth2ServiceAccount))

__Setup Instructions__

1. Go to the [Google Developers Console](https://console.developers.google.com/project).
2. Select your project, or create a new one and then select it.
3. Enable the Drive API for your project.
  - In the sidebar on the left, expand __APIs & auth__ > __APIs__.
  - Search for "Drive".
  - Click on "Drive API".
  - Click the "Enable API" button.
4. Create a service account for your project.
  - In the sidebar on the left, expand __APIs & auth__ > __Credentials__.
  - Click the "Add credentials" button and select the "Service account" option.
  - Select "JSON" under "Key type" and click the "Create" button.
  - Your JSON key file is generated and downloaded to your machine (__it is the only copy!__).
  - Note your service account's email address in the next screen (also available in the JSON key file).
5. Share the doc (or docs) with your service account using the email shown above. The email format should look similar to:

```
1032985794852-9f1hf98hf9183hf1038fh013h0vh0v1n@developer.gserviceaccount.com
```


## API

### `GoogleSheets`

The main class that represents an entire spreadsheet.

#### `new GoogleSheets(sheet_id, [auth], [options])`

Create a new Google spreadsheet object.

- `sheet_id` -- the ID of the spreadsheet (from its URL)
- `auth` - (optional) an existing auth token
- `options` - (optional)
  - `visibility` - defaults to `public` if anonymous
  - `projection` - defaults to `values` if anonymous

#### `GoogleSheets.useServiceAccountAuth(account_info, callback)`

Uses a service account email and public/private key to create a token to use to authenticated requests.
Normally you would just pass in the require of the json file that Google generates for you when you create a service account.

See the "Authentication" section for more info.

If you are using heroku or another environment where you cannot save a local file, you may just pass in an object with
- `client_email` -- your service account's email address
- `private_key` -- the private key found in the JSON file

Internally, this uses a JWT client to generate a new auth token for your service account that is valid for 1 hour. The token will be automatically regenerated when it expires.

#### `GoogleSheets.setAuthToken(id)`

Use an already created auth token for all future requets.

#### `GoogleSheets.getInfo(callback)`

Get information about the spreadsheet. Calls callback passing an object that contains:

- `title` - the title of the document
- `updated` - last updated timestamp
- `author` - auth info in an object
  - `name` - author name
  - `email` - author email
- `worksheets` - an array of `SpreadsheetWorksheet` objects (see below)

#### `GoogleSheets.getRows(worksheetId, options, callback)`

Get an array of row objects from the sheet.

- `worksheetId` - the index of the sheet to read from (index starts at 1)
- `options` (optional)
  - `start-index` - start reading from row #
  - `max-results` - max # of rows to read at once
  - `orderby` - column key to order by
  - `reverse` - reverse results
  - `query` - send a structured query for rows ([more info](https://developers.google.com/google-apps/spreadsheets/#sending_a_structured_query_for_rows))
- `callback(err, rows)` - will be called with an array of row objects (see below)

#### `GoogleSheets.addRow(worksheetId, new_row, callback)`

Add a single row to the sheet.

- `worksheetId` - the index of the sheet to add to (index starts at 1)
- `new_row` - key-value object to add - keys must match the header row on your sheet
- `callback(err)` - callback called after row is added

#### `GoogleSheets.getCells(worksheetId, options, callback)`

Get an array of cell objects.
- `worksheetId` - the index of the sheet to add to (index starts at 1)
- `options` (optional)
  - `min-row` - row range min (uses #s visible on the left)
  - `max-row` - row range max
  - `min-col` - column range min (uses numbers, not letters!)
  - `max-col` - column range max
  - `return-empty` - include empty cells (boolean)

----------------------------------

### `SpreadsheetWorksheet`

Represents a single "sheet" from the spreadsheet. These are the different tabs/pages visible at the bottom of the Google Sheets interface.

This is a really just a wrapper to call the same functions on the spreadsheet without needing to include the worksheet id.

__Properties:__
- `id` - the ID of the sheet
- `title` - the title (visible on the tabs in Google's interface)
- `rowCount` - number of rows
- `colCount` - number of columns

### `SpreadsheetWorksheet.getRows(options, callback)`

See above.

### `SpreadsheetWorksheet.getCells(options, callback)`

See above.

### `SpreadsheetWorksheet.addRow(new_row, callback)`

See above.

----------------------------------

### `SpreadsheetRow`

Represents a single row from a sheet.

You can treat the row as a normal javascript object. Object keys will be from the header row of your sheet, however the Google API mangles the names a bit to make them simpler. It's easiest if you just use all lowercase keys to begin with.

#### `SpreadsheetRow.save( callback )`

Saves any changes made to the row's values.

#### `SpreadsheetRow.del( callback )`

Deletes the row from the sheet.

----------------------------------

### `SpreadsheetCell`

Represents a single cell from the sheet.

#### `SpreadsheetCell.setValue(val, callback)`

Set the value of the cell and save it.

#### `SpreadsheetCell.del(callback)`

Clear the cell -- internally just calls `.setValue('', callback)`

----------------------------------


## Further possibilities & to-do

- Batch requests for cell based updates
- Modifying worksheet/spreadsheet properties
- Getting list of available spreadsheets for an authenticated user


## Thanks

This is based of the code by [samcday](https://github.com/theoephraim). Original version [here](https://github.com/theoephraim/node-google-spreadsheet)
