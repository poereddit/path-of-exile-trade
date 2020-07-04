import 'reflect-metadata';

import { Client, Message } from 'discord.js';
import { createConnection } from 'typeorm';

import { CheckVouchCommand } from './commands/check-vouch';
import { MinusVouchCommand } from './commands/minus-vouch';
import { PlusVouchCommand } from './commands/plus-vouch';
import { Vouch } from './entities/vouch';

async function main() {
  const connection = await createConnection();

  const client = new Client();

  client.on('ready', async () => {
    await client.user?.setActivity('Path of Hideout', { type: 'PLAYING' });
  });

  const plusVouchCommand = new PlusVouchCommand(client, connection.getRepository(Vouch));
  const minusVouchCommand = new MinusVouchCommand(client, connection.getRepository(Vouch));
  const checkVouchCommand = new CheckVouchCommand(client, connection.getRepository(Vouch));

  client.on(plusVouchCommand.on, async (message: Message) => await plusVouchCommand.execute(message));
  client.on(minusVouchCommand.on, async (message: Message) => await minusVouchCommand.execute(message));
  client.on(checkVouchCommand.on, async (message: Message) => await checkVouchCommand.execute(message));

  client.login(process.env.DISCORD_TOKEN);
}

main();
