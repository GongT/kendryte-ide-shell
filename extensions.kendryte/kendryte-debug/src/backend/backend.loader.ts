require('source-map-support/register');

console.error('\n[kendryte debug] debugger loader.');
console.error('\n * ' + process.argv.join('\n * '));
process.title = 'gdb-session';

require('./backend');
