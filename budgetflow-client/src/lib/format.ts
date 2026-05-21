export function formatCurrency(value: number) {
  const prefix = value < 0 ? "-Rp " : "Rp ";
  return `${prefix}${new Intl.NumberFormat("id-ID").format(Math.abs(value))}`;
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1
  }).format(value)}%`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function getProgress(current: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(Math.round((current / target) * 100), 100);
}
