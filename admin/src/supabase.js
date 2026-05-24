import { createClient } from '@supabase/supabase-js';
import { adminConfig, hasSupabaseConfig } from './config.js';

export const supabase = createClient(
  adminConfig.supabaseUrl || 'https://placeholder.supabase.co',
  adminConfig.supabaseAnonKey || 'placeholder'
);

export const isConfigured = hasSupabaseConfig;
