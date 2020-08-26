import 'reflect-metadata';

import { Client, Message, PartialMessage } from 'discord.js';
import { EventEmitter } from 'events';
import { createConnection } from 'typeorm';

import { CheckVouchCommandHandler } from './commands/check-vouch.command-handler';
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

  const client = new Client();
  const eventEmitter = new EventEmitter();

  const checkVouchCommandHandler = new CheckVouchCommandHandler(client, vouchRepository);
  const plusVouchCommandHandler = new PlusVouchCommandHandler(client, vouchRepository, eventEmitter);
  const minusVouchCommandHandler = new MinusVouchCommandHandler(client, vouchRepository, eventEmitter);
  const deleteVouchEvent = new DeleteVouchEvent(vouchRepository, eventEmitter);

  setupDiscordEventsAndHandlers(
    client,
    vouchRepository,
    minusVouchCommandHandler,
    plusVouchCommandHandler,
    checkVouchCommandHandler,
    deleteVouchEvent
  );

  const reforgePoeService = new ReforgePoeService(process.env.REFORGE_POE_API_URL as string, process.env.REFORGE_POE_TOKEN as string);
  setupReforgePoeEventsAndHandlers(eventEmitter, reforgePoeService);

  void client.login(process.env.DISCORD_TOKEN);
}

function setupReforgePoeEventsAndHandlers(eventEmitter: EventEmitter, reforgePoeService: ReforgePoeService) {
  eventEmitter.on('vouch-added', (vouch: Vouch) => void reforgePoeService.sendVouch(vouch));
  eventEmitter.on('vouch-deleted', (messageId: string) => void reforgePoeService.deleteVouch(messageId));
}

function setupDiscordEventsAndHandlers(
  client: Client,
  vouchRepository: VouchRepository,
  minusVouchCommandHandler: MinusVouchCommandHandler,
  plusVouchCommandHandler: PlusVouchCommandHandler,
  checkVouchCommandHandler: CheckVouchCommandHandler,
  deleteVouchEvent: DeleteVouchEvent
) {
  client.once('ready', () => {
    setStatus(client.user);
    void parseOfflineMessages(vouchRepository, client, minusVouchCommandHandler, plusVouchCommandHandler);
  });

  client.on('message', (message: Message) => void plusVouchCommandHandler.handle(message));
  client.on('message', (message: Message) => void minusVouchCommandHandler.handle(message));
  client.on('message', (message: Message) => void checkVouchCommandHandler.handle(message));

  client.on('messageDelete', (message: Message | PartialMessage) => void deleteVouchEvent.handle(message));
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

void main();
