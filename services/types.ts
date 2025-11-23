export interface TriggerItem {
  id: string;
  label: string;
  emoji: string;
}

export interface DailyReport {
  date: string;
  didDrink: boolean; // false = sober, true = relapse
  moodLevel: number; // 0-10
  cravingLevel: number; // 0-10
  triggers: string[];
  note: string;
  // New fields for relapse tracking
  alcoholType?: string;
  alcoholAmount?: string;
}

export interface UserSettings {
  costPerDay: number; // Average money spent on alcohol per day
  currency: string;   // 'RUB', 'USD', 'EUR', etc.
}

export interface TriggerStat {
  id: string;
  label: string;
  emoji: string;
  count: number;
}

export type StatusType = 'sober' | 'relapse';