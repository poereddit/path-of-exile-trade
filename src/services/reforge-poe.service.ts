import got from 'got';

import { Vouch } from '../entities/vouch';

export class ReforgePoeService {
  constructor(private url: string, private token: string) {}

  async sendVouch(vouch: Partial<Vouch>): Promise<void> {
    if (!vouch.messageId || !vouch.vouchedId || !vouch.voucherId || !vouch.amount || !vouch.reason) {
      return;
    }

    const request: ReforgePoePostVouchRequest = {
      originId: vouch.messageId,
      buyer: vouch.vouchedId,
      seller: vouch.voucherId,
      serviceType: 'other',
      isNegative: vouch.amount < 0,
      detail: vouch.reason,
      token: this.token,
    };

    await got.post(`${this.url}/vouch`, {
      responseType: 'json',
      json: request,
    });
  }

  async deleteVouch(messageId: string): Promise<void> {
    const request: ReforgePoeDeleteVouchRequest = {
      originId: messageId,
      token: this.token,
    };

    await got.post(`${this.url}/delete-vouch`, {
      responseType: 'json',
      json: request,
    });
  }
}

export interface ReforgePoePostVouchRequest {
  originId: string;
  buyer: string;
  seller: string;
  serviceType: 'other';
  isNegative: boolean;
  detail: string;
  token: string;
}

export interface ReforgePoeDeleteVouchRequest {
  originId: string;
  token: string;
}
