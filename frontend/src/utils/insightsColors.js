// Chart colors for the Insights tab. recharts takes raw color values via
// props (not CSS var()), so every hex pair here is resolved in JS against
// the active theme rather than referenced as a CSS custom property.
//
// Status-family colors (green/amber/yellow/red/blue/gray) are lifted
// verbatim from the app's existing .badge-* classes (frontend/src/index.css)
// so a chart slice always agrees with the badge shown for that same value
// elsewhere in the app. Colors with no badge precedent (single-series bars,
// the CM/PM trend lines) use the dataviz skill's validated categorical
// palette (slot 1 blue, slot 2 green).

const HUE = {
  green:  { light: '#16a34a', dark: '#4ade80' },
  amber:  { light: '#c2410c', dark: '#fbbf24' },
  yellow: { light: '#a16207', dark: '#facc15' },
  red:    { light: '#dc2626', dark: '#f87171' },
  blue:   { light: '#1d4ed8', dark: '#60a5fa' },
  gray:   { light: '#6b7280', dark: '#a3a3a3' },
};

// dataviz skill reference palette — categorical slot 1 (blue) / slot 2 (green)
const SERIES_1 = { light: '#2a78d6', dark: '#3987e5' };
const SERIES_2 = { light: '#008300', dark: '#008300' };

const hex = (pair, dark) => (dark ? pair.dark : pair.light);

export const STATUS_COLOR_HUE = {
  'On Track': 'green',
  'In Progress - Minor Issues': 'amber',
  'In Progress - Major Issues': 'red',
  'Completed': 'blue',
  'Not Started': 'gray',
};

export const HANDOVER_COLOR_HUE = {
  'Not Started': 'gray',
  'Transfer Knowledge': 'amber',
  'Completed': 'blue',
};

export const BAST_COLOR_HUE = {
  'Billed': 'green',
  'In Progress': 'yellow',
  'Pending': 'gray',
};

export const REQUEST_STATUS_COLOR_HUE = {
  'Open': 'red',
  'In Progress': 'amber',
  'Resolved': 'green',
};

export const EXPIRY_BUCKET_COLOR_HUE = {
  expired: 'red',
  within30: 'amber',
  within90: 'blue',
  beyond90: 'green',
};

export function hueColor(hueName, dark) {
  return hex(HUE[hueName] || HUE.gray, dark);
}

export function seriesColor(index, dark) {
  return hex([SERIES_1, SERIES_2][index] || SERIES_1, dark);
}

export const CHART_CHROME = {
  grid: { light: '#e1e0d9', dark: '#2c2c2a' },
  axis: { light: '#c3c2b7', dark: '#383835' },
  mutedText: { light: '#898781', dark: '#898781' },
};

export function chromeColor(role, dark) {
  return hex(CHART_CHROME[role], dark);
}
