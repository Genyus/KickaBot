// npm modules
var util = require('util');
var dateFormat = require('dateformat');

// Custom modules
var Commander = require('./commander');
var ui = require('./ui');
var utils = require('./utils');
var logger = require('./logger');

var days = 13;
var leagueId = '1204';
var qs = String.format('&comp_id={0}', leagueId);
var getResultOptions = function () {
  var today = utils.today();
  var startDate = utils.today();

  startDate.setDate(startDate.getDate() - days);

  var options = {
    name: 'fixtures',
    qs: String.format(
      '{0}&from_date={1}&to_date={2}',
      qs,
      formatDate(startDate),
      formatDate(today))
  };

  return options;
};

function formatDate (date) {
  return dateFormat(date, 'dd.mm.yyyy');
}

function Chat (bot) {
  Chat.super_.call(this, bot);

  this.leagueId = leagueId;
  this.qs = qs;
  this.days = days;
}

util.inherits(Chat, Commander);

Chat.prototype.requestMatchName = function (message, args) {
  logger.debug('Requesting team name from user...');
  var self = this;
  var today = utils.today();
  var startDate = utils.today();

  startDate.setDate(startDate.getDate() - this.days);
  var options = {
    name: 'fixtures',
    qs: String.format(
      '{0}&from_date={1}&to_date={2}',
      this.qs,
      formatDate(startDate),
      formatDate(today))
  };
  var callback = function (error, feed, message, args) {
    // Check for error
    if (error) {
      return logger.warn(String.format('Error in server.requestTeamName\r\n{0}', error));
    }

    var keyboard = ui.buildMatchKeyboard(feed);
    var options = {
      chat_id: message.chat.id,
      text: 'Which match do you want statistics for?',
      reply_markup: {
        keyboard: keyboard,
        resize_keyboard: true,
        selective: true
      }
    };

    if (message.chat.type === 'group') {
      options.reply_to_message_id = message.message_id;
    }

    self.sendMessage(utils.createOptions(options));
  };

  this.processCommand(message, options, callback, true);
};

Chat.prototype.requestTeamName = function (message, args) {
  logger.debug('Requesting team name from user...');
  var self = this;
  var options = {
    name: 'standings',
    qs: this.qs
  };
  var callback = function (error, feed, message, args) {
    // Check for error
    if (error) {
      return logger.warn(String.format('Error in server.requestTeamName\r\n{0}', error));
    }

    var keyboard = ui.buildTeamKeyboard(feed);
    var options = {
      chat_id: message.chat.id,
      text: 'Which team do you want statistics for?',
      reply_markup: {
        keyboard: keyboard,
        resize_keyboard: true,
        selective: true
      }
    };

    if (message.chat.type === 'group') {
      options.reply_to_message_id = message.message_id;
    }

    self.sendMessage(utils.createOptions(options));
  };

  this.processCommand(message, options, callback, true);
};

Chat.prototype.sendFixtures = function (message, args) {
  var self = this;
  var today = utils.today();
  var endDate = utils.today();

  endDate.setDate(endDate.getDate() + this.days);

  var options = {
    name: 'fixtures',
    qs: String.format(
      '{0}&from_date={1}&to_date={2}',
      this.qs,
      formatDate(today),
      formatDate(endDate))
  };
  var callback = function (err, feed, message, args) {
    ui.renderFixtures(err, feed, function (err, text) {
      self.sendMessage(utils.createOptions({
        chat_id: message.chat.id,
        text: err ? err.message : text
      }));
    });
  };

  this.processCommand(message, options, callback);
};

Chat.prototype.sendMatchStats = function (message, args) {
  var self = this;
  var options = getResultOptions();
  var callback = function (err, feed, message, args) {
    if (err) {
      return;
    }
    // First we need to retrieve the match ID from the friendly match name
    var matchName = args.join(' ');
    var matches = [];
    var matchParts = matchName.match(/([a-zA-Z. ]+)\svs\s([a-zA-Z. ]+),\s([a-zA-Z0-9 ]+)/);

    if (matchParts) {
      var homeTeam = ui.getFullName(matchParts[1]);
      var awayTeam = ui.getFullName(matchParts[2]);
      var matchDate = matchParts[3];

      matches = feed.matches.filter(function (el) {
        return el.match_localteam_name === homeTeam &&
                    el.match_visitorteam_name === awayTeam &&
                    el.match_date === matchDate;
      });
    }
    // Now we can retrieve the statistics
    if (matches.length > 0) {
      var match = matches[0];
      var matchId = match.match_id;
      var options = {
        name: 'commentaries',
        qs: String.format('{0}&match_id={1}', qs, matchId)
      };
      var teams = {
        home: {
          name: matchParts[1],
          score: match.match_localteam_score
        },
        away: {
          name: matchParts[2],
          score: match.match_visitorteam_score
        }
      };
      var callback = function (err, feed, message, args) {
        ui.renderMatchStats(err, feed, teams, function (err, text) {
          self.sendMessage(utils.createOptions({
            chat_id: message.chat.id,
            text: err ? err.message : text,
            reply_markup: {
              hide_keyboard: true
            }
          }));
        });
      };

      self.processCommand(message, options, callback);
    } else {
      self.sendMessage(utils.createOptions({
        chat_id: message.chat.id,
        text: 'Match name wasn\'t recognised, please try again.',
        reply_markup: {
          hide_keyboard: true
        }
      }));
      self.setCommand(message, null);
    }
  };

  options.args = args;
  this.processCommand(message, options, callback, true);
};

Chat.prototype.sendResults = function (message, args) {
  var self = this;
  var options = getResultOptions();
  var callback = function (err, feed, message, args) {
    ui.renderResults(err, feed, function (err, text) {
      self.sendMessage(utils.createOptions({
        chat_id: message.chat.id,
        text: err ? err.message : text
      }));
    });
  };

  this.processCommand(message, options, callback);
};

Chat.prototype.sendTable = function (message, args) {
  var self = this;
  var options = {
    name: 'standings',
    qs: this.qs
  };
  var callback = function (err, feed, message, args) {
    if (err) { return; }
    ui.renderTable(null, feed, function (err, text) {
      self.sendMessage(utils.createOptions({
        chat_id: message.chat.id,
        text: err ? err.message : text
      }));
    });
  };
  this.processCommand(message, options, callback);
};

Chat.prototype.sendTeamStats = function (message, args) {
  var self = this;
  var options = {
    name: 'standings',
    qs: this.qs,
    args: args
  };
  var callback = function (err, feed, message, args) {
    if (err) { return; }
    if (args && args.length > 0) {
      var teamName = ui.getFullName(args.join(' '));

      ui.renderTeamStats(null, feed, teamName, function (err, text) {
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
