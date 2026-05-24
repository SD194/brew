function readEnv(name) {
  return import.meta.env[name]?.trim() || '';
}

export const adminConfig = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY'),
  razorpayKeyId: readEnv('VITE_RAZORPAY_KEY_ID')
};

export function hasSupabaseConfig(config = adminConfig) {
  return Boolean(
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseUrl.includes('YOUR_PROJECT_ID') &&
    !config.supabaseAnonKey.includes('your-public-anon-key')
  );
}
