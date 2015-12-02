module.exports = {
  GetFeed: function (name) {
    var feed = require('./data/' + name + '.json');

    return feed;
  },
  GetDate: function (formattedDate) {
      var pattern = /(\d{2})\.(\d{2})\.(\d{4})/;
      var date = new Date(formattedDate.replace(pattern, '$3-$2-$1T00:00:00Z'));

      return date;
  },
  GetFullName: function(shortName) {
      return shortName;
  },
  GetShortName: function(name) {
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
  // Takes an array of column values and formats into a
  // fixed-width table row
  WriteRow: function(columns) {
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
              columns[i].title, false));

          values.push(column);
      }
      values.push('|\n');

      return values.join('');
  },
  WriteDivider: function(width){
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
