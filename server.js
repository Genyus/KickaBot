// Core modules
var http = require('http');

// npm modules
var Bot = require('node-telegram-bot');

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
        var fixtures = util.getFeed('fixtures', qs);
        var today = new Date('2015-09-19T00:00:00Z');

        var matches = fixtures.matches.filter(function(el) {
            return util.getDate(el.match_formatted_date) >= today;
        });
        var text = '';
        var currentDate = new Date(1970, 0, 1);

        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            var matchDate = util.getDate(match.match_formatted_date);
            if (matchDate > currentDate) {
                if (i > 0)
                    text += '\r\n';

                text += match.match_date + '\r\n';
                currentDate = matchDate;
            }
            text += match.match_localteam_name + ' vs ' +
                match.match_visitorteam_name + ', ' + match.match_time + ' [' +
                match.match_id + ']' + '\r\n';
        }
        bot.sendMessage({
            chat_id: message.chat.id,
            text: text
        });
    })
    .on('table', function(message) {
        var feed = util.getFeed({
            'name': 'standings',
            'qs': qs,
            'message': message,
            'bot': bot,
            'callback': ui.renderTable
        });
    })
    /*
    |---------------------------------|
    | Man. United                     |
    |---------------------------------|
    | League # | Points | Recent form |
    | 3        | 19     | WWDLL       |
    |---------------------------------|
    |       | GP | W  | D  | L  | GD  |
    | Total | 5  | 2  | 1  | 2  | 3   |
    | Home  | 3  | 2  | 0  | 1  | 4   |
    | Away  | 2  | 0  | 1  | 1  | -1  |
    |---------------------------------|
    */
    .on('stats', function(message, args) {
        var feed = util.getFeed({
            'name': 'standings',
            'qs': qs,
            'message': message,
            'bot': bot,
            'callback': ui.renderTeamStats,
            'args': args
        });
    })
    .start();


// http.createServer(function (req, res) {
//   res.writeHead(200, {'Content-Type': 'text/plain'});
//   res.end('Hello World\n');
// }).listen(8080);
//
// console.log('Server running on port 8080.');
