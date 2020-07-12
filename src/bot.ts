import 'reflect-metadata';

import { Client, Message } from 'discord.js';
import { createConnection } from 'typeorm';

import { CheckVouchCommand } from './commands/check-vouch';
import { MinusVouchCommand } from './commands/minus-vouch';
import { PlusVouchCommand } from './commands/plus-vouch';
import { Vouch } from './entities/vouch';
import { parseOfflineMessages } from './events/ready/parse-offline-messages';
import { setStatus } from './events/ready/set-status';

async function main() {
  const connection = await createConnection();

  const client = new Client();

  const plusVouchCommand = new PlusVouchCommand(client, connection.getRepository(Vouch));
  const minusVouchCommand = new MinusVouchCommand(client, connection.getRepository(Vouch));
  const checkVouchCommand = new CheckVouchCommand(client, connection.getRepository(Vouch));

  client.once('ready', async () => {
    setStatus(client.user);
    await parseOfflineMessages(connection.getRepository(Vouch), client, minusVouchCommand, plusVouchCommand);
  });

  client.on(plusVouchCommand.on, async (message: Message) => await plusVouchCommand.execute(message));
  client.on(minusVouchCommand.on, async (message: Message) => await minusVouchCommand.execute(message));
  client.on(checkVouchCommand.on, async (message: Message) => await checkVouchCommand.execute(message));

  client.login(process.env.DISCORD_TOKEN);
}

main();
