//Load the request module
var request = require('request');

// npm modules
var _ = require('lodash');
var cacheManager = require('cache-manager');
var config = require('config');

var ttl = 5;
var memoryCache = cacheManager.caching({
    store: 'memory',
    max: 100,
    ttl: 120 /*seconds*/
});
var apiConfig = config.get('Server.footballApi');
var self = module.exports = {
    capitalise: function(input) {
        var arr = input.split(/\s/);

        _.each(arr, function(word, index) {
            arr[index] = word.substr(0, 1).toUpperCase() +
                (word.length > 1 ? word.substr(1).toLowerCase() : '');
        });

        return arr.join(' ');
    },
    createOptions: function(options) {
        var defaults = {
            parse_mode: 'Markdown'
        };

        return _.merge(options, defaults);
    },
    getFeed: function(options, callback) {
        var parts = [
            String.format('name:{0}', options.name),
            String.format('qs:{0}', options.qs)
        ];
        var id = parts.join('|');

        self.log('Cache ID: ' + id);
        memoryCache.wrap(id, function(cacheCallback) {
            // Send "typing..." action to client while requesting and processing feed
            callback(null, null);
            loadFeed(options, cacheCallback);
        }, function(err, feed) {
            //FIXME: Add secondary filesystem cache check here
            return callback(err, feed, options.args);
        });
    },
    log: function() {
        if (typeof(console) !== 'undefined') {
            console.log.apply(console, arguments);
        }
    },
    mergeArrayValues: function(sourceArr, destinationArr, prop) {
        _.each(sourceArr, function(sourceArrObj, index) {
            var destinationObj = destinationArr.length > index ? destinationArr[index] : null;

            //If the object exists, extend it with the new value from sourceArr
            if (destinationObj) {
                destinationObj[prop] = sourceArrObj;
            }
        });
    },
    parseError: function(err) {
        var callstack = [];
        var message = String.format('{0}:\n', err.message);

        if (err.stack) {
            var lines = err.stack.split('\n');

            for (var i = 0, len = lines.length; i < len; i++) {
                if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
                    callstack.push(lines[i]);
                }
            }

            //Remove call to printStackTrace()
            callstack.shift();
        }

        if (callstack.length > 0) {
            message += 'Stack trace:\n' + callstack.join('\n\n');
        }

        return message;
    },
    today: function() {
        var now = new Date();
        var date = createDateAsUTC(now);
utils.log(now);
utils.log(date);
utils.log(convertDateToUTC(date));
        date.setTime(date.getTime() + Math.abs(date.getTimezoneOffset()) * 60 * 1000);
utils.log(date);
utils.log(convertDateToUTC(date));
        return date;
    }
};

function createDateAsUTC(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
}

function convertDateToUTC(date) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

function loadFeed(options, callback) {
    var feed;
    var url = buildApiUrl(options);
    var genericError = new Error('An error occurred, please try again later');

    self.log('Requesting ' + url);
    request(url, function(err, response, body) {
        //Check for error
        if (err) {
            self.log(String.format('Error occurred while requesting {0}: ', url), err);

            return callback(genericError);
        }

        //Check for right status code
        if (response.statusCode !== 200) {
            self.log('Invalid response status code returned: ', response.statusCode);

            return callback(genericError);
        }

        //Response is good. Save the body
        try {
            feed = JSON.parse(body); // Parse the response from the API.
            //self.log(body);
        } catch (exception) {
            self.log(String.format('Error occurred while parsing JSON: {0}\r\nJSON:\r\n{1}', url), exception.message, body);

            return callback(genericError);
        }

        if (feed.contents.ERROR == 'OK') {
            callback(null, feed.contents);
        } else {
            self.log(String.format('Unexpected response:\r\n{0}', body));
            callback(genericError);
        }
    });
}

function buildApiUrl(options) {
    var apiQs = String.format('?Action={0}&APIKey={1}', options.name, apiConfig.apiKey);
    var proxyUrl = 'http://api.ingenyus.com/ba-simple-proxy.php?url=http://football-api.com/api/';

    //feed = require('./data/' + name + '.json');
    //callback(null, feed, message);
    if (options.qs) {
        apiQs += options.qs;
    }

    // URL encode the querystring
    apiQs = encodeURIComponent(apiQs);

    // Request via proxy to avoid IP restriction issues
    return proxyUrl.concat(apiQs);
}
