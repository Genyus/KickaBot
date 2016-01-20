// npm modules
var Bot = require('node-telegram-bot');
var _ = require('lodash');

// Custom modules
var utils = require('./utils');

function Chat(bot) {
    this.bot = bot;
    this.commands = {}; // Tracks all user commands
    this.actions = {}; // Tracks all feedback actions
}

Chat.prototype._getMessageKey = function(message) {
    var chatId = message.chat.id;
    var userId = message.from.id;

    return String.format('command-{0}-{1}', chatId, userId);
};

Chat.prototype.createCommand = function(name, args) {
    var command = {
        'name': name,
        'args': args || []
    };

    return command;
};

Chat.prototype.getCommand = function(message) {
    var key = this._getMessageKey(message);

    return this.commands[key];
};

Chat.prototype.processCommand = function(message, options, callback, preserve) {
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

Chat.prototype.sendMessage = function(options) {
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
        utils.log(String.format('id: {0}, parse_mode: {1}, text: {2}', options.chat_id, options.parse_mode, options.text));
        self.bot.sendMessage(options);
    }
};

Chat.prototype.sendAction = function(options, callback) {
    utils.log('Typing...');
    this.bot.sendChatAction(options);
    //when finish, call "callback"
    callback(options);
};

Chat.prototype.setCommand = function(message, command) {
    var key = this._getMessageKey(message);

    if (command) {
        this.commands[key] = command;
    } else {
        delete this.commands[key];
    }
};

module.exports = Chat;