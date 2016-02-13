var config = require('config');
var bunyan = require('bunyan');
var Bunyan2Loggly = require('bunyan-loggly');

var loggly_config = config.get('Server.loggly');
var log_config = {
    name: loggly_config.stream,
    level: 'debug'
};

if(loggly_config.stream === 'production'){
    log_config.streams = [
        {
            type: 'raw',
            stream: new Bunyan2Loggly({
                token: loggly_config.token,
                subdomain: loggly_config.subdomain,
                json: true
            })
        }
    ];
}

var logger = bunyan.createLogger(log_config);

module.exports = logger;
