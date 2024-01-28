import { addDays, differenceInDays, formatDistance, formatDistanceToNow } from 'date-fns';
import { Client, GuildMember, Message, MessageEmbed, MessageMentions, TextChannel, User } from 'discord.js';

import { Vouch } from '../entities/vouch';
import { VouchRepository } from '../repositories/vouch.repository';

const colors = {
  positive: 752646,
  warning: 12501004,
  negative: 11472912,
};

export class CheckVouchCommandHandler {
  private readonly command = /^\?\s*(?:\d+|v|vouche?)\s+<@!?(\d{17,19})>\s*$/;

  constructor(
    private client: Client,
    private vouchRepository: VouchRepository,
  ) {}

  async handle(message: Message): Promise<void> {
    if (
      this.isMessageFromBot(message.author) ||
      this.hasEveryoneMentioned(message.mentions) ||
      this.isMessageSentInDisallowedChannel(message.channel.id) ||
      this.isMessageNotInCommandFormat(message.content)
    ) {
      return;
    }

    const userId = this.getUserToCheckFromMessage(message.content);
    if (!userId) {
      return;
    }

    const user = await this.getUserInfo(userId);
    if (!user) {
      return;
    }

    const vouchSummary = await this.vouchRepository.getVouchSummary(userId);
    const guildUserInfo = message.guild?.member(userId) ?? null;
    const guildUserJoinDate = guildUserInfo?.joinedAt ?? null;

    const embed = new MessageEmbed()
      .setColor(this.getEmbedColor(vouchSummary.vouchScore, vouchSummary.uniqueVouchers, guildUserJoinDate))
      .setTitle(this.buildTitle(user, guildUserInfo))
      .setDescription(`<@${user.id}>`);

    const description = this.getEmbedDescription(guildUserJoinDate, vouchSummary.uniqueVouchers);
    if (description !== '') {
      embed.addField('⚠️ Use caution when trading', description);
    }

    embed
      .addField('Vouch Score', vouchSummary.vouchScore, true)
      .addField('Positive', vouchSummary.positiveVouches, true)
      .addField('Negative', vouchSummary.negativeVouches, true)
      .addField('Unique Vouchers', vouchSummary.uniqueVouchers);

    if (vouchSummary.recentPositiveVouches.length > 0) {
      embed.addField(
        'Recent Positive Vouches',
        await this.getRecentVouchesEmbedField(vouchSummary.recentPositiveVouches, message.channel as TextChannel),
      );
    }

    if (vouchSummary.recentNegativeVouches.length > 0) {
      embed.addField(
        'Recent Negative Vouches',
        await this.getRecentVouchesEmbedField(vouchSummary.recentNegativeVouches, message.channel as TextChannel),
      );
    }

    embed
      .addField('Account Age', `created ${formatDistanceToNow(user.createdAt, { includeSeconds: true, addSuffix: true })}`, true)
      .addField('Server Age', this.getServerAgeInfo(guildUserInfo), true)
      .addField('---', `Have issues with the report? Let us know in <#${process.env.SUGGESTIONS_CHANNEL_ID as string}>!`);

    await message.channel.send(embed);
  }

  private buildTitle(user: User, guildUserInfo: GuildMember | null): string {
    let title = `@${user.username}#${user.discriminator}`;

    if (!!guildUserInfo && !!guildUserInfo.nickname) {
      title = `${title} (aka ${guildUserInfo.nickname})`;
    }

    return `${title}'s Report`;
  }

  private async getRecentVouchesEmbedField(vouches: Vouch[], channel: TextChannel): Promise<string> {
    let vouchList: string[] = [];

    for (const vouch of vouches) {
      const date = formatDistanceToNow(vouch.updatedAt, { includeSeconds: true, addSuffix: true });
      let reason = vouch.reason;

      if (reason.length > 30) {
        reason = `${vouch.reason.substring(0, 30)}...`;
      }

      try {
        const message = await channel.messages.fetch(vouch.messageId);
        vouchList = [...vouchList, `[${date} by](${message.url})  <@${vouch.voucherId}>: *${reason}*`];
      } catch {
        vouchList = [...vouchList, `[${date} by @${vouch.voucherId}: *${reason}*`];
      }
    }

    return vouchList.join('\n');
  }

  private getServerAgeInfo(guildUserInfo: GuildMember | null): string {
    if (guildUserInfo?.joinedAt) {
      return `joined ${formatDistanceToNow(guildUserInfo.joinedAt, { includeSeconds: true, addSuffix: true })}`;
    } else {
      return `User isn't on our server`;
    }
  }

  private getEmbedDescription(joinDate: Date | null, uniqueVouches: number): string {
    let description: string[] = [];

    if (joinDate != null && this.isNewToServer(joinDate)) {
      description = [
        ...description,
        `• User is new to our server. This warning will disappear in ${formatDistance(new Date(), addDays(joinDate, 7), {
          includeSeconds: true,
        })}.`,
      ];
    }

    if (this.hasEnoughUniqueVouches(uniqueVouches)) {
      description = [...description, `• User is new to trading. This warning will disappear when the user reaches 5 unique vouchers.`];
    }

    return description.join('\n');
  }

  private getEmbedColor(vouchScore: number, uniqueVouchers: number, joinDate: Date | null): number {
    if (this.isNotOnServer(joinDate) || this.isNewToServer(joinDate as Date)) {
      return colors.warning;
    }

    if (this.hasEnoughUniqueVouches(uniqueVouchers) || vouchScore == 0) {
      return colors.warning;
    }

    return vouchScore > 0 ? colors.positive : colors.negative;
  }

  private isNotOnServer(joinDate: Date | null) {
    return joinDate === null;
  }

  private isNewToServer(joinDate: Date) {
    return differenceInDays(new Date(), joinDate) < 90;
  }

  private hasEnoughUniqueVouches(uniqueVouchers: number) {
    return uniqueVouchers < 5;
  }

  private getUserToCheckFromMessage(message: string): string | null {
    const regex = new RegExp(this.command, 'gim');

    const matches = regex.exec(message);
    if (!matches) {
      return null;
    }

    return matches[1].trim();
  }

  hasEveryoneMentioned(mentions: MessageMentions): boolean {
    return mentions.everyone;
  }

  private isMessageFromBot(user: User) {
    return user.bot;
  }

  private isMessageSentInDisallowedChannel(channelId: string) {
    return channelId !== `${process.env.VOUCH_CHANNEL_ID as string}`;
  }

  private isMessageNotInCommandFormat(message: string): boolean {
    const regex = new RegExp(this.command, 'gim');
    return !regex.test(message);
  }

  private async getUserInfo(id: string): Promise<User | null> {
    try {
      return await this.client.users.fetch(id);
    } catch {
      console.log(`Failed to fetch user with id: ${id}`);
      return null;
    }
  }
}
