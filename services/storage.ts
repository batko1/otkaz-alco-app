import { DailyReport, UserSettings, TriggerStat } from './types';
import { TRIGGERS } from '../constants';

const STORAGE_KEY = 'otkaz_alco_reports';
const SETTINGS_KEY = 'otkaz_alco_settings';

// --- Telegram Cloud Storage Helpers ---

// CloudStorage introduced in v6.9
const isCloudStorageSupported = (): boolean => {
  return window.Telegram?.WebApp?.isVersionAtLeast 
    ? window.Telegram.WebApp.isVersionAtLeast('6.9') 
    : false;
};

const cloudStorage = {
  getItem: (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      // 1. Check support checks
      if (!isCloudStorageSupported()) {
        resolve(null);
        return;
      }
      
      // 2. Safety check for object existence
      if (!window.Telegram?.WebApp?.CloudStorage) {
        resolve(null);
        return;
      }

      try {
        window.Telegram.WebApp.CloudStorage.getItem(key, (err, value) => {
          if (err) {
            console.warn('CloudStorage Get Error (ignored):', err);
            resolve(null); // Fail gracefully, fallback to local
          } else {
            resolve(value || null);
          }
        });
      } catch (e) {
        console.warn('CloudStorage exception:', e);
        resolve(null);
      }
    });
  },
  setItem: (key: string, value: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!isCloudStorageSupported()) {
        resolve(false);
        return;
      }

      if (!window.Telegram?.WebApp?.CloudStorage) {
        resolve(false);
        return;
      }

      try {
        window.Telegram.WebApp.CloudStorage.setItem(key, value, (err) => {
          if (err) {
            console.warn('CloudStorage Set Error (ignored):', err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (e) {
        console.warn('CloudStorage exception:', e);
        resolve(false);
      }
    });
  }
};

// --- Reports ---

export const saveReport = async (report: DailyReport): Promise<DailyReport[]> => {
  // 1. Get current data (try memory/local first for speed)
  const existingDataStr = localStorage.getItem(STORAGE_KEY);
  let reports: DailyReport[] = existingDataStr ? JSON.parse(existingDataStr) : [];
  
  // 2. Update local array
  const index = reports.findIndex(r => r.date === report.date);
  if (index >= 0) {
    reports[index] = report;
  } else {
    reports.unshift(report);
  }
  
  const jsonStr = JSON.stringify(reports);

  // 3. Save to LocalStorage (Instant)
  localStorage.setItem(STORAGE_KEY, jsonStr);

  // 4. Save to CloudStorage (Async backup, silent fail allowed)
  // Note: CloudStorage has a 4096 char limit per key. 
  // For a production app with years of data, you would need to split keys or use an external DB.
  // For this MVP, we save what we can.
  if (jsonStr.length < 4096) {
      await cloudStorage.setItem(STORAGE_KEY, jsonStr);
  } else {
      console.warn("Data exceeds CloudStorage limit. Saving only to LocalStorage.");
  }
  
  return reports;
};

export const getReports = async (): Promise<DailyReport[]> => {
  // Strategy: 
  // 1. Load from LocalStorage immediately for UI speed.
  // 2. In background/init, check CloudStorage.
  // 3. If Cloud has more data, merge it.
  
  const localStr = localStorage.getItem(STORAGE_KEY);
  
  // Attempt cloud fetch, but don't block too long if it fails/unsupported
  const cloudStr = await cloudStorage.getItem(STORAGE_KEY);
  
  let localData: DailyReport[] = localStr ? JSON.parse(localStr) : [];
  let cloudData: DailyReport[] = cloudStr ? JSON.parse(cloudStr) : [];

  if (cloudData.length > localData.length) {
    // Basic merge strategy: prefer Cloud if it has more records
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
    return cloudData;
  }

  // If local has data but cloud is empty (first sync or cloud unsupported), try to push to cloud
  if (localData.length > 0 && cloudData.length === 0) {
      const jsonStr = JSON.stringify(localData);
      if (jsonStr.length < 4096) {
        cloudStorage.setItem(STORAGE_KEY, jsonStr);
      }
  }

  return localData.length > 0 ? localData : cloudData;
};

// --- Settings ---

export const saveSettings = async (settings: UserSettings) => {
  const jsonStr = JSON.stringify(settings);
  localStorage.setItem(SETTINGS_KEY, jsonStr);
  await cloudStorage.setItem(SETTINGS_KEY, jsonStr);
};

export const getSettings = async (): Promise<UserSettings> => {
  const today = new Date().toISOString().split('T')[0];
  const defaultSettings: UserSettings = { 
      costPerDay: 500, 
      currency: '₽',
      startDate: today // Default to today if new user
  };

  const localStr = localStorage.getItem(SETTINGS_KEY);
  const cloudStr = await cloudStorage.getItem(SETTINGS_KEY);
  
  // Cloud wins for settings if available, to sync preferences across devices
  if (cloudStr) {
    try {
        const cloudSettings = JSON.parse(cloudStr);
        // Merge with default to ensure new fields (like startDate) exist if old data format
        const merged = { ...defaultSettings, ...cloudSettings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)); 
        return merged;
    } catch (e) {
        console.error("Error parsing cloud settings", e);
    }
  }
  
  if (localStr) {
      try {
        const localSettings = JSON.parse(localStr);
        return { ...defaultSettings, ...localSettings };
      } catch (e) {
          console.error("Error parsing local settings", e);
      }
  }

  return defaultSettings;
};

// --- Stats Helpers (Synchronous for UI derivation) ---

export const calculateStats = (reports: DailyReport[]) => {
  if (reports.length === 0) return { totalDays: 0, currentStreak: 0, bestStreak: 0, relapseCount: 0 };

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let relapseCount = 0;

  // Best streak & total relapses
  // Create a copy and sort by date Ascending
  const sortedReports = [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedReports.forEach(r => {
    if (!r.didDrink) {
      tempStreak++;
    } else {
      relapseCount++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
      tempStreak = 0;
    }
  });
  if (tempStreak > bestStreak) bestStreak = tempStreak;

  // Current streak (counting backwards from today/most recent)
  // reports is usually Newest First
  const newestFirst = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  for (const r of newestFirst) {
      if (!r.didDrink) {
          currentStreak++;
      } else {
          break;
      }
  }

  return {
    totalDays: reports.length,
    currentStreak,
    bestStreak,
    relapseCount
  };
};

export const calculateTriggerStats = (reports: DailyReport[]): TriggerStat[] => {
  const statsMap = new Map<string, number>();
  const relevantReports = reports.filter(r => r.didDrink || r.cravingLevel > 3);

  relevantReports.forEach(r => {
    if (r.triggers) {
      r.triggers.forEach(tId => {
        const key = tId.trim();
        statsMap.set(key, (statsMap.get(key) || 0) + 1);
      });
    }
  });

  const result: TriggerStat[] = [];
  statsMap.forEach((count, key) => {
    const standard = TRIGGERS.find(t => t.id === key);
    if (standard) {
      result.push({ id: standard.id, label: standard.label, emoji: standard.emoji, count });
    } else {
      result.push({ id: key, label: key, emoji: '⚡', count });
    }
  });

  return result.sort((a, b) => b.count - a.count);
};
