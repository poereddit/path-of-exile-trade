import { addMinutes, differenceInMinutes, formatDistance } from 'date-fns';
import { Client, Message, MessageMentions, TextChannel, User } from 'discord.js';

import { VouchRepository } from '../repositories/vouch.repository';

interface PlusVouchCommand {
  vouchedId: string;
  reason: string;
}

interface HandleOptions {
  react: boolean;
  alertUser: boolean;
}

export class PlusVouchCommandHandler {
  private readonly command = /^(\+\s*(\d+|v|vouche?)\s+<@!?(\d{17,19})>|<@!?(\d{17,19})>\s+\+\s*\d+)(.*)$/;

  constructor(private client: Client, private vouchRepository: VouchRepository) {}

  async handle(message: Message, handleOptions: HandleOptions = { react: true, alertUser: true }): Promise<void> {
    if (
      this.isMessageFromBot(message.author) ||
      this.hasEveryoneMentioned(message.mentions) ||
      this.isMessageSentInDisallowedChannel(message.channel.id) ||
      this.isMessageNotInCommandFormat(message.content)
    ) {
      return;
    }

    const parsedCommand = this.parseCommand(message.content);
    const vouchedUserInfo = await this.getUserInfo(parsedCommand.vouchedId);
    if (!vouchedUserInfo) {
      return;
    }

    if (this.hasMultipleMentionsInMessage(message.mentions)) {
      this.alertUserForMessageWithMultipleUserMentions(message.author, message.channel as TextChannel, handleOptions);
      return;
    }

    if (await this.isVouchedUserNotAMemberOfGuild(message, vouchedUserInfo)) {
      this.alertUserForVouchingUserNotAMemberOfGuild(
        message.author,
        message.channel as TextChannel,
        message,
        vouchedUserInfo,
        handleOptions
      );
      return;
    }

    if (this.isAuthorVouchingSelf(message.author.id, vouchedUserInfo.id)) {
      this.alertUserForSelfVouch(message.author, message.channel as TextChannel, message, handleOptions);
      return;
    }

    if (this.isVouchMissingReason(parsedCommand.reason)) {
      this.alertUserForVouchMissingReason(message, message.channel as TextChannel, message.author, vouchedUserInfo, handleOptions);
      return;
    }

    if (await this.hasNotEnoughTimePassedSinceLastVouchForVouchedByVoucher(message.author, vouchedUserInfo, message.createdAt)) {
      this.alertUserForVouchingTooSoon(message, message.channel as TextChannel, message.author, vouchedUserInfo, handleOptions);
      return;
    }

    const vouch = {
      messageId: message.id,
      voucherId: message.author.id,
      vouchedId: vouchedUserInfo.id,
      reason: parsedCommand.reason,
      amount: 1,
      createdAt: message.createdAt,
      updatedAt: message.createdAt,
    };

    await this.vouchRepository.saveVouch(vouch);
    if (handleOptions.react) {
      message.react('✅');
    }
  }

  hasEveryoneMentioned(mentions: MessageMentions): boolean {
    return mentions.everyone;
  }

  private async alertUserForVouchingTooSoon(
    message: Message,
    channel: TextChannel,
    author: User,
    vouchedUserInfo: User,
    handleOptions: HandleOptions
  ): Promise<void> {
    const lastVouchForUserByAuthor = await this.getLastVouchTimeForVouchedByVoucher(author, vouchedUserInfo);

    if (!lastVouchForUserByAuthor) {
      return;
    }

    if (handleOptions.react) {
      message.react('❌');
    }

    if (handleOptions.alertUser) {
      channel.send(
        `<@${author.id}>, you can't vouch ${vouchedUserInfo.username}#${
          vouchedUserInfo.discriminator
        } because you vouched them too recently. You can vouch them again in ${formatDistance(
          new Date(),
          addMinutes(lastVouchForUserByAuthor, 10),
          {
            includeSeconds: true,
          }
        )}.`
      );
    }
  }

  private async alertUserForVouchMissingReason(
    message: Message,
    channel: TextChannel,
    author: User,
    vouchedUserInfo: User,
    handleOptions: HandleOptions
  ): Promise<void> {
    if (handleOptions.react) {
      message.react('❌');
    }

    if (handleOptions.alertUser) {
      channel.send(
        `<@${author.id}>, a reason is necessary to vouch ${vouchedUserInfo.username}#${vouchedUserInfo.discriminator}. Try again with the command \`+vouch @${vouchedUserInfo.username}#${vouchedUserInfo.discriminator} <reason>\`.`
      );
    }
  }

  private async alertUserForVouchingUserNotAMemberOfGuild(
    author: User,
    channel: TextChannel,
    message: Message,
    vouchedUserInfo: User,
    handleOptions: HandleOptions
  ): Promise<void> {
    if (handleOptions.react) {
      message.react('❌');
    }

    if (handleOptions.alertUser) {
      channel.send(
        `<@${author.id}>, I couldn't add a vouch for ${vouchedUserInfo.username}#${vouchedUserInfo.discriminator} because they aren't on our server.`
      );
    }
  }

  private async alertUserForMessageWithMultipleUserMentions(
    author: User,
    channel: TextChannel,
    handleOptions: HandleOptions
  ): Promise<void> {
    if (handleOptions.alertUser) {
      channel.send(`<@${author.id}>, you may only vouch 1 user at a time.`);
    }
  }

  private async alertUserForSelfVouch(author: User, channel: TextChannel, message: Message, handleOptions: HandleOptions): Promise<void> {
    if (handleOptions.react) {
      message.react('❌');
    }

    if (handleOptions.alertUser) {
      channel.send(`Nice try, <@${author.id}>! Vouching yourself isn't allowed.`);
    }
  }

  private async hasNotEnoughTimePassedSinceLastVouchForVouchedByVoucher(
    voucher: User,
    vouched: User,
    messageCreatedAt: Date
  ): Promise<boolean> {
    const lastVouchForUserByAuthor = await this.getLastVouchTimeForVouchedByVoucher(voucher, vouched);

    if (!lastVouchForUserByAuthor) {
      return false;
    }

    return differenceInMinutes(messageCreatedAt, lastVouchForUserByAuthor) < 10;
  }

  private async getLastVouchTimeForVouchedByVoucher(voucher: User, vouched: User): Promise<Date | null> {
    const lastVouchForUserByAuthor = await this.vouchRepository.findLastVouchForVouchedByVoucher({
      vouchedId: vouched.id,
      voucherId: voucher.id,
    });

    return lastVouchForUserByAuthor?.createdAt ?? null;
  }

  private isVouchMissingReason(reason: string) {
    return reason.trim() === '';
  }

  private async isVouchedUserNotAMemberOfGuild(message: Message, user: User) {
    try {
      const guildMember = await message.guild?.members.fetch(user);
      return !guildMember;
    } catch {
      console.log(`Attempt to vouch someone outside guild.\nMessage:\n${message.content}`);
      return true;
    }
  }

  private async getUserInfo(id: string): Promise<User | null> {
    try {
      return await this.client.users.fetch(id);
    } catch {
      console.log(`Failed to fetch user with id: ${id}`);
      return null;
    }
  }

  private isAuthorVouchingSelf(authorId: string, vouchedId: string) {
    return authorId === vouchedId;
  }

  private isMessageFromBot(user: User) {
    return user.bot;
  }

  private isMessageSentInDisallowedChannel(channelId: string) {
    return channelId !== `${process.env.VOUCH_CHANNEL_ID}`;
  }

  private isMessageNotInCommandFormat(message: string): boolean {
    const regex = new RegExp(this.command, 'gi');
    return !regex.test(message);
  }

  private hasMultipleMentionsInMessage(mentions: MessageMentions): boolean {
    return mentions.users.size > 1;
  }

  private parseCommand(message: string): PlusVouchCommand {
    const regex = new RegExp(this.command, 'gi');
    const matches = regex.exec(message) as RegExpExecArray;

    const vouchedId = this.getVouchedId(matches);

    return {
      vouchedId,
      reason: matches[5].trim(),
    };
  }

  private getVouchedId(matches: RegExpExecArray) {
    if (!!matches[3]) {
      return matches[3].trim();
    }

    return matches[4].trim();
  }
}
