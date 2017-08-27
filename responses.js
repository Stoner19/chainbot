module.exports = {
  confirm: function() {
    return {
      text: 'Would you like to proceed?',
      attachments: [{
        fallback: '*YES* to confirm',
        text: '*YES* to confirm',
        color: 'good',
        mrkdwn_in: ['fallback', 'text']
      }, {
        fallback: '*NO* to abort',
        text: '*NO* to abort',
        color: 'danger',
        mrkdwn_in: ['fallback', 'text']
      }]
    };
  },
  yes: function(bot, action, options) {
    return {
      pattern: bot.utterances.yes,
      callback: function(response, convo) {
        convo.say('Great! Moving forward...');
        if (action === 'post') {
          bot.say({
            channel: '#' + options.channel,
            username: 'ChainCoin Announcement',
            icon_url: 'https://toaster.chaincoin.org/img/icons/chainbot/ChainBot.png',
            text: '*Posted by:* <@' + options.id + '|' + options.user + '> *on* ' + options.date + '\n<!channel>',
            attachments: options.message,
          });
        } else if (action === 'delete') {
          console.log(options);
          bot.api.chat.delete(options, function(err, response) {
            if (!response.ok) {
              convo.say('Unable to delete due to error: ' + err);
              console.log('Unable to delete due to error: ' + err);
              convo.say('Trying one more time in 2 seconds');
              console.log('Trying one more time in 2 seconds');
              setTimeout(function() {
                bot.api.chat.delete(options, function(err, response) {
                  if (!response.ok) {
                    convo.say('Unable to delete after a second attempt due to error: ' + err);
                    console.log('Unable to delete after a second attempt due to error: ' + err);
                  }
                });
              }, 2000);
            } else {
              convo.say('Message successfully deleted!');
              console.log('Message successfully deleted!');
            }
          });
        }
        convo.next();
      }
    };
  },
  no: function(bot) {
    return {
      pattern: bot.utterances.no,
      callback: function(response, convo) {
        convo.say('Perhaps later.');
        convo.next();
      }
    };
  },
  default: function() {
    return {
      default: true,
      callback: function(response, convo) {
        convo.repeat();
        convo.next();
      }
    };
  }
};
