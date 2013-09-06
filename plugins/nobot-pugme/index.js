var Plugin = require('nobot').Plugin;
var util = require('util');
var http = require('http');

function PugMe(bot) {
  Plugin.call(this, bot);
}

util.inherits(PugMe, Plugin);

Plugin.prototype.respond_to_msg = function(msg) {
  if (msg.match(/^pug me/i) != null) {
    return true;
  }
  return false;
}

Plugin.prototype.response_text = function(recipient, msg) {
  var self = this;
  var options = {
    host: 'pugme.herokuapp.com',
    port: 80,
    path: '/random',
    method: 'GET'
  };
  var req = http.request(options, function(res) {
      var body = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        body += chunk;
      });
      
      res.on('end', function() {
        var result = JSON.parse(body);
        self.bot.emit('message', recipient, result.pug);
      });
  });
  
  req.on('error', function(e) {
    return console.log(e);
  });
  req.end();
}

module.exports = PugMe;