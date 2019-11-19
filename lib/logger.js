var config = require('config');
var bunyan = require('bunyan');
var Bunyan2Loggly = require('bunyan-loggly');
var logglyConfig = config.get('Server.loggly');
var logConfig = {
  name: logglyConfig.stream,
  level: 'debug'
};

if (logglyConfig.stream === 'production') {
  logConfig.streams = [
    {
      type: 'raw',
      stream: new Bunyan2Loggly({
        token: logglyConfig.token,
        subdomain: logglyConfig.subdomain,
        json: true
      })
    }
  ];
}

var logger = bunyan.createLogger(logConfig);

module.exports = logger;
