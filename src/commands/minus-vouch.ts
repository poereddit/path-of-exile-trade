import { addMinutes, differenceInMinutes, formatDistance } from 'date-fns';
import { Client, Message, User } from 'discord.js';
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

  async execute(message: Message, options: ExecuteOptions = { warnUser: true }): Promise<void> {
    if (!super.canExecute(message)) {
      return;
    }

    const parsedMessage = this.parseMessageForVouch(message.content);
    if (!parsedMessage) {
      return;
    }

    const userInfo = await this.client.users.fetch(parsedMessage.user);
    if (message.author.id === userInfo.id) {
      if (options.warnUser) {
        message.react('❌');
        message.channel.send(`Nice try, <@${message.author.id}>! Vouching yourself isn't allowed.`);
      }

      return;
    }

    if (this.hasBlankVouchReason(parsedMessage.reason)) {
      if (options.warnUser) {
        message.react('❌');
        message.channel.send(
          `A reason is necessary to vouch ${userInfo.username}#${userInfo.discriminator}. Try again with the command \`+vouch @${userInfo.username}#${userInfo.discriminator} <reason>\`.`
        );
      }

      return;
    }

    if (this.isNotAMemberOfGuild(message, userInfo)) {
      if (options.warnUser) {
        message.react('❌');
        message.channel.send(`Couldn't add a vouch for ${userInfo.username}#${userInfo.discriminator} because they aren't on our server.`);
      }

      return;
    }

    const lastVouchForUserByAuthor = await this.vouchRepository.findOne({
      where: {
        vouchedId: parsedMessage.user,
        voucherId: message.author.id,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (lastVouchForUserByAuthor) {
      const lastVouch = await message.channel.messages.fetch(lastVouchForUserByAuthor.messageId);

      if (this.hasEnoughTimePastSinceLastVouchFromAuthorToUser(lastVouch.createdAt, message.createdAt)) {
        if (options.warnUser) {
          message.react('❌');
          message.channel.send(
            `You can't vouch ${userInfo.username}#${
              userInfo.discriminator
            } because you vouched them too recently. You can vouch them again in ${formatDistance(
              new Date(),
              addMinutes(lastVouch.createdAt, 10),
              {
                includeSeconds: true,
              }
            )}.`
          );
        }

        return;
      }
    }

    await this.saveVouch(message, parsedMessage);
    message.react('✅');
  }

  private hasEnoughTimePastSinceLastVouchFromAuthorToUser(createdAt: Date, vouchAttemptCreatedAt: Date) {
    return differenceInMinutes(vouchAttemptCreatedAt, createdAt) < 10;
  }

  private hasBlankVouchReason(reason: string) {
    return reason.trim() === '';
  }

  private isNotAMemberOfGuild(message: Message, userInfo: User) {
    return !message.guild?.member(userInfo);
  }

  private async saveVouch(message: Message, parsedMessage: { user: string; reason: string }) {
    const now = new Date();

    const vouch = this.vouchRepository.create({
      messageId: message.id,
      voucherId: message.author.id,
      vouchedId: parsedMessage.user,
      reason: parsedMessage.reason,
      amount: -1,
      createdAt: now,
      updatedAt: now,
    });

    await this.vouchRepository.save(vouch);
  }

  private parseMessageForVouch(message: string): { user: string; reason: string } | null {
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

interface ExecuteOptions {
  warnUser: boolean;
}
