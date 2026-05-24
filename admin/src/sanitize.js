const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ESCAPE_MAP[char]);
}

export function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export function formatCurrency(value) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `₹${amount.toLocaleString('en-IN')}`;
}
