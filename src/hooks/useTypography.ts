import { useFontSizeStore } from '../store/fontSizeStore';
import type { FontScale } from '../store/fontSizeStore';

export type Typography = {
  // For the single dominant number per screen (style prop)
  displaySize: number;
  displayLineHeight: number;
  // className strings — append color/spacing classes as needed
  heading: string;      // screen title, major KPI values
  section: string;      // sheet/modal titles, card headers
  body: string;         // primary list data (amounts)
  label: string;        // tabs, sub-labels, buttons (semibold)
  labelBold: string;    // item names, strong labels (bold)
  caption: string;      // dates, hints, metadata
  captionBold: string;  // section headers, uppercase labels
  inputSize: string;    // TextInput font size only (no weight)
};

const SCALES: Record<FontScale, Typography> = {
  // Small — compact, shows more info per screen (like Order/Expenses screens)
  small: {
    displaySize: 26,
    displayLineHeight: 34,
    heading: 'text-lg font-black',       // 18px  (Normal: 24px)
    section: 'text-sm font-bold',         // 14px  (Normal: 18px)
    body: 'text-sm font-bold',            // 14px  (Normal: 16px)
    label: 'text-xs font-semibold',       // 12px  (Normal: 14px)
    labelBold: 'text-xs font-bold',       // 12px  (Normal: 14px)
    caption: 'text-xs',                   // 12px  (same)
    captionBold: 'text-xs font-bold',     // 12px  (same)
    inputSize: 'text-sm',                 // 14px
  },
  // Normal — default, matches current Report screen design
  normal: {
    displaySize: 36,
    displayLineHeight: 44,
    heading: 'text-2xl font-black',       // 24px
    section: 'text-lg font-bold',         // 18px
    body: 'text-base font-bold',          // 16px
    label: 'text-base font-semibold',     // 16px
    labelBold: 'text-base font-bold',     // 16px
    caption: 'text-sm',                   // 14px
    captionBold: 'text-sm font-bold',     // 14px
    inputSize: 'text-base',               // 16px
  },
  // Large — accessibility-friendly, significantly bigger
  large: {
    displaySize: 48,
    displayLineHeight: 58,
    heading: 'text-4xl font-black',       // 36px  (Normal: 24px — +50%)
    section: 'text-2xl font-bold',        // 24px  (Normal: 18px — +33%)
    body: 'text-xl font-bold',            // 20px  (Normal: 16px — +25%)
    label: 'text-lg font-semibold',       // 18px  (Normal: 14px — +29%)
    labelBold: 'text-lg font-bold',       // 18px  (Normal: 14px — +29%)
    caption: 'text-base',                 // 16px  (Normal: 12px — +33%)
    captionBold: 'text-base font-bold',   // 16px  (Normal: 12px — +33%)
    inputSize: 'text-lg',                 // 18px
  },
};

export function useTypography(): Typography {
  const { fontScale } = useFontSizeStore();
  return SCALES[fontScale];
}
