import 'reflect-metadata';

import { Client, Message, TextChannel } from 'discord.js';
import { Repository, createConnection } from 'typeorm';

import { CheckVouchCommand } from './commands/check-vouch';
import { MinusVouchCommand } from './commands/minus-vouch';
import { PlusVouchCommand } from './commands/plus-vouch';
import { Vouch } from './entities/vouch';

async function main() {
  const connection = await createConnection();

  const client = new Client();

  const plusVouchCommand = new PlusVouchCommand(client, connection.getRepository(Vouch));
  const minusVouchCommand = new MinusVouchCommand(client, connection.getRepository(Vouch));
  const checkVouchCommand = new CheckVouchCommand(client, connection.getRepository(Vouch));

  client.on('ready', async () => {
    client.user?.setActivity('Path of Hideout', { type: 'PLAYING' });
    await parseMessagesWhileOffline(connection.getRepository(Vouch), client, minusVouchCommand, plusVouchCommand);
  });

  client.on(plusVouchCommand.on, async (message: Message) => await plusVouchCommand.execute(message));
  client.on(minusVouchCommand.on, async (message: Message) => await minusVouchCommand.execute(message));
  client.on(checkVouchCommand.on, async (message: Message) => await checkVouchCommand.execute(message));

  client.login(process.env.DISCORD_TOKEN);
}

async function parseMessagesWhileOffline(
  vouchRepository: Repository<Vouch>,
  client: Client,
  minusVouchCommand: MinusVouchCommand,
  plusVouchCommand: PlusVouchCommand
) {
  const lastProcessedVouch = await vouchRepository.findOne({ order: { createdAt: 'DESC' } });
  if (!lastProcessedVouch) {
    return;
  }
  const vouchChannel = (await client.channels.fetch(`${process.env.VOUCH_CHANNEL_ID}`)) as TextChannel;

  let unprocessedMessages: Message[] = [];

  let messageBatch = await vouchChannel.messages.fetch({ limit: 100 });
  while (messageBatch.size > 0) {
    let messageBatchArray = [...messageBatch.array()];
    let reachedLastProcessedVouch = false;

    if (!!messageBatchArray.find((x) => x.id === lastProcessedVouch?.messageId)) {
      reachedLastProcessedVouch = true;
      const lastProcessedIndex = messageBatchArray.findIndex((x) => x.id === lastProcessedVouch?.messageId);
      messageBatchArray = messageBatchArray.slice(0, lastProcessedIndex);
    }

    messageBatchArray = messageBatchArray.reverse();
    unprocessedMessages = [...messageBatchArray, ...unprocessedMessages];

    if (reachedLastProcessedVouch) {
      break;
    }

    messageBatch = await vouchChannel.messages.fetch({
      before: unprocessedMessages[0].id,
      limit: 100,
    });
  }

  for (const unprocessedMessage of unprocessedMessages) {
    await minusVouchCommand.execute(unprocessedMessage, { warnUser: false });
    await plusVouchCommand.execute(unprocessedMessage, { warnUser: false });
  }
}

main();
