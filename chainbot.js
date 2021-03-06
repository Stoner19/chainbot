// Config ===============================================

var config               = require('dotenv').config();

var Q                    = require('q');
var moment               = require('moment');
var Botkit               = require('botkit');
var responses            = require('./responses.js');

var moderatorWhiteList   = process.env.MODERATOR_USERS.split(',');
var announcerWhiteList   = process.env.ANNOUNCER_USERS.split(',');
var updateWhiteList      = process.env.UPDATE_USERS.split(',');
var fullWhiteList        = updateWhiteList.concat(announcerWhiteList,moderatorWhiteList); //meh

var readOnlyChannels      = process.env.READ_ONLY_CHANNELS.split(',');
var listenChannels        = process.env.LISTEN_CHANNELS.split(',');

var randomHappyEmojiReactions = process.env.HAPPY_REACTIONS.split(',');
var randomAngryEmojiReactions = process.env.ANGRY_REACTIONS.split(',');

// Init ===============================================

if (!process.env.BOT_TOKEN) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
  debug: true,
  logLevel: 6
});

controller.configureSlackApp({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  scopes: ['bot', 'chat:write:user', 'chat:write:bot', 'channels:read', 'channels:write', 'groups:write']
});

controller.setupWebserver(process.env.PORT, function(err, webserver) {
  if (err) {
    throw new Error(err);
  }
  controller.createWebhookEndpoints(controller.webserver);
  controller.createHomepageEndpoint(controller.webserver);
  controller.createOauthEndpoints(controller.webserver, function(err, req, res) {
    if (err) {
      res.status(500).send('ERROR: ' + err);
    } else {
      res.send('Great Success!');
    }
  });
});

var bot = controller.spawn({
  token: process.env.BOT_TOKEN
});

bot.startRTM(function(err) {
  if (err) {
    console.log('Even if you fall on your face, you\'re still moving forward.');
    throw new Error(err);
  }
});

// USED TO GET THE MEGA ADMIN TOKEN
controller.on('create_user',function(bot, user) {
  console.log('USED TO GET THE MEGA ADMIN TOKEN');
  console.log('-----');
  console.log('USER TOKEN:');
  console.log(user.access_token);
  console.log('-----');
});

var _bots = {};
var trackBot = function(bot) {
  _bots[bot.config.token] = bot;
};

controller.on('create_bot',function(bot, config) {
  if (_bots[bot.config.token]) {
    // already online! do nothing.
  } else {
    bot.startRTM(function(err, bot, payload) {
      if (err) {
        console.log('Even if you fall on your face, you\'re still moving forward.');
        throw new Error(err);
      } else {
        trackBot(bot);
      }
    });
  }
});

controller.storage.teams.all(function(err, teams) {
  if (err) {
    throw new Error(err);
  }
  for (var t in teams) {
    if (teams[t].bot) {
      controller.spawn(teams[t]).startRTM(function(err, bot) {
        if (err) {
          console.log('Error connecting bot to Slack:',err);
        } else {
          trackBot(bot);
        }
      });
    }
  }
});


// Helper Functions ===============================================

var getRealNameFromId = function(bot, userId) {
  var deferred = Q.defer();
  var realName = '';
  bot.api.users.info({user: userId}, function(err, response) {
    realName = response.user.real_name.toLowerCase();
    deferred.resolve(realName);
  });
  return deferred.promise;
};

var getSlackUserNameFromId = function(bot, userId) {
  var deferred = Q.defer();
  var slackUserName = '';
  bot.api.users.info({user: userId}, function(err, response) {
    slackUserName = response.user.name;
    deferred.resolve(slackUserName);
  });
  return deferred.promise;
};

var isValidChannelName = function(bot, channelName) {
  var deferred = Q.defer();
  bot.api.channels.list({}, function(err, response) {
    deferred.resolve(response.channels.some(function(channel) {
      return channel.name === channelName;
    }));
  });
  return deferred.promise;
};

var isValidUser = function(userID, whiteList) {
  var deferred = Q.defer();
  deferred.resolve(whiteList.some(function(validUserID) {
    return validUserID === userID;
  }));
  return deferred.promise;
};


// Listeners  ===============================================

controller.hears([/post to (\S+)\n([\s\S]*)/], 'direct_message', function(bot, message) {
  var channelName = message.match[1];
  var update = message.match[2];

  var parsedMessages = update.split('\n\n\n').map(function(block) {
    var messageParts = block.split('\n___\n');
    return {
      fallback: messageParts[1],
      title: messageParts[0],
      text: messageParts[1],
      color: 'danger',
      mrkdwn_in: ['fallback', 'text']
    };
  });

  var validateChannel = isValidChannelName(bot, channelName);
  //var validateName = getRealNameFromId(bot, message.user).then(isValidUser, announcerWhiteList);
  var slackUserID = message.user;
  var validateID = isValidUser(slackUserID, announcerWhiteList);
  var slackUserName = getSlackUserNameFromId(bot, slackUserID);
  var isValidated = Q.all([validateChannel, validateID, slackUserName]);

  isValidated.spread(function(validChannel, validUser, slackUserID, slackUserName) {
    if (!validUser) {
      return bot.reply(message, 'Sorry, you\'re not authenticated to post.');
    } else if (!validChannel) {
      return bot.reply(message, 'Sorry, I can\'t post to the channel: ' + channelName + '.');
    } else if (validUser && validChannel) {
      var theDate = moment().format('dddd, MMMM Do YYYY');
      bot.startConversation(message, function(err, convo) {
        convo.say('*I\'m about to post the following:*');
        convo.say({
          slackUsername: 'ChainBot: Dev Team Announcer',
          icon_url: 'https://toaster.chaincoin.org/img/icons/chainbot/ChainBot.png',
          text: '*Posted by:* ' + slackUserID + ' *on* ' + theDate + '\n<!channel>',
          attachments: parsedMessages

        });
        convo.ask(responses.confirm(bot, channelName, parsedMessages, theDate, slackUserID, slackUserName), [
          responses.yes(bot, 'post', {channel:channelName, message:parsedMessages, date:theDate, id:slackUserID, user:slackUserName}),
          responses.no(bot),
          responses.default()
        ]);
      });
    }
  });
});

controller.hears(['help'], ['direct_message'], function(bot, message) {
    isValidUser(message.user, fullWhiteList)
    .then(function(result) {
      if (result) {
        bot.reply(message, '*Syntax:*');
        bot.reply(message, 'post to <channel name>');
        bot.reply(message, '<message title>');
        bot.reply(message, '___');
        bot.reply(message, '<message body>');
      }
    });
});

/*controller.hears(['hey mister'], ['direct_message', 'mention', 'direct_mention'], function(bot, message) {
  //getRealNameFromId(bot, message.user)
    //.then(isValidUser)
    isValidUser(message.user)
    .then(function(result) {
      bot.reply(message, 'Hello!');
      if (result) {
        bot.reply(message, 'Hey! You\'re pretty valid!');
      }
    });
});*/

/*
controller.hears([/delete (\S+) from (\S+)/], ['direct_message'], function(bot, message) {

  //TODO: this function should check the moderator list before running

  var channelOptions = {
    token: bot.config.token,
    channel: message.match[2],
  };

  var deleteOptions = {
    token: process.env.MEGA_TOKEN,
    ts: message.match[1],
    channel: message.match[2],
    as_user: true
  };

  bot.api.channels.info(channelOptions, function (err, response) {
    if (!response.ok) {
      console.log(response);
      bot.reply(message, 'incorrect channel id');
    } else if (message.match[1][9] !== '.') {
      bot.reply(message, 'incorrect time stamp');
    } else {
      bot.startConversation(message, function(err, convo) {
        convo.say('*I\'m about to delete:*');
        convo.say(`https://bva.slack.com/archives/${response.channel.name}/p${message.match[1].replace('.', '')}`);
        convo.ask(responses.confirm(bot, deleteOptions), [
          responses.yes(bot, 'delete', deleteOptions),
          responses.no(bot),
          responses.default()
        ]);
      });
    }
  });
});*/

/*controller.on('direct_message, mention, direct_mention', function(bot, message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'jesus',
  }, function(err) {
    if (err) {
      console.log(err);
    } else {
      bot.reply(message, 'go with christ brah.');
    }
  });
});*/

controller.hears(['update'], ['ambient'], function(bot, message) {
  if (listenChannels.indexOf(message.channel) !== -1) { //only be useful in specified channels
    getSlackUserNameFromId(bot, message.user).then(function(userName) {
      bot.startConversation(message, function(err, convo) {
        convo.say('To hear about the latest Chaincoin updates, just @mention me in your question.');
      });
    });

  }
});

controller.hears(['update'], ['direct_mention', 'mention'], function(bot, message) {
  if (listenChannels.indexOf(message.channel) !== -1) { //only be useful in specified channels
    getSlackUserNameFromId(bot, message.user).then(function(userName) {
      bot.startConversation(message, function(err, convo) {
        convo.say('Thanks for asking about the latest Chaincoin updates *' + userName + '*.');
        convo.say('Unfortunately I\'ve only been programmed to spit out this message for now, but soon the various dev team members will be able to post their updates to me and I\'ll remember them so I can repeat them back to people like you who ask for updates!');
        convo.say('Have a nice day!');
      });
    });

  }
});

controller.hears(['thank'], ['direct_mention', 'mention'], function(bot, message) {
  if (listenChannels.indexOf(message.channel) !== -1) { //only be useful in specified channels
    getSlackUserNameFromId(bot, message.user).then(function(userName) {
      bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'chaincoin',
      }, function(err) {
        if (err) {
          console.log(err);
        } else {
          bot.reply(message, 'You\'re welcome, *' + userName + '*.');
        }
      });
      bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'thumbsup',
      }, function(err) {
        if (err) {
          console.log(err);
        }
      });
    });

  }
});

controller.hears(['hi', 'hello', 'greeting'], ['direct_mention', 'mention'], function(bot, message) {
  if (listenChannels.indexOf(message.channel) !== -1) { //only be useful in specified channels
    getSlackUserNameFromId(bot, message.user).then(function(userName) {
      bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'wave',
      }, function(err) {
        if (err) {
          console.log(err);
        } else {
          bot.reply(message, 'Hello *' + userName + '*! :sunglasses:');
        }
      });      
    });

  }
});

controller.hears(['chainbot'], ['ambient'], function(bot, message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'chaincoin',
  });
});

//keep readOnlyChannels clear by deleting all messages
controller.hears([/[\s\S]*/], ['direct_message', 'direct_mention', 'mention', 'ambient', 'user_channel_join'], function(bot, message) {
  //can also add 'channel_leave' to remove messages when users leave channel
  if (readOnlyChannels.indexOf(message.channel) !== -1) {
    getRealNameFromId(bot, message.user).then(function(realName) {
      var options = {
        token: process.env.MEGA_TOKEN,
        ts: message.ts,
        channel: message.channel,
        as_user: true
      };

      console.log(options);

      console.log('%s said: "%s"', realName, message.text);
      console.log('Attempting to delete the message.' );

      // this whole block looks pretty ripe for some abstraction and recursion (tsham)
      bot.api.chat.delete(options, function(err, response) {
        if (!response.ok) {
          console.log('Unable to delete due to error: ' + err);
          console.log('Trying one more time in 2 seconds');
          setTimeout(function() {
            bot.api.chat.delete(options, function(err, response) {
              if (!response.ok) {
                console.log('Unable to delete after a second attempt due to error: ' + err);
              }
            });
          }, 2000);
        } else {
          console.log('Message successfully deleted!');
        }
      });
    });
  }
});

controller.on('rtm_open', function(bot) {
  console.log('** The RTM api just connected: ' + bot.identity.name);
});

controller.on('rtm_close', function() {
  console.log('** The RTM api just closed');
});
