function Plugin(bot) {
  this.bot = bot;
}

Plugin.prototype.respond_to_msg = function(msg) {
  return false;
}

Plugin.prototype.response_text = function(recipient, msg) {
  return;
}

module.exports = Plugin;