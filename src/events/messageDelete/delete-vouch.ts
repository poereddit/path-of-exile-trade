import { DMChannel, Message, NewsChannel, PartialMessage, TextChannel } from 'discord.js';

import { VouchRepository } from '../../repositories/vouch.repository';
import { ReforgePoeService } from '../../services/reforge-poe.service';

export class DeleteVouchEvent {
  constructor(private vouchRepository: VouchRepository, private reforgePoeService: ReforgePoeService) {}

  async handle(message: Message | PartialMessage): Promise<void> {
    if (this.isNotInVouchChannel(message.channel)) {
      return;
    }

    await this.vouchRepository.deleteVouch(message.id);
    await this.reforgePoeService.deleteVouch(message.id);
  }

  private isNotInVouchChannel(channel: TextChannel | DMChannel | NewsChannel) {
    return channel.id !== `${process.env.VOUCH_CHANNEL_ID}`;
  }
}
