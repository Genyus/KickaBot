// Core modules
var http = require('http');

// npm modules
var Bot = require('node-telegram-bot');
var dateFormat = require('dateformat');

// Custom modules
var util = require('./util');
var ui = require('./ui');

var leagueId = '1204';
var qs = String.format('&comp_id={0}', leagueId);

var bot = new Bot({
        token: '126942443:AAF-6j6eaR6aNxSy9jdaYkngEwOpWnFlNTY'
    })
    .on('message', function(message) {
        switch (message.text) {
            case "/sendMessage":
                bot.sendMessage({
                    chat_id: message.chat.id,
                    text: 'echo : ' + message.text
                });
                break;
            case "/sendPhoto":
                bot.sendPhoto({
                    chat_id: message.chat.id,
                    caption: 'trololo',
                    files: {
                        photo: './logo.png'
                    }
                });
                break;
            case "/sendDocument":
                bot.sendDocument({
                    chat_id: message.chat.id,
                    files: {
                        filename: 'scream',
                        contentType: 'audio/ogg',
                        stream: fs.createReadStream('./0477.ogg')
                    }
                }, console.error);
                break;
            case "/sendLocation":
                bot.sendLocation({
                    chat_id: message.chat.id,
                    latitude: -27.121192,
                    longitude: -109.366424,
                    reply_to_message_id: message.message_id
                });
                break;
        }
    })
    .on('message', function(message) {
        console.log(message);
    })
    //Command without argument
    .on('test', function(message) {
        var command = message.text;
        bot.sendMessage({
            chat_id: message.chat.id,
            text: 'You\'ve sent command: ' + command
        });
    })
    //Command with argument:
    .on('arg', function(message, args) {
        bot.sendMessage({
            chat_id: message.chat.id,
            text: 'You\'ve sent command with arguments: ' + args
        });
    })
    .on('stop', function(message) {
        console.log('stop');
        bot.stop();
    })
    .on('start', function(message) {
        bot.start();
    })
    .on('error', function(message) {
        console.log(message);
    })
    .on('fixtures', function(message, args) {
        var days = 7;
        var today = util.today();
        var endDate = util.today();

        endDate.setDate(endDate.getDate() + 7);

        var fixtures = util.getFeed({
            'name': 'fixtures',
            'qs': String.format(
                '{0}&from_date={1}&to_date={2}',
                qs,
                today.format('d.m.yyyy'),
                endDate.format('d.m.yyyy'))
        }, function(err, feed, args){
            ui.renderFixtures(err, feed, function(err, text) {
                bot.sendMessage({
                    chat_id: message.chat.id,
                    text: text,
                    parse_mode: 'Markdown'
                });
            });
        });
    })
    .on('table', function(message) {
        var feed = util.getFeed({
            'name': 'standings',
            'qs': qs
        }, function(err, feed, args){
            ui.renderTable(err, feed, function(err, text) {
                bot.sendMessage({
                    chat_id: message.chat.id,
                    text: text,
                    parse_mode: 'Markdown'
                });
            });
        });
    })
    .on('stats', function(message, args) {
        var feed = util.getFeed({
            'name': 'standings',
            'qs': qs,
            'args': args
        }, function(err, feed, args){
            var teamName = ui.getFullName(args);

            ui.renderTeamStats(err, feed, teamName, function(err, text) {
                bot.sendMessage({
                    chat_id: message.chat.id,
                    text: text,
                    parse_mode: 'Markdown'
                });
            });
        });
    })
    .start();

    Date.prototype.format = function (mask, utc) {
        return dateFormat(this, mask, utc);
    };
// http.createServer(function (req, res) {
//   res.writeHead(200, {'Content-Type': 'text/plain'});
//   res.end('Hello World\n');
// }).listen(8080);
//
// console.log('Server running on port 8080.');
