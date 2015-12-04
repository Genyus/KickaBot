// npm modules
var Bot = require('node-telegram-bot');

// Custom modules
var util = require('./util');

var self = module.exports = {
    getDate: function getDate(formattedDate) {
        var pattern = /(\d{2})\.(\d{2})\.(\d{4})/;
        var date = new Date(formattedDate.replace(pattern, '$3-$2-$1T00:00:00Z'));

        return date;
    },
    getFullName: function getFullName(name) {
        var fullName;
        var shortName = name.join(' ');
        switch (shortName.toLowerCase()) {
            case 'villa':
                fullName = 'Aston Villa';
                break;
            case 'c. palace':
            case 'palace':
                fullName = 'Crystal Palace';
                break;
            case 'man. united':
            case 'man united':
            case 'man. u':
            case 'man u':
                fullName = 'Manchester United';
                break;
            case 'man. city':
            case 'man city':
            case 'man. c':
            case 'man c':
                fullName = 'Manchester City';
                break;
            case 'newcastle':
                fullName = 'Newcastle Utd';
                break;
            case 'stoke':
                fullName = 'Stoke City';
                break;
            case 'spurs':
                fullName = 'Tottenham';
                break;
            default:
                fullName = util.capitalise(shortName);
                break;
        }

        return fullName;
    },
    getShortName: function getShortName(name) {
        var shortName;

        switch (name) {
            case 'Crystal Palace':
                shortName = 'C. Palace';
                break;
            case 'Manchester United':
                shortName = 'Man. United';
                break;
            case 'Manchester City':
                shortName = 'Man. City';
                break;
            case 'Newcastle Utd':
                shortName = 'Newcastle';
                break;
            default:
                shortName = name;
                break;
        }

        return shortName;
    },
    renderFixtures: function renderFixtures(error, feed, callback) {
        var today = util.today();
        //var today = new Date('2015-09-19T00:00:00Z');
        var matches = feed.matches.filter(function(el) {
            return self.getDate(el.match_formatted_date) >= today;
        });
        var buffer = [];
        var currentDate = new Date(1970, 0, 1);

        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            var matchDate = self.getDate(match.match_formatted_date);
            if (matchDate > currentDate) {
                if (i > 0)
                    buffer.push('\r\n');

                buffer.push(match.match_date + '\r\n');
                currentDate = matchDate;
            }
            buffer.push(match.match_localteam_name + ' vs ' +
                match.match_visitorteam_name + ', ' + match.match_time + ' [' +
                match.match_id + ']' + '\r\n');
        }

        if(typeof(callback) === 'function') {
            callback(null, buffer.join(''));
        }
    },
    renderTeamStats: function renderTeamStats(error, feed, teamName, callback) {
        var standings = feed.teams.filter(function(el) {
            return el.stand_team_name == teamName;
        });

        // We couldn't recognise the provided team name
        if (standings.length != 1) {
            return;
        }
        // Markdown code blocks require a space after the opening block and a
        // non-whitespace character after the closing block
        var team = standings[0];
        var width = 33;
        var divider = self.writeDivider(width);
        var mark = divider.length - 2;
        var lastDivider = divider.slice(0, mark) + '```' + divider.slice(mark);
        var firstDivider = String.format('``` {0}', divider);
        var buffer = [firstDivider];
        var cells = [{
            'text': team.stand_team_name,
            'width': width - 2
        }];

        // Title row
        buffer.push(self.writeRow(cells));
        buffer.push(divider);
        cells = [{
            'text': 'League #',
            'width': 8
        }, {
            'text': 'Points',
            'width': 6
        }, {
            'text': 'Recent form',
            'width': 11
        }];
        // Team stats
        buffer.push(self.writeRow(cells));
        util.mergeArrayValues([
            team.stand_position,
            team.stand_points,
            team.stand_recent_form
        ], cells, 'text');
        // cells[0].text = team.stand_recent_position;
        // cells[1].text = team.stand_recent_points;
        // cells[2].text = team.stand_recent_form;
        buffer.push(self.writeRow(cells));
        buffer.push(divider);
        cells = [{
            'text': '',
            'width': 5
        }, {
            'text': 'GP',
            'width': 2
        }, {
            'text': 'W',
            'width': 2
        }, {
            'text': 'D',
            'width': 2
        }, {
            'text': 'L',
            'width': 2
        }, {
            'text': 'GD',
            'width': 3
        }];
        buffer.push(self.writeRow(cells));
        util.mergeArrayValues([
            'Total',
            team.stand_overall_gp,
            team.stand_overall_w,
            team.stand_overall_d,
            team.stand_overall_l,
            team.stand_gd
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        util.mergeArrayValues([
            'Home',
            team.stand_home_gp,
            team.stand_home_w,
            team.stand_home_d,
            team.stand_home_l, (+team.stand_home_gs - +team.stand_home_ga) + ''
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        util.mergeArrayValues([
            'Away',
            team.stand_away_gp,
            team.stand_away_w,
            team.stand_away_d,
            team.stand_away_l, (+team.stand_away_gs - +team.stand_away_ga) + ''
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        buffer.push(lastDivider);
        callback(null, buffer.join(''));
    },
    renderTable: function renderTable(error, feed, callback) {
        //Check for error
        if (error) {
            return console.log('Error in renderTable function', error);
        }

        var standings = feed.teams.filter(function(el) {
            return +(el.stand_team_id) !== 0;
        });
        // Markdown code blocks require a space after the opening block and a
        // non-whitespace character after the closing block
        var width = 35;
        var divider = self.writeDivider(width);
        var headers = [{
            'text': '#',
            'width': 2
        }, {
            'text': 'Team',
            'width': 11
        }, {
            'text': 'P',
            'width': 2
        }, {
            'text': 'GD',
            'width': 3
        }, {
            'text': 'Pts',
            'width': 3
        }];
        var head = String.format('``` {0}{1}', divider, self.writeRow(headers));
        var buffer = [head];
        var currentDesc = '';

        for (var i = 0; i < standings.length; i++) {
            var standing = standings[i];
            var standingDesc = standing.stand_desc;
            var columns = [{
                'text': standing.stand_position,
                'width': 2
            }, {
                'text': self.getShortName(standing.stand_team_name),
                'width': 11
            }, {
                'text': standing.stand_home_gp,
                'width': 2
            }, {
                'text': standing.stand_gd,
                'width': 3
            }, {
                'text': standing.stand_points,
                'width': 3
            }];

            if (currentDesc !== standingDesc && i != 3) {
                buffer.push(divider);
                currentDesc = standingDesc;
            }
            buffer.push(self.writeRow(columns));
        }
        var mark = divider.length - 2;
        var lastDivider = divider.slice(0, mark) + '```' + divider.slice(mark);
        buffer.push(lastDivider);
        callback(null, buffer.join(''));
    },
    // Takes an array of column values and formats into a
    // fixed-width table row
    writeRow: function writeRow(columns) {
        var values = [];

        //   Object.keys(columns).forEach(function(key, index) {
        //       console.log(String.format('Key: {0}, value: {1}', key, this[key]));
        //       var width = this[key];
        //       var column = String.format('| {0} ', pad(Array(width + 1).join(' '),
        //           key, false));
        //   }, columns);
        for (var i = 0; i < columns.length; i++) {
            var width = columns[i].width;
            var column = String.format('| {0} ', pad(Array(width + 1).join(' '),
                columns[i].text, false));

            values.push(column);
        }
        values.push('|\n');

        return values.join('');
    },
    writeDivider: function writeDivider(width) {
        var divider = String.format('|{0}|\n', pad(Array(width + 1).join('-')));

        return divider;
    }
};

// Private function. Adds padding to make text a minimum width
var pad = function(pad, str, padLeft) {
    if (typeof str === 'undefined')
        return pad;

    var length = pad.length > str.length ? pad.length : str.length;
    if (padLeft) {
        return (pad + str).slice(-length);
    } else {
        return (str + pad).substring(0, length);
    }
};

if (!String.format) {
    String.format = function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}
