// Core modules
var http = require('http');

// npm modules
var Bot = require('node-telegram-bot');
var dateFormat = require('dateformat');
var config = require('config');

// Custom modules
var util = require('./lib/util');
var ui = require('./lib/ui');

var leagueId = '1204';
var qs = String.format('&comp_id={0}', leagueId);
var telegramConfig = config.get('Server.telegram');
var days = 6;

var bot = new Bot({
        token: telegramConfig.token
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
        var today = util.today();
        var endDate = util.today();

        endDate.setDate(endDate.getDate() + days);

        var fixtures = util.getFeed({
            'name': 'fixtures',
            'qs': String.format(
                '{0}&from_date={1}&to_date={2}',
                qs,
                today.format('dd.mm.yyyy'),
                endDate.format('dd.mm.yyyy'))
        }, function(err, feed, args) {
            ui.renderFixtures(err, feed, function(err, text) {
                sendMessage(err, text, bot, message, feed);
            });
        });
    })
    .on('results', function(message, args) {
        var today = util.today();
        var startDate = util.today();

        startDate.setDate(startDate.getDate() - days);

        var fixtures = util.getFeed({
            'name': 'fixtures',
            'qs': String.format(
                '{0}&from_date={1}&to_date={2}',
                qs,
                startDate.format('dd.mm.yyyy'),
                today.format('dd.mm.yyyy'))
        }, function(err, feed, args) {
            ui.renderResults(err, feed, function(err, text) {
                sendMessage(err, text, bot, message, feed);
            });
        });
    })
    .on('table', function(message) {
        var feed = util.getFeed({
            'name': 'standings',
            'qs': qs
        }, function(err, feed, args) {
            ui.renderTable(err, feed, function(err, text) {
                sendMessage(err, text, bot, message, feed);
            });
        });
    })
    .on('teamstats', function(message, args) {
        var feed = util.getFeed({
            'name': 'standings',
            'qs': qs,
            'args': args
        }, function(err, feed, args) {
            if (err) {
                return sendMessage(err, null, bot, message, feed);
            }
            if (args && args.length > 0) {
                var teamName = ui.getFullName(args);

                ui.renderTeamStats(err, feed, teamName, function(err, text) {
                    sendMessage(err, text, bot, message, feed);
                });
            } else {
                var error = new Error('Team name wasn\'t specified, please try again.');

                sendMessage(error, null, bot, message, null);
            }
        });
    })
    .start();

var sendMessage = function(err, text, bot, message, feed) {
    if (err) {
        if (feed) {
            console.log('Error occurred while rendering:\r\n' + feed);
        }

        text = err.message;
    }
    bot.sendMessage({
        chat_id: message.chat.id,
        text: text,
        parse_mode: 'Markdown'
    });
};

Date.prototype.format = function(mask, utc) {
    return dateFormat(this, mask, utc);
};

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 8090;

if (ipaddress !== '127.0.0.1') {
    console.log(String.format('Starting server on {0}:{1}', ipaddress, port));
    http.createServer(function(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        res.end('Nothing to see here...\r\n');
    }).listen(port, ipaddress);
}
