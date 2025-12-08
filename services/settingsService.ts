
import { AppSettings } from '../types';

// This service is now largely deprecated in favor of Supabase persistence in supabaseService.ts
// Kept minimal to avoid breaking imports if any remain, but returns defaults.

export const getSettings = (): AppSettings => {
  return {
    companyName: 'نظام إدارة الموردين',
    logoUrl: '',
    adminPassword: '1234'
  };
};

export const saveSettings = (settings: AppSettings): void => {
  // No-op: Settings are now saved via supabaseService
  console.log('Settings saving via settingsService is deprecated. Use supabaseService.');
};
