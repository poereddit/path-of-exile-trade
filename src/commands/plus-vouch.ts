import { Client, Message } from 'discord.js';
import { Repository } from 'typeorm';

import { Vouch } from '../entities/vouch';
import { MessageCommand } from './command.base';

export class PlusVouchCommand extends MessageCommand {
  constructor(private client: Client, private vouchRepository: Repository<Vouch>) {
    super({
      command: '+vouch',
      regex: /\+vouch\s+<@\!?(\d+)>(.*)/,
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

    const userInfo = await this.client.users.fetch(parsedMessage.user);

    if (message.author.id === userInfo.id) {
      message.channel.send(`Nice try, <@${message.author.id}>! Vouching yourself isn't allowed.`);

      return;
    }

    if (message.guild?.member(userInfo)) {
      const now = new Date();

      const vouch = this.vouchRepository.create({
        voucherId: message.author.id,
        vouchedId: parsedMessage.user,
        reason: parsedMessage.reason,
        amount: 1,
        createdAt: now.toUTCString(),
        updatedAt: now.toUTCString(),
      });

      await this.vouchRepository.save(vouch);

      message.react('✅');
    } else {
      message.react('❌');
      message.channel.send(`Could not add a vouch for ${userInfo.username}#${userInfo.discriminator} because they are not on our server.`);
    }
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
