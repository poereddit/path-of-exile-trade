import { Client, Message, TextChannel } from 'discord.js';

import { MinusVouchCommandHandler } from '../../commands/minus-vouch.command-handler';
import { PlusVouchCommandHandler } from '../../commands/plus-vouch.command-handler';
import { VouchRepository } from '../../repositories/vouch.repository';

export async function parseOfflineMessages(
  vouchRepository: VouchRepository,
  client: Client,
  minusVouchCommand: MinusVouchCommandHandler,
  plusVouchCommand: PlusVouchCommandHandler
): Promise<void> {
  const lastProcessedVouch = await vouchRepository.getLastVouch();
  if (!lastProcessedVouch) {
    return;
  }
  const vouchChannel = (await client.channels.fetch(`${process.env.VOUCH_CHANNEL_ID as string}`)) as TextChannel;

  const unprocessedMessages = await getUnprocessedMessages(vouchChannel, lastProcessedVouch.messageId);

  for (const unprocessedMessage of unprocessedMessages) {
    await minusVouchCommand.handle(unprocessedMessage, { alertUser: false, react: true });
    await plusVouchCommand.handle(unprocessedMessage, { alertUser: false, react: true });
  }
}

async function getUnprocessedMessages(vouchChannel: TextChannel, lastProcessedVouchId: string): Promise<Message[]> {
  let unprocessedMessages: Message[] = [];

  let messageBatch = await getMessageBatch(vouchChannel);

  let hasNotReachedLastProcessedVouch = true;
  while (hasNotReachedLastProcessedVouch) {
    let messageBatchArray = [...messageBatch.array()];

    if (isLastProcessedVouchIdInLatestMessageBatch(messageBatchArray, lastProcessedVouchId)) {
      messageBatchArray = sliceBatchUpToLastProcessedVouch(messageBatchArray, lastProcessedVouchId);
      hasNotReachedLastProcessedVouch = false;
    }

    unprocessedMessages = prependLatestMessageBatchToUnprocessedMessages(messageBatchArray, unprocessedMessages);

    if (hasNotReachedLastProcessedVouch) {
      messageBatch = await getMessageBatch(vouchChannel, unprocessedMessages[0].id);
    }
  }

  return unprocessedMessages;
}

function prependLatestMessageBatchToUnprocessedMessages(messageBatchArray: Message[], unprocessedMessages: Message[]) {
  messageBatchArray.reverse();
  return [...messageBatchArray, ...unprocessedMessages];
}

async function getMessageBatch(channel: TextChannel, beforeMessageId: string | null = null) {
  let query: { limit: number; before?: string } = { limit: 100 };
  if (!!beforeMessageId) {
    query = { ...query, before: beforeMessageId };
  }

  return await channel.messages.fetch(query);
}

function sliceBatchUpToLastProcessedVouch(messageBatchArray: Message[], lastProcessedVouchId: string) {
  const lastProcessedIndex = messageBatchArray.findIndex((x) => x.id === lastProcessedVouchId);
  messageBatchArray = messageBatchArray.slice(0, lastProcessedIndex);
  return messageBatchArray;
}

function isLastProcessedVouchIdInLatestMessageBatch(messageBatchArray: Message[], lastProcessedVouchId: string) {
  return !!messageBatchArray.find((x) => x.id === lastProcessedVouchId);
}
