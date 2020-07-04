import { formatDistanceToNow } from 'date-fns';
import { Client, Message, MessageEmbed } from 'discord.js';
import { Repository } from 'typeorm';

import { Vouch } from '../entities/vouch';
import { MessageCommand } from './command.base';

export class CheckRepCommand extends MessageCommand {
  constructor(private client: Client, private vouchRepository: Repository<Vouch>) {
    super({
      command: '?rep',
      regex: /\?rep <@\!?(\d+)>.*/,
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

    const vouches: Vouch[] = await this.vouchRepository.find({ vouchedId: user });
    const userInfo = await this.client.users.fetch(user);

    const embed = new MessageEmbed()
      .setColor(752646)
      .setTitle(`Reputation report for ${userInfo.username}`)
      .addField(
        'Total Reputation',
        vouches.reduce((sum, vouch) => vouch.amount + sum, 0),
        true
      )
      .addField(
        'Positive',
        vouches.filter((vouch) => vouch.amount > 0).reduce((sum, vouch) => vouch.amount + sum, 0),
        true
      )
      .addField(
        'Negative',
        vouches.filter((vouch) => vouch.amount < 0).reduce((sum, vouch) => vouch.amount + sum, 0),
        true
      )
      .addField('Unique Vouchers', vouches.reduce((set, vouch) => set.add(vouch.voucherId), new Set()).size, true)
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

    await message.channel.send(embed);
  }

  private getUserFromMessage(message: string): string | null {
    const matches = this.regex.exec(message);
    if (!matches) {
      return null;
    }

    return matches[1].trim();
  }
}
