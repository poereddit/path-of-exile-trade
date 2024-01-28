import 'reflect-metadata';
import { Client as DiscordClient, Message, PartialMessage } from 'discord.js';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

import { CheckVouchCommandHandler } from './commands/check-vouch.command-handler';
import { MinusVouchCommandHandler } from './commands/minus-vouch.command-handler';
import { PlusVouchCommandHandler } from './commands/plus-vouch.command-handler';
import { dbDataSource } from './data-source';
import { DeleteVouchEvent } from './events/messageDelete/delete-vouch';
import { parseOfflineMessages } from './events/ready/parse-offline-messages';
import { setStatus } from './events/ready/set-status';
import { VouchRepository, vouchRepository } from './repositories/vouch.repository';

dotenv.config();

async function main() {
  ensureEnvironmentVariablesAreSet();

  await dbDataSource.initialize();
  const discordClient = new DiscordClient();
  const eventEmitter = new EventEmitter();

  const checkVouchCommandHandler = new CheckVouchCommandHandler(discordClient, vouchRepository);
  const plusVouchCommandHandler = new PlusVouchCommandHandler(discordClient, vouchRepository, eventEmitter);
  const minusVouchCommandHandler = new MinusVouchCommandHandler(discordClient, vouchRepository, eventEmitter);
  const deleteVouchEvent = new DeleteVouchEvent(vouchRepository, eventEmitter);

  setupDiscordEventsAndHandlers(
    discordClient,
    vouchRepository,
    minusVouchCommandHandler,
    plusVouchCommandHandler,
    checkVouchCommandHandler,
    deleteVouchEvent,
  );

  void discordClient.login(process.env.DISCORD_TOKEN);
}

function setupDiscordEventsAndHandlers(
  discordClient: DiscordClient,
  vouchRepository: VouchRepository,
  minusVouchCommandHandler: MinusVouchCommandHandler,
  plusVouchCommandHandler: PlusVouchCommandHandler,
  checkVouchCommandHandler: CheckVouchCommandHandler,
  deleteVouchEvent: DeleteVouchEvent,
) {
  discordClient.once('ready', () => {
    setStatus(discordClient.user);
    void parseOfflineMessages(vouchRepository, discordClient, minusVouchCommandHandler, plusVouchCommandHandler);
  });

  discordClient.on('message', (message: Message) => void plusVouchCommandHandler.handle(message));
  discordClient.on('message', (message: Message) => void minusVouchCommandHandler.handle(message));
  discordClient.on('message', (message: Message) => void checkVouchCommandHandler.handle(message));

  discordClient.on('messageDelete', (message: Message | PartialMessage) => void deleteVouchEvent.handle(message));
}

function ensureEnvironmentVariablesAreSet() {
  const requiredEnvVars = [
    'DISCORD_TOKEN',
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
  ];

  const unsetEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (unsetEnvVars.length > 0) {
    console.error(`Required environment variables are not set: [${unsetEnvVars.join(', ')}]`);
    process.exit();
  }
}

void main();
