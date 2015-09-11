'use strict';

var GOOGLE_AUTH_SCOPE = ['https://spreadsheets.google.com/feeds'];
var GoogleAuth = require('google-auth-library');
var authClient = new GoogleAuth();

var Auth = function Auth(options) {
  var _this = this;

  _this.googleAuth = null;
  _this.jwtClient = null;
  _this.authMode = 'anonymous';
  _this.visibility = 'public';
  _this.projection = 'values';
  _this.options = options || {};

  _this.setAuthAndDependencies = function setAuthAndDependencies(auth) {
    _this.googleAuth = auth;
    if (!_this.options.visibility) {
      _this.visibility = _this.googleAuth ? 'private' : 'public';
    }

    if (!_this.options.projection) {
      _this.projection = _this.googleAuth ? 'full' : 'values';
    }
  };

  // Authentication Methods
  _this.setAuthToken = function setAuthToken(authId) {
    if (_this.authMode === 'anonymous') _this.authMode = 'token';
    _this.setAuthAndDependencies(authId);
  };

  _this.renewJwtAuth = function renewJwtAuth(cb) {
    _this.authMode = 'jwt';
    _this.jwtClient.authorize(function(err, token) {
      if (err) return cb(err);
      _this.setAuthToken({
        /* jshint camelcase: false */
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        type: token.token_type,
        value: token.access_token,
        expires: token.expiry_date,
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      });
      cb();
    });
  };

  _this.useServiceAccountAuth = function useServiceAccountAuth(creds, cb) {
    if (typeof creds === 'string') creds = require(creds);
    /* jshint camelcase: false */
    /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
    _this.jwtClient = new authClient.JWT(creds.client_email, null,
      creds.private_key, GOOGLE_AUTH_SCOPE, null);
    /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
    _this.renewJwtAuth(cb);
  };
};

module.exports = Auth;
