//Load the request module
var request = require('request');

// npm modules
var _ = require('lodash');

module.exports = {
    getFeed: function(options) {
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

            if (options.callback && typeof(options.callback) === 'function') {
                options.callback(err, feed, options.message, options.bot, options.args);
            }
        });
    },
    mergeArrayValues: function(sourceArr, destinationArr, prop) {
        _.each(sourceArr, function(sourceArrObj, index) {
            var arr1obj = destinationArr.length > index ? destinationArr[index] : null;

            //If the object exists, extend it with the new value from sourceArr
            if (arr1obj) {
                arr1obj[prop] = sourceArrObj;
            }
        });
    }
};
