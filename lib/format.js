const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const compactInr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatINR = (amount) => inr.format(amount);
export const formatCompactINR = (amount) => compactInr.format(amount);

// Transaction dates are calendar days stored at UTC midnight, so they are
// formatted from the string itself; going through Date would shift them by timezone.
export function formatDate(iso) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function formatDayMonth(iso) {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${day} ${MONTHS[month - 1]}`;
}

export function formatMonth(yearMonth) {
  const [year, month] = yearMonth.split("-");
  return `${MONTHS[month - 1]} ${year}`;
}

// A Date's local calendar day as YYYY-MM-DD.
export function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export const PERIODS = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "this-year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

// Periods cover whole calendar months so planned, future-dated entries count.
export function getPeriodRange(period, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const span = (start, end) => ({ from: toDateKey(start), to: toDateKey(end) });

  switch (period) {
    case "this-month":
      return span(new Date(year, month, 1), new Date(year, month + 1, 0));
    case "last-month":
      return span(new Date(year, month - 1, 1), new Date(year, month, 0));
    case "last-3-months":
      return span(new Date(year, month - 2, 1), new Date(year, month + 1, 0));
    case "this-year":
      return span(new Date(year, 0, 1), new Date(year, 11, 31));
    default:
      return {};
  }
}
