var http = require('http');
var Bot = require('node-telegram-bot');
var util = require('./util');

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
        var fixtures = util.GetFeed('fixtures');
        var today = new Date('2015-09-19T00:00:00Z');

        var matches = fixtures.matches.filter(function(el) {
            return util.GetDate(el.match_formatted_date) >= today;
        });
        var text = '';
        var currentDate = new Date(1970, 0, 1);

        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            var matchDate = util.GetDate(match.match_formatted_date);
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
        var standings = util.GetFeed('standings').teams;
        // Markdown code blocks require a space after the opening block and a
        // non-whitespace character after the closing block
        var width = 35;
        var divider = util.WriteDivider(width);
        var headers = [
            {'title':'#','width':2},
            {'title':'Team','width':11},
            {'title':'P','width':2},
            {'title':'GD','width':3},
            {'title':'Pts','width':3}
        ];
        var head = String.format('``` {0}{1}', divider, util.WriteRow(headers));
        var text = [head];
        var currentDesc = '';

        for (var i = 0; i < standings.length; i++) {
            var standing = standings[i];
            var standingDesc = standing.stand_desc;
            var columns = [
                {'title':standing.stand_position,'width':2},
                {'title':util.GetShortName(standing.stand_team_name),'width':11},
                {'title':standing.stand_overall_gp,'width':2},
                {'title':standing.stand_gd,'width':3},
                {'title':standing.stand_points,'width':3}
            ];

            if (currentDesc !== standingDesc && i != 3) {
                text.push(divider);
                currentDesc = standingDesc;
            }
            text.push(util.WriteRow(columns));
        }
        var mark = divider.length-2;
        var finalDivider = divider.slice(0, mark) + '```' + divider.slice(mark);
        text.push(finalDivider);
        bot.sendMessage({
            chat_id: message.chat.id,
            text: text.join(''),
            parse_mode: 'Markdown'
        });
    })
    .on('stats', function(message, args) {
        var standings = util.GetFeed('standings').teams.filter(function(el) {
            console.log('Args: ' + args);
            return util.GetFullName(args) == el.stand_team_name;
        });

        // We couldn't recognise the provided team name
        if(standings.length != 1){
            return;
        }
        // Markdown code blocks require a space after the opening block and a
        // non-whitespace character after the closing block
        var team = standings[0];
        var width = 33;
        var divider = util.WriteDivider(width);
        var headers = [
            {'title':'League #','width':8},
            {'title':'Points','width':6},
            {'title':'Recent form','width':11}
        ];
        var stats = [
            {'title':'','width':5},
            {'title':'GP','width':2},
            {'title':'W','width':2},
            {'title':'D','width':2},
            {'title':'L','width':2},
            {'title':'GD','width':3}
        ];
        var text = [String.format('``` {0}', divider)];
        var mark = divider.length-2;
        var finalDivider = divider.slice(0, mark) + '```' + divider.slice(mark);

        text.push(util.WriteRow([{'title':team.stand_team_name,'width':width-2}]));
        text.push(divider);
        text.push(util.WriteRow(headers));
        headers[0].title = team.stand_position;
        headers[1].title = team.stand_points;
        headers[2].title = team.stand_recent_form;
        text.push(util.WriteRow(headers));
        text.push(divider);
        text.push(util.WriteRow(stats));
        stats[0].title = 'Total';
        stats[1].title = team.stand_overall_gp;
        stats[2].title = team.stand_overall_w;
        stats[3].title = team.stand_overall_d;
        stats[4].title = team.stand_overall_l;
        stats[5].title = team.stand_gd;
        text.push(util.WriteRow(stats));
        stats[0].title = 'Home';
        stats[1].title = team.stand_home_gp;
        stats[2].title = team.stand_home_w;
        stats[3].title = team.stand_home_d;
        stats[4].title = team.stand_home_l;
        stats[5].title = (+team.stand_home_gs - +team.stand_home_ga)+'';
        text.push(util.WriteRow(stats));
        stats[0].title = 'Away';
        stats[1].title = team.stand_away_gp;
        stats[2].title = team.stand_away_w;
        stats[3].title = team.stand_away_d;
        stats[4].title = team.stand_away_l;
        stats[5].title = (+team.stand_away_gs - +team.stand_away_ga)+'';
        text.push(util.WriteRow(stats));
        text.push(finalDivider);
        bot.sendMessage({
            chat_id: message.chat.id,
            text: text.join(''),
            parse_mode: 'Markdown'
        });
    })
    .start();
// http.createServer(function (req, res) {
//   res.writeHead(200, {'Content-Type': 'text/plain'});
//   res.end('Hello World\n');
// }).listen(8080);
//
// console.log('Server running on port 8080.');
