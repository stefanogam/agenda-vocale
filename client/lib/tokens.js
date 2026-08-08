// client/lib/tokens.js
export const tokens = {
  bg: "#1B2333",
  surface: "#232C42",
  surface2: "#2C3654",
  border: "#334066",
  textPrimary: "#F5F3EE",
  textSecondary: "#94A0BD",
  amber: "#F0A868",
  coral: "#E8735F",
  sage: "#7FA87F",
  periwinkle: "#8AA0E8",
  teal: "#6FB3AE",
  violet: "#B98BD6",
};

export const SWATCHES = [tokens.periwinkle, tokens.coral, tokens.sage, tokens.amber, tokens.teal, tokens.violet, "#D8C36B", "#7FA0C4"];

export const REMINDER_OPTIONS = [15, 30, 60, 1440];
export function reminderLabel(min) {
  if (min < 60) return `${min} min prima`;
  if (min < 1440) return `${min / 60} ora prima`;
  return `${min / 1440} giorno prima`;
}
