import { Vouch } from '../entities/vouch';

export interface VouchSummary {
  uniqueVouchers: number;
  vouchScore: number;
  positiveVouches: number;
  negativeVouches: number;
  recentPositiveVouches: Vouch[];
  recentNegativeVouches: Vouch[];
}
