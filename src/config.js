const DEFAULT_TABLE_NUMBER = 4;

function readEnv(name) {
  return import.meta.env[name]?.trim() || '';
}

function parseTableNumber(value) {
  const tableNumber = Number.parseInt(value, 10);
  return Number.isInteger(tableNumber) && tableNumber > 0 ? tableNumber : DEFAULT_TABLE_NUMBER;
}

export const appConfig = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY'),
  tableNumber: parseTableNumber(readEnv('VITE_TABLE_NUMBER')),
  razorpayKeyId: readEnv('VITE_RAZORPAY_KEY_ID')
};

export function hasSupabaseConfig(config = appConfig) {
  return Boolean(
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseUrl.includes('YOUR_PROJECT_ID') &&
    !config.supabaseAnonKey.includes('your-public-anon-key')
  );
}
