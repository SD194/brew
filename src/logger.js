const isDev = import.meta.env.DEV;

export function logInfo(...args) {
  if (isDev) console.info(...args);
}

export function logWarn(...args) {
  console.warn(...args);
}

export function logError(...args) {
  console.error(...args);
}
