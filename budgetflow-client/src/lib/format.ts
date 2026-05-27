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

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteDiffInSeconds = Math.abs(diffInSeconds);

  if (absoluteDiffInSeconds < 60) {
    return "Just now";
  }

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60]
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const [unit, secondsPerUnit] =
    units.find(([, seconds]) => absoluteDiffInSeconds >= seconds) ?? units[units.length - 1];

  return formatter.format(Math.round(diffInSeconds / secondsPerUnit), unit);
}

export function getProgress(current: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(Math.round((current / target) * 100), 100);
}
