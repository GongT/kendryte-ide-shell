// This file is only run in source
// when released, src/boot.ts is the right entry

require('source-map-support/register');
require(__dirname + '/dist/gulp/gulpfile');
