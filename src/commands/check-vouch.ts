import { addDays, differenceInDays, formatDistance, formatDistanceToNow } from 'date-fns';
import { Client, GuildMember, Message, MessageEmbed, TextChannel } from 'discord.js';
import { Repository } from 'typeorm';

import { Vouch } from '../entities/vouch';
import { MessageCommand } from './command.base';

const colors = {
  positive: 752646,
  warning: 12501004,
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

    const user = this.getUserToCheckFromMessage(message.content);

    if (!user) {
      return;
    }

    const userInfo = await this.client.users.fetch(user);

    const vouches: Vouch[] = await this.vouchRepository.find({
      where: { vouchedId: user },
      order: {
        createdAt: 'DESC',
      },
    });
    const vouchSummary = this.getVouchSummary(vouches);
    const guildUserInfo = message.guild?.member(userInfo.id) ?? null;
    const guildUserJoinDate = guildUserInfo?.joinedAt ?? null;

    const embed = new MessageEmbed()
      .setColor(this.getEmbedColor(vouchSummary, guildUserJoinDate))
      .setTitle(`${userInfo.username}#${userInfo.discriminator}'s Report`)
      .addField('Vouch Score', vouchSummary.positive - vouchSummary.negative, true)
      .addField('Positive', vouchSummary.positive, true)
      .addField('Negative', vouchSummary.negative, true)
      .addField('Unique Vouchers', vouchSummary.uniqueVouchers);

    if (vouchSummary.uniqueVouchers) {
      embed.addField('Recent Vouches', await this.getRecentVouchesEmbedField(vouches, message.channel as TextChannel));
    }

    embed
      .addField('Account Age', `created ${formatDistanceToNow(userInfo.createdAt, { includeSeconds: true, addSuffix: true })}`, true)
      .addField('Server Age', this.getServerAgeInfo(guildUserInfo), true)
      .addField('---', `Have issues with the report? Let us know in <#${process.env.SUGGESTIONS_CHANNEL_ID}>!`);

    const description = this.getEmbedDescription(guildUserJoinDate, vouchSummary.uniqueVouchers);
    if (description !== '') {
      embed.setDescription(description);
    }

    await message.channel.send(embed);
  }

  async getRecentVouchesEmbedField(vouches: Vouch[], channel: TextChannel): Promise<string> {
    const mostRecentVouches = vouches.slice(0, 5);

    let vouchList = '';

    for (const vouch of mostRecentVouches) {
      const voucher = await this.client.users.fetch(vouch.voucherId);
      let message = null;
      try {
        message = await channel.messages.fetch(vouch.messageId);
      } catch {}
      const date = formatDistanceToNow(vouch.updatedAt, { includeSeconds: true, addSuffix: true });
      const user = `${voucher.username}#${voucher.discriminator}`;
      let reason = vouch.reason;

      if (reason.length > 30) {
        reason = `${vouch.reason.substring(0, 30)}...`;
      }

      if (message) {
        vouchList = `${vouchList}[${date} by @${user}](${message.url}): *${reason}*\n`;
      } else {
        vouchList = `${vouchList}${date} by @${user}: *${reason}*\n`;
      }
    }

    return vouchList;
  }

  private getEmbedDescription(joinDate: Date | null, uniqueVouches: number): string {
    let description = '';

    if (joinDate != null && this.isNewToServer(joinDate)) {
      description += `⚠️ User is new to our server. Please exercise extra caution when trading.\n`;
      description += `This warning will disappear ${formatDistance(addDays(joinDate, 3), new Date(), {
        addSuffix: true,
        includeSeconds: true,
      })}.\n\n`;
    }

    if (this.hasEnoughUniqueVouches(uniqueVouches)) {
      description += `⚠️ User is new to trading. Please exercise extra caution when trading.\n`;
      description += `This warning will disappear when the user reaches 5 unique vouchers.\n\n`;
    }

    return description;
  }

  private getServerAgeInfo(guildUserInfo: GuildMember | null): string {
    if (guildUserInfo?.joinedAt) {
      return `joined ${formatDistanceToNow(guildUserInfo.joinedAt, { includeSeconds: true, addSuffix: true })}`;
    } else {
      return `User isn't on our server`;
    }
  }

  private getEmbedColor(vouchSummary: VouchSummary, joinDate: Date | null): number {
    if (this.isNotOnServer(joinDate) || this.isNewToServer(joinDate as Date)) {
      return colors.warning;
    }

    const vouchScore = vouchSummary.positive - vouchSummary.negative;
    if (this.hasEnoughUniqueVouches(vouchSummary.uniqueVouchers) || vouchScore == 0) {
      return colors.warning;
    }

    return vouchScore > 0 ? colors.positive : colors.negative;
  }

  private hasEnoughUniqueVouches(uniqueVouchers: number) {
    return uniqueVouchers < 5;
  }

  private isNotOnServer(joinDate: Date | null) {
    return joinDate === null;
  }

  private isNewToServer(joinDate: Date) {
    return differenceInDays(new Date(), joinDate) < 7;
  }

  private getVouchSummary(vouches: Vouch[]): VouchSummary {
    return {
      uniqueVouchers: vouches.reduce((set, vouch) => set.add(vouch.voucherId), new Set()).size,
      positive: vouches.filter((vouch) => vouch.amount > 0).reduce((sum, vouch) => vouch.amount + sum, 0),
      negative: Math.abs(vouches.filter((vouch) => vouch.amount < 0).reduce((sum, vouch) => vouch.amount + sum, 0)),
    };
  }

  private getUserToCheckFromMessage(message: string): string | null {
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
