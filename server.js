// Core modules
var http = require('http');

// npm modules
var Bot = require('node-telegram-bot');
var dateFormat = require('dateformat');
var config = require('config');
var _ = require('lodash');

// Custom modules
var Chat = require('./lib/chat');
var ui = require('./lib/ui');
var utils = require('./lib/utils');

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
            utils.log('stop');
            bot.stop();
            //FIXME: Clean up all conversation variables
        })
        .on('start', function(message) {
            bot.start();
        })
        .on('error', function(message) {
            utils.log('ERROR: ' + message);
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
    var getTeamKeyboard = function(feed) {
        var standings = feed.teams.filter(function(el) {
            return +(el.stand_team_id) !== 0;
        });
        var rows = [];
        var cols = [];
        var width = 2;

        _.each(_.sortBy(standings, 'stand_team_name'), function(standing, i) {
            if(i % width === 0) {
                if(i > 0) {
                    rows.push(cols);
                }
                cols = [];
            }

            cols.push(ui.getShortName(standing.stand_team_name));
        });

        if(cols.length > 0) {
            rows.push(cols);
        }

        return rows;
    };
    var getTeamName = function(message, args) {
        utils.log('Requesting team name from user...');
        var options = {
            'name': 'standings',
            'qs': qs
        };
        var callback = function(error, feed, message, args) {
            //Check for error
            if (error) {
                return utils.log('Error in server.getTeamName', error);
            }

            var keyboard = getTeamKeyboard(feed);
            var options = {
                chat_id: message.chat.id,
                text: 'Which team do you want statistics for?',
                reply_markup: {
                    keyboard: keyboard,
                    resize_keyboard: true,
                    selective: true
                }
            };

            chat.sendMessage(utils.createOptions(options));
        };

        chat.processCommand(message, options, callback, true);
    };
    var initCommand = function(message, args, commandName) {
        var command = chat.getCommand(message);

        if (command) {
            //FIXME: Display error message if a command already exists
            utils.log('Current command: ' + command.name);
        } else {
            chat.setCommand(message, chat.createCommand(commandName, args));
            utils.log('Set command: teamstats');
        }
    };
    var processMessage = function(message) {
        utils.log(message);

        var command = chat.getCommand(message);

        if (!command) {
            utils.log('Broken command key: ' + chat._getMessageKey(message));
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
        var today = utils.today();
        var endDate = utils.today();

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
                chat.sendMessage(utils.createOptions({
                    chat_id: message.chat.id,
                    text: err ? err.message : text
                }));
            });
        };

        chat.processCommand(message, options, callback);
    };
    var sendResults = function(message, args) {
        var today = utils.today();
        var startDate = utils.today();

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
                chat.sendMessage(utils.createOptions({
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
                chat.sendMessage(utils.createOptions({
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
                    chat.sendMessage(utils.createOptions({
                        chat_id: message.chat.id,
                        text: err ? err.message : text,
                        reply_markup: {
                            hide_keyboard: true
                        }
                    }));
                });
            } else {
                chat.sendMessage(utils.createOptions({
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
