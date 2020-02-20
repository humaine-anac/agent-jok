const moment = require('moment');

let Logger = {};
let logLevel = 1;

Logger.setLogLevel = function(level) {
  logLevel = level;
};

Logger.logExpression = function (xpr, level) {
  if (level > logLevel) return;
  xpr = (typeof xpr == 'object') ? JSON.stringify(xpr, null, 2) : xpr;
  console.log('Hey There! [' + moment().format('YYYY-MM-DD hh:mm:ss.SS') + '] ' + xpr);
};

module.exports = Logger;
