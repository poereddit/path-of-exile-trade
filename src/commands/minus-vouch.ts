import { Client, Message } from 'discord.js';
import { Repository } from 'typeorm';

import { Vouch } from '../entities/vouch';
import { MessageCommand } from './command.base';

export class MinusVouchCommand extends MessageCommand {
  constructor(private client: Client, private vouchRepository: Repository<Vouch>) {
    super({
      command: '-vouch',
      regex: /\-vouch\s+<@\!?(\d+)>(.*)/,
      requiresPrefix: false,
    });
  }

  async execute(message: Message): Promise<void> {
    if (!super.canExecute(message)) {
      return;
    }

    const parsedMessage = this.parseMessage(message.content);

    if (!parsedMessage) {
      return;
    }

    const now = new Date();

    const vouch = this.vouchRepository.create({
      voucherId: message.author.id,
      vouchedId: parsedMessage.user,
      reason: parsedMessage.reason,
      amount: -1,
      createdAt: now.toUTCString(),
      updatedAt: now.toUTCString(),
    });

    await this.vouchRepository.save(vouch);

    await message.react('✅');
  }

  private parseMessage(message: string): { user: string; reason: string } | null {
    const matches = this.regex.exec(message);
    if (!matches) {
      return null;
    }

    return {
      user: matches[1].trim(),
      reason: matches[2].trim(),
    };
  }
}
