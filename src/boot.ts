// This file is only run on release version
// when develop, ../boot.js is the right entry

require('source-map-support/register');
require(__dirname + '/electron-main.js');
