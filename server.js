// Core modules
var http = require('http');

// npm modules
var Bot = require('node-telegram-bot');
var dateFormat = require('dateformat');
var config = require('config');

// Custom modules
var Chat = require('./lib/chat');
var ui = require('./lib/ui');
var util = require('./lib/util');

(function() {
    var leagueId = '1204';
    var qs = String.format('&comp_id={0}', leagueId);
    var telegramConfig = config.get('Server.telegram');
    var days = 13;
    var bot = new Bot({
            token: telegramConfig.token
        })
        .on('message', function(message) {
            processMessage(message);
        })
        .on('stop', function(message) {
            util.log('stop');
            bot.stop();
            //FIXME: Clean up all conversation variables
        })
        .on('start', function(message) {
            bot.start();
        })
        .on('error', function(message) {
            util.log('ERROR: ' + message);
        })
        .on('fixtures', function(message, args) {
            initCommand(message, args, 'fixtures');
        })
        .on('results', function(message, args) {
            initCommand(message, args, 'results');
        })
        .on('table', function(message, args) {
            initCommand(message, args, 'table');
        })
        .on('teamstats', function(message, args) {
            initCommand(message, args, 'teamstats');
        })
        .start();

    var chat = new Chat(bot);
    var getTeamName = function(message, args) {
        util.log('Requesting team name from user...');
        var options = {
            chat_id: message.chat.id,
            text: 'Which team do you want statistics for?'
        };

        if(message.chat.type !== 'private') {
            options.reply_markup = {
                force_reply: true,
                selective: true
            };
            options.reply_to_message_id = message.message_id;
        }

        chat.sendMessage(util.createOptions(options));
    };
    var initCommand = function(message, args, commandName) {
        var command = chat.getCommand(message);

        if (command) {
            //FIXME: Display error message if a command already exists
            util.log('Current command: ' + command.name);
        } else {
            chat.setCommand(message, chat.createCommand(commandName, args));
            util.log('Set command: teamstats');
        }
    };
    var processMessage = function(message) {
        util.log(message);

        var command = chat.getCommand(message);

        if (!command) {
            util.log('Broken command key: ' + chat._getMessageKey(message));
            return;
        }

        // Append the current message if not another command
        if (message.text.lastIndexOf('/', 0) !== 0) {
            command.args.push(message.text);
            chat.setCommand(message, command);
        }

        var commandSteps = steps[command.name];

        // Execute the appropriate step
        if (commandSteps && commandSteps.length > command.args.length) {
            commandSteps[command.args.length](message, command.args);
        }
    };
    var sendFixtures = function(message, args) {
        var today = util.today();
        var endDate = util.today();

        endDate.setDate(endDate.getDate() + days);

        var options = {
            'name': 'fixtures',
            'qs': String.format(
                '{0}&from_date={1}&to_date={2}',
                qs,
                today.format('dd.mm.yyyy'),
                endDate.format('dd.mm.yyyy'))
        };
        var callback = function(err, feed, message, args) {
            ui.renderFixtures(err, feed, function(err, text) {
                chat.sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    text: err ? err.message : text
                }));
            });
        };

        chat.processCommand(message, options, callback);
    };
    var sendResults = function(message, args) {
        var today = util.today();
        var startDate = util.today();

        startDate.setDate(startDate.getDate() - days);

        var options = {
            'name': 'fixtures',
            'qs': String.format(
                '{0}&from_date={1}&to_date={2}',
                qs,
                startDate.format('dd.mm.yyyy'),
                today.format('dd.mm.yyyy'))
        };
        var callback = function(err, feed, message, args) {
            ui.renderResults(err, feed, function(err, text) {
                chat.sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    text: err ? err.message : text
                }));
            });
        };

        chat.processCommand(message, options, callback);
    };
    var sendTable = function(message, args) {
        var options = {
            'name': 'standings',
            'qs': qs
        };
        var callback = function(err, feed, message, args) {
            ui.renderTable(null, feed, function(err, text) {
                chat.sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    text: err ? err.message : text
                }));
            });
        };

        chat.processCommand(message, options, callback);
    };
    var sendTeamStats = function(message, args) {
        var options = {
            'name': 'standings',
            'qs': qs,
            'args': args
        };
        var callback = function(err, feed, message, args) {
            if (args && args.length > 0) {
                var teamName = ui.getFullName(args);

                ui.renderTeamStats(null, feed, teamName, function(err, text) {
                    chat.sendMessage(util.createOptions({
                        chat_id: message.chat.id,
                        text: err ? err.message : text
                    }));
                });
            } else {
                chat.sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    text: 'Team name wasn\'t provided, please try again.'
                }));
            }
        };

        chat.processCommand(message, options, callback);
    };
    var steps = {
        'fixtures': [sendFixtures],
        'results': [sendResults],
        'table': [sendTable],
        'teamstats': [getTeamName, sendTeamStats]
    };
})();

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
