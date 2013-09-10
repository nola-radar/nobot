var xmpp = require('node-xmpp');
var events = require('events');
var bind = require('underscore').bind;
var util = require('util');

function ChatBot(options) {
  options = options || {};
  this.jid = options.jid;
  this.password = options.password;
  this.name = null;
  this.jabber = null;
  this.keepalive = null;
  this.plugins = [];
  this.iq_count = 0;
  if (options.hasOwnProperty('plugins'))
    this.loadPlugins(options.plugins);
  
  events.EventEmitter.call(this);

}

util.inherits(ChatBot, events.EventEmitter);

ChatBot.prototype.loadPlugins = function(plugins) {
  var errors = [];
  for (var i = 0; i < plugins.length; i++) {
    var path;
    try {
      path = require.resolve('../../plugins/' + plugins[i]);    
    } catch (e) {
      try {
        path = require.resolve(__dirname + '/' + plugins[i]);
      } catch (e) {
        try {
          path = require.resolve(plugins[i]);
        } catch (e) {
          throw new Error("Cannot find module '" + plugins[i] + "'");
        }
      }
    }
    var plugin = require(path);
    this.plugins.push(new plugin(this));
  }
};

ChatBot.prototype.onOnline = function() {
  var self = this;
  self.setAvailability();
  this.keepAlive = setInterval(function() {
    self.setAvailability();
  }, 30000);

  
  this.getProfile(function(err, data) {
    if (err) {
      self.emit('error', null, 'Unable to get profile info: ' + err, null);
      return;
    }
    self.name = data['0'].children[0];
  
    self.emit('connect');
    
      
    // join rooms
    self.getRooms(function(err, rooms) {
      for(var i = 0; i < rooms.length; i++) {
        self.join(rooms[i].jid);
      }
    });
    
    self.on('message', self.message);
  });

};

ChatBot.prototype.onStanza = function(stanza) {
  var self = this;
  if (stanza.is('message') && (stanza.attrs.type === 'groupchat' || stanza.attrs.type === 'chat')) {
    var body = stanza.getChildText('body');
    if (!body) return;
    
    if (stanza.getChild('delay')) return;
    
    
    var fromJid = new xmpp.JID(stanza.attrs.from);
    var fromNick = fromJid.resource;
    
    if (fromNick === this.name) return;

    for (var i = 0; i < this.plugins.length; i++) {
      if (this.plugins[i].respond_to_msg(body)) {
        this.plugins[i].response_text(fromJid, body);
      }
    }
    
  } else if (stanza.is('iq')) {
    var event_id = 'iq:' + stanza.attrs.id;
    if (stanza.attrs.type === 'result') {
      this.emit(event_id, null, stanza);
    }
  }
};
  
ChatBot.prototype.sendIq = function(stanza, callback) {
  var self = this;
  stanza = stanza.root();
  self.once('iq:'+self.iq_count, callback);
  stanza.attrs.id = self.iq_count;
  self.iq_count++;
  self.jabber.send(stanza);
};

ChatBot.prototype.connect = function() {
  this.jabber = new xmpp.Client({
    jid: this.jid,
    password: this.password
  });

  this.jabber.on('online', bind(this.onOnline, this));
  this.jabber.on('stanza', bind(this.onStanza, this));
};

ChatBot.prototype.getProfile = function(callback) {
  var stanza = new xmpp.Element('iq', { type : 'get' })
               .c('vCard', { xmlns: 'vcard-temp' });
  this.sendIq(stanza, function(err, response) {
    var data = {};
    if (!err) {
      var fields = response.getChild('vCard').children;
      for (var k in fields) {
        data[k.toLowerCase()] = fields[k];
      }
    }
    
    callback(err, data, response);
  });
};

ChatBot.prototype.message = function(targetJid, message) {
  var stanza;
  if (targetJid.domain === 'conf.hipchat.com') {
    stanza = new xmpp.Element('message', {
      to: targetJid + '/' + this.name,
      type: 'groupchat' 
    });
  } else {
    stanza = new xmpp.Element('message', {
      to: targetJid,
      from: this.jid,
      type: 'chat'
    });
  }
  
  stanza.c('body').t(message);
  this.jabber.send(stanza);
};

ChatBot.prototype.setAvailability = function() {
  this.jabber.send(new xmpp.Element('presence', {type: 'available' })
             .c('show').t('chat')
  );
};

ChatBot.prototype.getRooms = function(callback) {
  var iq = new xmpp.Element('iq', { to: 'conf.hipchat.com', type: 'get' })
           .c('query', { xmlns: 'http://jabber.org/protocol/disco#items' });
  this.sendIq(iq, function(err, stanza) {
    var rooms = [];
    if (!err) {
      // parse response into objects
      stanza.getChild('query').getChildren('item').map(function(el) {
        var x = el.getChild('x', 'http://hipchat.com/protocol/muc#room');
        rooms.push({
          jid: el.attrs.jid,
          name: el.attrs.name,
          id: parseInt(x.getChild('id').getText()),
          topic: x.getChild('topic').getText(),
          privacy: x.getChild('privacy').getText(),
          owner: x.getChild('owner').getText(),
          num_participants:
            parseInt(x.getChild('num_participants').getText()),
          guest_url: x.getChild('guest_url').getText(),
          is_archived: x.getChild('is_archived') ? true : false
        });
      });
    }
    callback(err, rooms);
  });
};

ChatBot.prototype.join = function(roomJid) {
  var self = this;
  var req = new xmpp.Element('presence', { to: roomJid + '/' + self.name })
            .c('x', { xmlns: 'http://jabber.org/protocol/muc' }
  );
  this.jabber.send(req);
};

module.exports = ChatBot;
module.exports.Plugin = require('./plugin');