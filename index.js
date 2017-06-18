const Discord = require('./discord');

const CHAT_ID = 9990;

const DISCORD_CHANNELS = [
  // PUT CHANNELS HERE
];

module.exports = function DiscordRelay(dispatch) {
  const channels = DISCORD_CHANNELS.slice();
  const subs = [];
  const queue = [];

  let state = 0;

  function handle(id) {
    return function onMessage(err, event) {
      if (err) {
        console.error(err);
        return;
      }

      addMsg('chat', {
        channel: CHAT_ID + id,
        authorName: event.author.nick || event.author.name,
        message: event.content,
      });
    };
  }

  function sub(channel) {
    const args = [channel, handle(subs.length)];
    subs.push(args);
    Discord.subscribe(...args);
  }

  this.destructor = () => {
    for (const args of subs) Discord.unsubscribe(...args);
    subs.splice(0);
  };

  function print(type, data) {
    switch (type) {
      case 'chat': {
        dispatch.toClient('S_PRIVATE_CHAT', 1, data);
        break;
      }
    }
  }

  function addMsg(...args) {
    if (state === 2) {
      print(...args);
    } else {
      queue.push(args);
    }
  }

  dispatch.hook('C_LOGIN_ARBITER', 1, (event) => {
    for (const channel of channels) {
      sub(channel);
    }
  });

  dispatch.hook('S_LOGIN', '*', () => {
    state = 1;
  });

  dispatch.hook('S_SPAWN_ME', '*', () => {
    if (state === 1) {
      state = 2;

      const promises = channels.map((channel, index) =>
        new Promise((resolve) => {
          Discord.getChannel(channel, (ch) => {
            dispatch.toClient('S_JOIN_PRIVATE_CHANNEL', 1, {
              index,
              id: CHAT_ID + index,
              name: `#${ch.name}`,
            });
            resolve();
          });
        })
      );

      Promise.all(promises).then(() => {
        for (const item of queue) print(...item);
        queue.splice(0); // empty it out
      });
    }
  });

  dispatch.hook('S_JOIN_PRIVATE_CHANNEL', 1, (event) => {
    event.index += channels.length;
    return true;
  });

  dispatch.hook('C_CHAT', 1, (event) => {
    const relay = event.channel - 11;
    const numRelays = channels.length;
    if (0 <= relay && relay < numRelays) {
      Discord.send(channels[relay], event.message);
      return false;
    } else if (numRelays <= relay && relay < 9) {
      event.channel -= numRelays;
      return true;
    }
  });
};
