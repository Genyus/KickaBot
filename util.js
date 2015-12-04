//Load the request module
var request = require('request');

// npm modules
var _ = require('lodash');
var cacheManager = require('cache-manager');

var ttl = 5;
var memoryCache = cacheManager.caching({
    store: 'memory',
    max: 100,
    ttl: 120 /*seconds*/
});

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
    var apiKey = 'f1ed2f61-7f06-86be-730afbc12309';
    var url = String.format('http://football-api.com/api/?Action={0}&APIKey={1}', options.name, apiKey);

    //feed = require('./data/' + name + '.json');
    //callback(null, feed, message);
    if (options.qs) {
        url += options.qs;
    }

    request(url, function(error, response, body) {
        console.log('Requested ' + url);
        //Check for error
        if (error) {
            return console.log(String.format('Error while requesting {0}:', url), error);
        }

        //Check for right status code
        if (response.statusCode !== 200) {
            return console.log('Invalid Status Code Returned:', response.statusCode);
        }

        //All is good. Save the body
        feed = JSON.parse(body); // Show the response from the API.
        var err = typeof(feed) !== 'object' ?
            new Error(String.format('No feed available at {0}', url)) :
            null;

        if (callback && typeof(callback) === 'function') {
            callback(err, feed);
        }
    });
}
