// npm modules
var _ = require('lodash');
var util = require('util');

// Custom modules
var Commander = require('./commander');
var ui = require('./ui');
var utils = require('./utils');

function Chat(bot) {
    Chat.super_.call(this, bot);

    this.leagueId = '1204';
    this.qs = String.format('&comp_id={0}', this.leagueId);
    this.days = 13;
}

util.inherits(Chat, Commander);

Chat.prototype.buildTeamKeyboard = function(feed) {
    var standings = feed.teams.filter(function(el) {
        return +(el.stand_team_id) !== 0;
    });
    var rows = [];
    var cols = [];
    var width = 2;

    _.each(_.sortBy(standings, 'stand_team_name'), function(standing, i) {
        if (i % width === 0) {
            if (i > 0) {
                rows.push(cols);
            }
            cols = [];
        }

        cols.push(ui.getShortName(standing.stand_team_name));
    });

    if (cols.length > 0) {
        rows.push(cols);
    }

    return rows;
};

Chat.prototype.requestTeamName = function(message, args) {
    utils.log('Requesting team name from user...');
    var self = this;
    var options = {
        'name': 'standings',
        'qs': this.qs
    };
    var callback = function(error, feed, message, args) {
        //Check for error
        if (error) {
            return utils.log('Error in server.requestTeamName', error);
        }

        var keyboard = self.buildTeamKeyboard(feed);
        var options = {
            chat_id: message.chat.id,
            text: 'Which team do you want statistics for?',
            reply_markup: {
                keyboard: keyboard,
                resize_keyboard: true,
                selective: true
            }
        };

        self.sendMessage(utils.createOptions(options));
    };

    this.processCommand(message, options, callback, true);
};

Chat.prototype.sendFixtures = function(message, args) {
    var self = this;
    var today = utils.today();
    var endDate = utils.today();

    endDate.setDate(endDate.getDate() + this.days);

    var options = {
        'name': 'fixtures',
        'qs': String.format(
            '{0}&from_date={1}&to_date={2}',
            this.qs,
            today.format('dd.mm.yyyy'),
            endDate.format('dd.mm.yyyy'))
    };
    var callback = function(err, feed, message, args) {
        ui.renderFixtures(err, feed, function(err, text) {
            self.sendMessage(utils.createOptions({
                chat_id: message.chat.id,
                text: err ? err.message : text
            }));
        });
    };

    this.processCommand(message, options, callback);
};

Chat.prototype.sendResults = function(message, args) {
    var self = this;
    var today = utils.today();
    var startDate = utils.today();

    startDate.setDate(startDate.getDate() - this.days);

    var options = {
        'name': 'fixtures',
        'qs': String.format(
            '{0}&from_date={1}&to_date={2}',
            this.qs,
            startDate.format('dd.mm.yyyy'),
            today.format('dd.mm.yyyy'))
    };
    var callback = function(err, feed, message, args) {
        ui.renderResults(err, feed, function(err, text) {
            self.sendMessage(utils.createOptions({
                chat_id: message.chat.id,
                text: err ? err.message : text
            }));
        });
    };

    this.processCommand(message, options, callback);
};

Chat.prototype.sendTable = function(message, args) {
    var self = this;
    var options = {
        'name': 'standings',
        'qs': this.qs
    };
    var callback = function(err, feed, message, args) {
        ui.renderTable(null, feed, function(err, text) {
            self.sendMessage(utils.createOptions({
                chat_id: message.chat.id,
                text: err ? err.message : text
            }));
        });
    };
    this.processCommand(message, options, callback);
};

Chat.prototype.sendTeamStats = function(message, args) {
    var self = this;
    var options = {
        'name': 'standings',
        'qs': this.qs,
        'args': args
    };
    var callback = function(err, feed, message, args) {
        if (args && args.length > 0) {
            var teamName = ui.getFullName(args);

            ui.renderTeamStats(null, feed, teamName, function(err, text) {
                self.sendMessage(utils.createOptions({
                    chat_id: message.chat.id,
                    text: err ? err.message : text,
                    reply_markup: {
                        hide_keyboard: true
                    }
                }));
            });
        } else {
            self.sendMessage(utils.createOptions({
                chat_id: message.chat.id,
                text: 'Team name wasn\'t provided, please try again.'
            }));
        }
    };

    this.processCommand(message, options, callback);
};

module.exports = Chat;
