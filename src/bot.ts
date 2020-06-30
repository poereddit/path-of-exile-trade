import { Client } from 'discord.js';

const client = new Client();

client.once('ready', () => {
  console.log('Ready!');
});

client.login(process.env.DISCORD_TOKEN);
