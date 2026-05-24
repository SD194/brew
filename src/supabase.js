import { createClient } from '@supabase/supabase-js';
import { appConfig, hasSupabaseConfig } from './config.js';
import { logWarn } from './logger.js';

if (!hasSupabaseConfig()) {
  logWarn('Supabase is not configured. The customer app will use demo/fallback data.');
}

export const supabase = createClient(
  appConfig.supabaseUrl || 'https://placeholder.supabase.co',
  appConfig.supabaseAnonKey || 'placeholder'
);

export const isConfigured = hasSupabaseConfig;
