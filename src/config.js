export const DEFAULT_TABLE_NUMBER = 1;
const MAX_TABLE_NUMBER = 20;

function readEnv(name) {
  return import.meta.env[name]?.trim() || '';
}

function getTableNumber() {
  const path = window.location.pathname;
  const match = path.match(/^\/(\d+)\/?$/);
  
  if (match) {
    const tableNumber = Number.parseInt(match[1], 10);
    if (Number.isInteger(tableNumber) && tableNumber > 0 && tableNumber <= MAX_TABLE_NUMBER) {
      return tableNumber;
    }
  }
  
  return null;
}

export const appConfig = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY'),
  tableNumber: getTableNumber(),
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
