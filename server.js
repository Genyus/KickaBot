// Core modules
var http = require('http');

// npm modules
var Bot = require('node-telegram-bot');
var dateFormat = require('dateformat');
var config = require('config');

// Custom modules
var util = require('./lib/util');
var ui = require('./lib/ui');

(function() {
    var leagueId = '1204';
    var qs = String.format('&comp_id={0}', leagueId);
    var telegramConfig = config.get('Server.telegram');
    var days = 13;
    var actions = {}; // Tracks all feedback actions
    var commands = {}; // Tracks all user commands
    var bot = new Bot({
            token: telegramConfig.token
        })
        .on('message', function(message) {
            util.log(message);

            var command = getCommand(message);

            if(!command){
                util.log('Broken command key: ' + getMessageKey(message));
                return;
            }

            // Append the current message if not another command
            if(message.text.lastIndexOf('/', 0) !== 0) {
                command.args.push(message.text);
                setCommand(message, command);
            }

            var commandSteps = steps[command.name];

            // Execute the appropriate step
            if(commandSteps && commandSteps.length > command.args.length) {
                commandSteps[command.args.length](message, command.args);
            }
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
            setCurrentCommand(message, args, 'fixtures');
        })
        .on('results', function(message, args) {
            setCurrentCommand(message, args, 'results');
        })
        .on('table', function(message, args) {
            setCurrentCommand(message, args, 'table');
        })
        .on('teamstats', function(message, args) {
            setCurrentCommand(message, args, 'teamstats');
        })
        .start();
    var getMessageKey = function(message){
        var chatId = message.chat.id;
        var userId = message.from.id;

        return String.format('command-{0}-{1}', chatId, userId);
    };
    var createCommand = function(name, args){
        var command = {
            'name': name,
            'args': args || []
        };

        return command;
    };
    var getCommand = function(message){
        var key = getMessageKey(message);

        return commands[key];
    };
    var setCommand = function(message, command){
        var key = getMessageKey(message);

        if(command) {
            commands[key] = command;
        } else {
            delete commands[key];
        }
    };
    var setCurrentCommand = function(message, args, commandName) {
        var command = getCommand(message);

        if(command){
            //FIXME: Display error message if a command already exists
            util.log('Current command: ' + command.name);
        } else {
            setCommand(message, createCommand(commandName, args));
            util.log('Set command: teamstats');
        }
    };
    var processCommand = function(message, options, callback) {
        util.getFeed(options, function(err, feed, args) {
            if (!err && !feed) { // Send "typing..." action
                sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    action: 'typing'
                }));
            } else if (err) { // Send error message
                return sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    text: err.message
                }));
            } else { // Send response
                callback(err, feed, message, args);

                // Clear current command
                setCommand(message, null);
            }
        });
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
        var callback = function(err, feed, message, args){
            ui.renderFixtures(err, feed, function(err, text) {
                sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    text: err ? err.message : text
                }));
            });
        };

        processCommand(message, options, callback);
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
        var callback = function(err, feed, message, args){
            ui.renderResults(err, feed, function(err, text) {
                sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    text: err ? err.message : text
                }));
            });
        };

        processCommand(message, options, callback);
    };
    var sendTable = function(message, args) {
        var options = {
            'name': 'standings',
            'qs': qs
        };
        var callback = function(err, feed, message, args){
            ui.renderTable(null, feed, function(err, text) {
                sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    text: err ? err.message : text
                }));
            });
        };

        processCommand(message, options, callback);
    };
    var sendTeamStats = function(err, feed, message, args) {
        var options = {
            'name': 'standings',
            'qs': qs,
            'args': args
        };
        var callback = function(message, args){
            if (args && args.length > 0) {
                var teamName = ui.getFullName(args);

                ui.renderTeamStats(null, feed, teamName, function(err, text) {
                    sendMessage(util.createOptions({
                        chat_id: message.chat.id,
                        text: err ? err.message : text
                    }));
                });
            } else {
                sendMessage(util.createOptions({
                    chat_id: message.chat.id,
                    text: 'Team name wasn\'t specified, please try again.'
                }));
            }
        };

        processCommand(message, options, callback);
    };
    var sendMessage = function(options) {
        if (options.action) { // set chat action while processing
            sendAction(options, function() {
                actions[options.chat_id] = setTimeout(function() {
                    sendMessage(options);
                }, 5000);
            });
        } else {
            if (actions[options.chat_id]) { // cancel action when message is sent
                clearTimeout(actions[options.chat_id]);
                delete actions[options.chat_id];
            }
            util.log(String.format('id: {0}, parse_mode: {1}, text: {2}', options.chat_id, options.parse_mode, options.text));
            bot.sendMessage(options);
        }
    };
    var sendAction = function(options, callback) {
        util.log('Typing...');
        bot.sendChatAction(options);
        //when finish, call "callback"
        callback(options);
    };
    var getTeamName = function(message, args) {
        util.log('Getting team name from user...');
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
