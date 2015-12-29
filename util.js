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

module.exports = {
    capitalise: function(input) {
        var arr = input.split(/\s/);

        _.each(arr, function(word, index) {
            arr[index] = word.substr(0,1).toUpperCase() +
                     (word.length > 1 ? word.substr(1).toLowerCase() : '');
        });

        return arr.join(' ');
    },
    getFeed: function(options, callback) {
        var parts = [
            String.format('name:{0}', options.name),
            String.format('qs:{0}', options.qs)
        ];
        var id = parts.join('|');

        console.log('Cache ID: ' + id);
        memoryCache.wrap(id, function(cacheCallback) {
            loadFeed(options, cacheCallback);
        }, function(err, feed) {
            //FIXME: Add secondary filesystem cache check here
            callback(err, feed, options.args);
        });
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
    today: function() {
        var now = new Date();
        return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0);
    }
};

function loadFeed(options, callback) {
    var feed;
    var url = buildApiUrl(options);
    var genericError = new Error('An error occurred, please try again later');

    console.log('Requesting ' + url);
    request(url, function(err, response, body) {
        //Check for error
        if (err) {
            console.log(String.format('Error occurred while requesting {0}: ', url), err);

            return callback(genericError);
        }

        //Check for right status code
        if (response.statusCode !== 200) {
            console.log('Invalid response status code returned: ', response.statusCode);

            return callback(genericError);
        }

        //Response is good. Save the body
        try {
            feed = JSON.parse(body); // Parse the response from the API.
        } catch (exception) {
            console.log(String.format('Error occurred while parsing JSON: {0}\r\nJSON:\r\n{1}', url), exception.message, body);

            return callback(genericError);
        }

        callback(null, feed.contents);
    });
}

function buildApiUrl(options){
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
