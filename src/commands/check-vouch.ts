import { formatDistanceToNow } from 'date-fns';
import { Client, Message, MessageEmbed } from 'discord.js';
import { Repository } from 'typeorm';

import { Vouch } from '../entities/vouch';
import { MessageCommand } from './command.base';

const colors = {
  positive: 752646,
  neutral: 12501004,
  negative: 11472912,
};

export class CheckVouchCommand extends MessageCommand {
  constructor(private client: Client, private vouchRepository: Repository<Vouch>) {
    super({
      command: '?vouch',
      regex: /\?vouch <@\!?(\d+)>.*/,
      requiresPrefix: false,
    });
  }

  async execute(message: Message): Promise<void> {
    if (!super.canExecute(message)) {
      return;
    }

    const user = this.getUserFromMessage(message.content);

    if (!user) {
      return;
    }

    const userInfo = await this.client.users.fetch(user);

    const vouches: Vouch[] = await this.vouchRepository.find({ vouchedId: user });
    const vouchSummary = this.getVouchSummary(vouches);

    const embed = new MessageEmbed()
      .setColor(this.getEmbedColor(vouchSummary))
      .setTitle(`${userInfo.username}#${userInfo.discriminator}'s Report`)
      .addField('Total Vouches', vouchSummary.positive - vouchSummary.negative, true)
      .addField('Positive', vouchSummary.positive, true)
      .addField('Negative', vouchSummary.negative, true)
      .addField('Unique Vouchers', vouchSummary.uniqueVouchers, true)
      .addField('\u200b', '\u200b', true)
      .addField('\u200b', '\u200b', true)
      .addField('Account Age', `created ${formatDistanceToNow(userInfo.createdAt, { includeSeconds: true })} ago`, true);

    try {
      const guildUserInfo = message.guild?.member(userInfo.id);
      if (guildUserInfo?.joinedAt != null) {
        embed.addField('Server Age', `joined ${formatDistanceToNow(guildUserInfo.joinedAt, { includeSeconds: true })} ago`, true);
      } else {
        embed.addField('Server Age', 'Could not find information on user', true);
      }
    } catch {
      embed.addField('Server Age', 'User is not currently on our server', true);
    }

    embed.addField('---', `Have issues with the report? Let us know in <#${process.env.SUGGESTIONS_CHANNEL_ID}>!`);

    await message.channel.send(embed);
  }

  private getEmbedColor(vouchSummary: VouchSummary): number {
    const total = vouchSummary.positive - vouchSummary.negative;

    if (total > 0) {
      return colors.positive;
    } else if (total < 0) {
      return colors.negative;
    } else {
      return colors.neutral;
    }
  }

  private getVouchSummary(vouches: Vouch[]): VouchSummary {
    return {
      uniqueVouchers: vouches.reduce((set, vouch) => set.add(vouch.voucherId), new Set()).size,
      positive: vouches.filter((vouch) => vouch.amount > 0).reduce((sum, vouch) => vouch.amount + sum, 0),
      negative: Math.abs(vouches.filter((vouch) => vouch.amount < 0).reduce((sum, vouch) => vouch.amount + sum, 0)),
    };
  }

  private getUserFromMessage(message: string): string | null {
    const matches = this.regex.exec(message);
    if (!matches) {
      return null;
    }

    return matches[1].trim();
  }
}

interface VouchSummary {
  uniqueVouchers: number;
  positive: number;
  negative: number;
}
