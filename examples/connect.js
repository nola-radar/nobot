var nobot = require('../');

var bot = new nobot({
  jid: '123456@chat.hipchat.com',
  password: 'hunter2',
  plugins: ['nobot-pugme']
});

bot.connect();
