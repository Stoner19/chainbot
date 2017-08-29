# chainbot.js

<p align="left">
  <img width="20%" src="https://toaster.chaincoin.org/img/icons/chainbot/ChainBot.png" />
</p>

>chainbot is a slackbot who watches over the ChainCoin slack channel while we sleep. For now, it can turn certain Slack channels into read only channels by deleting all messages that are posted to that channel. In the future, we will add support for vote banning, moderator banning, and also allow the bot to answer questions. This bot is based off of the excellent brianwilliams.js bot by Tyler Shambora - thank you for your code!!

## Getting Started

### Installing

1. Create a new Heroku app
2. Create Slack app
3. Get Slack bot token, as well as Slack admin/god token
4. Clone this repo
5. Push the code up to your Heroku app
6. Add the following config vars to your heroku app

```
BOT_TOKEN
CLIENT_ID
CLIENT_SECRET
MEGA_TOKEN
HEROKU_URL
READ_ONLY_CHANNELS
ANNOUNCER_USERS
MODERATOR_USERS
```

where:
- `BOT_TOKEN` is the bot's token from your Slack app
- `CLIENT_ID` is the client id from your Slack app
- `CLIENT_SECRET` is the client secret from your Slack app
- `MEGA_TOKEN` is the admin/god token of an admin user in Slack
- `HEROKU_URL` is the full URL of your heroku app, to enable the keepalive feature which prevents the heroku app from sleeping after prolonged inactivity
- `READ_ONLY_CHANNELS` are the channel ids of channels you want the bot to keep as read-only (separated by commas)
- `ANNOUNCER_USERS` is a list of user ids that can post through the bot to the read only channels (separated by commas)
- `MODERATOR_USERS` is a list of user ids that are allowed to use the moderation features (separated by commas)

To get the ids of the channels and users you can use the slack api with your token and a tool such as https://www.hurl.it/

Once you've finished all the prior steps and deployed your bot to your Heroku server, visit https://[YOUR HEROKU APP URL].com/login to authenticate your bot. Once you've completed the authentication process, the bot should be a part of your team. Add people to the appropriate whitelists and also channels that you'd like to make read only.

## Example Message

While the channels are read-only and all messages are immediately deleted, the bot is allowed to post to the channel and he won't delete his own posts. This is useful if you want to make a designated announcements channel that the bot can post to but everyone else's messages are deleted as to not distract from the announcements the bot posts. In order to post to a read-only channel via. the bot, send him a message with this format:

```
post to [channel name]
[post title]
___
[post message]
```

for example:

```
post to development-
Warning of the Day
___
No matter what, do not create angry monkeys. Stay turned for more details.
```

You can use message formatting in the post message, and if you want create a post with two separate title/message combos, separate them with three line breaks like so:

```
post to news
Message Title One
___
Message Body One



Message Title Two
___
Message Body Two
```

## Built With

* [Botkit](https://github.com/howdyai/botkit)
* [slack api](https://api.slack.com/)

## Authors

* **Alan Rudolf** - [@suprnurd](https://github.com/alanrudolf)
* **Tyler Shambora** - [tshamz](https://github.com/tshamz)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
