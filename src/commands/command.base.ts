import { Message } from 'discord.js';

interface MessageCommandConfig {
  command: string;
  regex: RegExp;
  requiresPrefix?: boolean;
}

export abstract class MessageCommand {
  readonly on = 'message';
  protected readonly command: string;
  protected readonly regex: RegExp;
  private readonly requiresPrefix: boolean;

  constructor(config: MessageCommandConfig) {
    this.command = config.command;
    this.regex = config.regex;
    this.requiresPrefix = config.requiresPrefix ?? true;
  }

  protected canExecute(message: Message): boolean {
    if (message.author.bot) {
      return false;
    }

    if (message.channel.id !== `${process.env.VOUCH_CHANNEL_ID}` && message.channel.id !== `${process.env.COMMANDS_CHANNEL_ID}`) {
      return false;
    }

    const prefix = process.env.PREFIX ?? '';

    return this.hasValidPrefix(message.content, prefix) && this.isValidCommand(message.content, prefix);
  }

  private hasValidPrefix(message: string, prefix: string): boolean {
    const isValidPrefixedCommand = this.requiresPrefix && message.startsWith(`${prefix}${this.command}`);
    const isValidBareCommand = !this.requiresPrefix && message.startsWith(`${this.command}`);

    return isValidPrefixedCommand || isValidBareCommand;
  }

  private isValidCommand(message: string, prefix: string): boolean {
    let content = message;
    if (this.requiresPrefix) {
      content = message.substring(prefix.length);
    }

    return this.regex.test(content);
  }
}
