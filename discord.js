const DiscordRPC = require('discord-rpc').Client;

const client = new DiscordRPC({
  OAUTH2_CLIENT_ID: '207646673902501888',
  ORIGIN: 'https://streamkit.discordapp.com',
  API_ENDPOINT: 'https://streamkit.discordapp.com/overlay',
});

const guildCache = new Map();
const channelCache = new Map();

function contentToString(content) {
  if (!content) return '';

  let str = '';

  for (const item of content) {
    switch (item.type) {
      case 'text': {
        str += item.content;
        break;
      }

      case 'em': {
        str += `*${contentToString(item.content)}*`;
        break;
      }

      case 'strong': {
        str += `**${contentToString(item.content)}**`;
        break;
      }

      case 'u': {
        str += `__${contentToString(item.content)}__`;
        break;
      }

      case 's': {
        str += `~~${contentToString(item.content)}~~`;
        break;
      }

      case 'inlineCode': {
        str += `\`${item.content}\``;
        break;
      }

      case 'emoji': {
        str += item.name;
        break;
      }

      case 'link':
      case 'mention':
      case 'channel': {
        // TODO styling?
        // item.color
        str += contentToString(item.content);
        break;
      }

      case 'codeBlock': {
        // item.content
        if (item.lang) {
          str += `[${item.lang} code block]`;
        } else {
          str += `[code block]`;
        }
        break;
      }

      default: {
        console.warn('unhandled type:', item.type);
        console.warn(item);
        break;
      }
    }
  }

  return str;
}

function getGuild(guild_id, callback) {
  const cached = guildCache.get(guild_id);
  if (!cached || cached.expires <= Date.now()) {
    client.getGuild(guild_id).then((data) => {
      guildCache.set(guild_id, {
        expires: Date.now() + 10 * 60 * 1000, // 10 min
        data,
      });
      callback(data);
    });
  } else {
    process.nextTick(() => callback(cached.data));
  }
}

function getChannel(channel_id, callback) {
  const cached = channelCache.get(channel_id);
  if (!cached || cached.expires <= Date.now()) {
    client.getChannel(channel_id).then((data) => {
      channelCache.set(channel_id, {
        expires: Date.now() + 1 * 60 * 60 * 1000, // 1 hr
        data,
      });
      callback(data);
    });
  } else {
    process.nextTick(() => callback(cached.data));
  }
}

function escapeRegExp(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function replaceAll(string, search, replace) {
  return string.replace(new RegExp(escapeRegExp(search), 'gi'), replace);
}

const unHtml = (() => {
  const replacements = {
    'quot': '"',
    'amp': '&',
    'lt': '<',
    'gt': '>',
  };

  return function unHtml(s) {
    return (s
      .replace(/<.*?>/g, '')
      .replace(/&(quot|amp|lt|gt);/g, (_, $1) => replacements[$1])
    );
  };
})();

client.on('ready', () => {
  console.log(`[discord-relay] connected to ${client.user.username}#${client.user.discriminator}`);
});

client.connect();

// ---

const subscriptions = new Map();

module.exports = {
  subscribe(channel_id, callback) {
    if (!subscriptions.has(channel_id)) {
      subscriptions.set(channel_id, [callback]);

      client.subscribe('MESSAGE_CREATE', { channel_id }, (err, event) => {
        if (err && !event) {
          console.error(err);
          return;
        }

        if (event.channel_id !== channel_id) return;
        if (!subscriptions.has(channel_id)) return;

        if (err) {
          subscriptions.get(channel_id).forEach(cb => cb(err));
          return;
        }

        const { message } = event;

        const data = (err ? null : {
          author: {
            id: message.author.id,
            name: message.author.username,
            nick: message.nick,
            discriminator: message.author.discriminator,
          },
          content: contentToString(message.content_parsed),
        });

        if (message.attachments.length > 0) {
          const attachments = message.attachments
            .map(attach => attach.filename)
            .join(', ');
          data.content += ` [uploaded: ${attachments}]`;
        }

        subscriptions.get(channel_id).forEach(cb => cb(err, data));
      });
    } else {
      subscriptions.get(channel_id).push(callback);
    }
  },

  unsubscribe(channel_id, callback) {
    const cbs = subscriptions.get(channel_id);
    if (!cbs) return;

    const idx = cbs.findIndex(e => e === callback);
    if (idx === -1) return;

    cbs.splice(idx, 1); // modifies in place

    if (cbs.length === 0) {
      subscriptions.delete(channel_id);
      client.unsubscribe('MESSAGE_CREATE', { channel_id });
    }
  },

  getChannel(...args) {
    return getChannel(...args);
  },

  send(channel_id, content) {
    getChannel(channel_id, (channel) => {
      getGuild(channel.guild_id, (guild) => {
        const members = guild.members;

        let message = unHtml(content);

        // nickname
        for (const member of members) {
          if (member.nick) {
            message = replaceAll(message,
              `@${member.nick}`,
              `<@!${member.user.id}>`
            );
          }
        }

        // username
        for (const { user } of members) {
          message = replaceAll(message,
            `@${user.username}`,
            `<@${user.id}>`
          );
        }

        // send
        client.rest.sendMessage(channel_id, message);
      });
    });
  },
};
