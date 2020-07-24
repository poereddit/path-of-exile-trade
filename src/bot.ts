import 'reflect-metadata';

import { Client, Message, PartialMessage } from 'discord.js';
import { createConnection } from 'typeorm';

import { CheckVouchCommand } from './commands/check-vouch';
import { MinusVouchCommandHandler } from './commands/minus-vouch.command-handler';
import { PlusVouchCommandHandler } from './commands/plus-vouch.command-handler';
import { Vouch } from './entities/vouch';
import { DeleteVouchEvent } from './events/messageDelete/delete-vouch';
import { parseOfflineMessages } from './events/ready/parse-offline-messages';
import { setStatus } from './events/ready/set-status';
import { VouchRepository } from './repositories/vouch.repository';

async function main() {
  const connection = await createConnection();
  const vouchRepository = connection.getCustomRepository(VouchRepository);

  const client = new Client();

  const checkVouchCommand = new CheckVouchCommand(client, connection.getRepository(Vouch));
  const plusVouchCommandHandler = new PlusVouchCommandHandler(client, vouchRepository);
  const minusVouchCommandHandler = new MinusVouchCommandHandler(client, vouchRepository);
  const deleteVouchEvent = new DeleteVouchEvent(vouchRepository);

  client.once('ready', async () => {
    setStatus(client.user);
    await parseOfflineMessages(vouchRepository, client, minusVouchCommandHandler, plusVouchCommandHandler);
  });

  client.on('message', async (message: Message) => await plusVouchCommandHandler.handle(message));
  client.on('message', async (message: Message) => await minusVouchCommandHandler.handle(message));
  client.on(checkVouchCommand.on, async (message: Message) => await checkVouchCommand.execute(message));

  client.on('messageDelete', async (message: Message | PartialMessage) => await deleteVouchEvent.handle(message));

  client.login(process.env.DISCORD_TOKEN);
}

main();
