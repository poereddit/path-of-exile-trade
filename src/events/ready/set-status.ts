import { ClientUser } from 'discord.js';

export function setStatus(bot: ClientUser | null): void {
  void bot?.setActivity('Path of Hideout', { type: 'PLAYING' });
}
