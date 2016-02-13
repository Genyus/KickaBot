// npm modules
var Bot = require('node-telegram-bot');
var _ = require('lodash');
var util = require('util');

// Custom modules
var utils = require('./utils');
var logger = require('./logger');

function Commander(bot) {
    this.bot = bot;
    this.commands = {}; // Tracks all user commands
    this.actions = {}; // Tracks all feedback actions
}

Commander.prototype._getMessageKey = function(message) {
    var chatId = message.chat.id;
    var userId = message.from.id;

    return String.format('command-{0}-{1}', chatId, userId);
};

Commander.prototype.createCommand = function(name, args) {
    var command = {
        'name': name,
        'args': args || []
    };

    return command;
};

Commander.prototype.getCommand = function(message) {
    var key = this._getMessageKey(message);
    var self = this;
    var command = self.commands[key];

    return command;
};

Commander.prototype.initCommand = function(message, args, commandName) {
    var command = this.getCommand(message);

    if (command) {
        //FIXME: Display error message if a command already exists
        logger.info('Current command: ' + command.name);
    } else {
        this.setCommand(message, this.createCommand(commandName, args));
        logger.info('Set command: ' + commandName);
    }
};

Commander.prototype.processCommand = function(message, options, callback, preserve) {
    var self = this;
    var msg = message;

    utils.getFeed(options, function(err, feed, args) {
        if (!err && !feed) { // Send "typing..." action
            self.sendMessage(utils.createOptions({
                chat_id: msg.chat.id,
                action: 'typing'
            }));
        } else if (err) { // Send error message
            return self.sendMessage(utils.createOptions({
                chat_id: msg.chat.id,
                text: err.message
            }));
        } else { // Send response
            callback(err, feed, msg, args);

            // Clear current command
            if (!preserve) {
                self.setCommand(msg, null);
            }
        }
    });
};

Commander.prototype.sendAction = function(options, callback) {
    logger.info('Typing...');
    this.bot.sendChatAction(options);
    //when finish, call "callback"
    callback(options);
};

Commander.prototype.sendMessage = function(options) {
    var self = this;

    if (options.action) { // set chat action while processing
        self.sendAction(options, function() {
            self.actions[options.chat_id] = setTimeout(function() {
                self.sendMessage(options);
            }, 5000);
        });
    } else {
        if (self.actions[options.chat_id]) { // cancel action when message is sent
            clearTimeout(self.actions[options.chat_id]);
            delete self.actions[options.chat_id];
        }
        logger.info(String.format('id: {0}, parse_mode: {1}, text: {2}', options.chat_id, options.parse_mode, options.text));
        self.bot.sendMessage(options);
    }
};

/**
 * Sets the command for the current chat and message author
 * @param  {[type]} message Message containing the command
 * @param  {[type]} command Command object
 */
Commander.prototype.setCommand = function(message, command) {
    var key = this._getMessageKey(message);

    if (command) {
        this.commands[key] = command;
    } else {
        delete this.commands[key];
    }
};

module.exports = Commander;
