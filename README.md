# tera-discord-chat

[tera-proxy](https://meishuu.github.io/tera-proxy/) module to read and send Discord messages from in game.

Unlike [tera-discord-relay](https://github.com/meishuu/tera-discord-relay), this connects an **existing TERA client** to an **existing Discord client**.

![TODO](http://i.imgur.com/zmE1PO8.png)

## Installation

[Download](https://github.com/meishuu/tera-discord-chat/archive/master.zip) and unzip into your tera-proxy modules directory.

Open up a terminal (e.g., Command Prompt) and run:

```sh
cd path/to/tera-proxy/bin/node_modules/tera-discord-chat
npm install
```

## Configuration

Open up [`index.js`](index.js) in a text/code editor and look for `DISCORD_CHANNELS` near the top. In between the brackets, add channel IDs in quotes, separated by commas. You can optionally add comments so you can help remember which number is for which channel. For example:

```js
const DISCORD_CHANNELS = [
  '193653788689694722', // TeraOnline #news
  '123456789123456780', // comments are optional and can be anything
  '987654321987654321',
];
```

## Usage

When this module gets loaded, it will connect to your Discord via [RPC](https://discordapp.com/developers/docs/topics/rpc). This is a **private beta feature** and we really aren't supposed to be using it, but we do so by impersonating the [StreamKit Overlay](https://streamkit.discordapp.com/overlay). So, when we connect to Discord, you'll see a blue banner on the top saying "StreamKit Overlay is currently controlling your Discord client." That's us. Be aware that this may break at any time until Discord opens it up for more developers.

You must be running the standalone client (i.e., no browser). If you run multiple Discord clients, it will connect to the one that launched first.

In TERA, you'll find a fake private channel for each Discord channel, starting with chat channel /1 and going up to /8. These faked channels will be named after the linked Discord channel. If you send a message to one of these channels in TERA, it will be sent through your own Discord client.

## To Do

- Remove (or improve) dependency on discord-rpc
- Allow specifying channels per Discord account
- Better user/guild caching system?
- Integration with planned upcoming baldera-settings for easier configuration
