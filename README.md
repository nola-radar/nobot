# Nobot

A chat bot for HipChat that provides basic functionalities and plugin support.

Install plugins through npm or put them into a folder 'plugins' in the directory of your script.

## Example

```javascript
var nobot = require('nobot');
var bot = new nobot({
  jid: '123456@chat.hipchat.com',
  password: 'hunter2',
  plugins: ['nobot-pugme']
});

bot.connect();