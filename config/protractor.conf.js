exports.config = {
  chromeOnly: false,
  allScriptsTimeout: 11000,

  capabilities: {
    'browserName': 'chrome'
  },

  suites: {
    helper: '../../test/helpers/matchers.js',
    wd: '../../test/wd/*.js'
  },

  onPrepare: function() {
    browser.ignoreSynchronization = true;
    require('babel-core/register');
  },

  framework: 'jasmine',

  jasmineNodeOpts: {
    onComplete: null,
    isVerbose: true,
    showColors: true,
    includeStackTrace: true,
    defaultTimeoutInterval: 30000
  }
};
