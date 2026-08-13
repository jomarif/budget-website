// Currency helpers. USD for v1; centralized so it's easy to make configurable later.

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatMoney(amount) {
  return formatter.format(amount || 0);
}

export function formatMoneyCompact(amount) {
  return compactFormatter.format(amount || 0);
}

export function sum(numbers) {
  return numbers.reduce((total, n) => total + (Number(n) || 0), 0);
}
