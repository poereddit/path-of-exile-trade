import { DMChannel, Message, NewsChannel, PartialMessage, TextChannel } from 'discord.js';

import { VouchRepository } from '../../repositories/vouch.repository';

export class DeleteVouchEvent {
  constructor(private vouchRepository: VouchRepository) {}

  async handle(message: Message | PartialMessage): Promise<void> {
    if (this.isNotInVouchChannel(message.channel)) {
      return;
    }

    await this.vouchRepository.deleteVouch(message.id);
  }

  private isNotInVouchChannel(channel: TextChannel | DMChannel | NewsChannel) {
    return channel.id !== `${process.env.VOUCH_CHANNEL_ID}`;
  }
}
