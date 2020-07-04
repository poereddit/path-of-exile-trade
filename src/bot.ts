import 'reflect-metadata';

import { Client, Message } from 'discord.js';
import { createConnection } from 'typeorm';

import { CheckRepCommand } from './commands/check-rep';
import { MinusRepCommand } from './commands/minus-rep';
import { PlusRepCommand } from './commands/plus-rep';
import { Vouch } from './entities/vouch';

async function main() {
  const connection = await createConnection();

  const client = new Client();

  client.on('ready', async () => {
    await client.user?.setActivity('Path of Hideout', { type: 'PLAYING' });
  });

  const plusRepCommand = new PlusRepCommand(client, connection.getRepository(Vouch));
  const minusRepCommand = new MinusRepCommand(client, connection.getRepository(Vouch));
  const checkRepCommand = new CheckRepCommand(client, connection.getRepository(Vouch));

  client.on(plusRepCommand.on, async (message: Message) => await plusRepCommand.execute(message));
  client.on(minusRepCommand.on, async (message: Message) => await minusRepCommand.execute(message));
  client.on(checkRepCommand.on, async (message: Message) => await checkRepCommand.execute(message));

  client.login(process.env.DISCORD_TOKEN);
}

main();
