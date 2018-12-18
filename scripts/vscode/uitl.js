"use strict";
exports.__esModule = true;
var es = require("event-stream");
var _rimraf = require("rimraf");
function rimraf(dir) {
    var retries = 0;
    var retry = function (cb) {
        _rimraf(dir, { maxBusyTries: 1 }, function (err) {
            if (!err) {
                return cb();
            }
            if (err.code === 'ENOTEMPTY' && ++retries < 5) {
                return setTimeout(function () { return retry(cb); }, 10);
            }
            return cb(err);
        });
    };
    return function (cb) { return retry(cb); };
}
exports.rimraf = rimraf;
function skipDirectories() {
    return es.mapSync(function (f) {
        if (!f.isDirectory()) {
            return f;
        }
    });
}
exports.skipDirectories = skipDirectories;
