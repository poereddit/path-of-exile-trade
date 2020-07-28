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
import { ReforgePoeService } from './services/reforge-poe.service';

async function main() {
  ensureEnvironmentVariablesAreSet();

  const connection = await createConnection();
  const vouchRepository = connection.getCustomRepository(VouchRepository);
  const reforgePoeService = new ReforgePoeService(process.env.REFORGE_POE_API_URL as string, process.env.REFORGE_POE_TOKEN as string);

  const client = new Client();

  const checkVouchCommand = new CheckVouchCommand(client, connection.getRepository(Vouch));
  const plusVouchCommandHandler = new PlusVouchCommandHandler(client, vouchRepository, reforgePoeService);
  const minusVouchCommandHandler = new MinusVouchCommandHandler(client, vouchRepository, reforgePoeService);
  const deleteVouchEvent = new DeleteVouchEvent(vouchRepository, reforgePoeService);

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

function ensureEnvironmentVariablesAreSet() {
  const requiredEnvVars = [
    'DISCORD_TOKEN',
    'PREFIX',
    'TYPEORM_CONNECTION',
    'TYPEORM_HOST',
    'TYPEORM_USERNAME',
    'TYPEORM_PASSWORD',
    'TYPEORM_PORT',
    'TYPEORM_DATABASE',
    'TYPEORM_SYNCHRONIZE',
    'TYPEORM_ENTITIES',
    'TYPEORM_MIGRATIONS',
    'SUGGESTIONS_CHANNEL_ID',
    'VOUCH_CHANNEL_ID',
    'REFORGE_POE_API_URL',
    'REFORGE_POE_TOKEN',
  ];

  const unsetEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (unsetEnvVars.length > 0) {
    console.error(`Required environment variables are not set: [${unsetEnvVars.join(', ')}]`);
    process.exit();
  }
}

main();
