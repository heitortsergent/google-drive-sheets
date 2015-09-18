# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).


## [Unreleased][unreleased]

## [1.3.0][1.3.0] - 2015-09-17
### Added
- Add `xml` property to worksheet objects when retrieving them.
- Add method to update a worksheet title and size
- Add option to pass size variable when adding a new worksheet.

### Changed
- Rename properties `_links` to `links`.

## [1.2.1][1.2.1] - 2015-09-11
### Fixed
- Fix `package.json` main property pointing to `./lib/index.js` instead of `./index.js`.

## [1.2.0][1.2.0] - 2015-09-10
### Added
- Add Travis CI integration and .travis.yml file.
- Add `istanbul` module and Coveralls integration to Travis CI.
- Add `dotenv` module and `.env.sample` file.
- Add methods to add and delete worksheets.

### Changed
- Change tests from `nodeunit` to `mocha` + `chai`.
- Change test for deleting all rows to delete them from bottom to top.
- Separate lib into classes and moved files to `./lib`.
- Change name of `util` class to `helpers` to avoid conflict with Node's `util` package.

### Removed
- Remove `test_creds.json` file.


## [1.1.0][1.1.0] - 2015-09-08
### Added
- Add `.editorconfig`, `.jshintrc` and `.jscsrc` files, and enforced style guide.
- Add MIT LICENSE file.

[unreleased]: https://github.com/heitortsergent/google-drive-sheets/compare/1.1.0...HEAD
[1.3.0]: https://github.com/heitortsergent/google-drive-sheets/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/heitortsergent/google-drive-sheets/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/heitortsergent/google-drive-sheets/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/heitortsergent/google-drive-sheets/compare/v1.0.0...v1.1.0
