/**
 * Mobile port of frontend/src/utils/productConstant.js
 * Keep in sync with PRODUCT_TYPE_UNIT_CONFIG in the frontend.
 * Unit values are English strings matching what the backend stores.
 */

type UnitConfig = {
  units: string[];
  defaultUnit: string;
  dynamicPrice?: boolean;
};

export const PRODUCT_TYPE_UNIT_CONFIG: Record<string, UnitConfig> = {
  SERVICE:      { units: ['session', 'hour', 'visit'],                                        defaultUnit: 'session' },
  JEWELRY:      { units: ['chi'],                                                              defaultUnit: 'chi',   dynamicPrice: true },
  WATCH:        { units: ['piece'],                                                            defaultUnit: 'piece'  },
  FOOD:         { units: ['piece', 'kg', 'gram', 'pack', 'bag', 'box', 'can', 'bottle'],      defaultUnit: 'piece'  },
  BEVERAGE:     { units: ['bottle', 'can', 'pack', 'liter', 'ml', 'box'],                     defaultUnit: 'bottle' },
  DRUG:         { units: ['piece', 'box', 'tube', 'pack', 'bottle'],                          defaultUnit: 'box'    },
  HEALTH:       { units: ['piece', 'box', 'tube', 'pack', 'bottle', 'bag'],                   defaultUnit: 'piece'  },
  CLOTHING:     { units: ['piece', 'pack'],                                                    defaultUnit: 'piece'  },
  ELECTRONICS:  { units: ['piece', 'box'],                                                     defaultUnit: 'piece'  },
  APPLIANCES:   { units: ['piece', 'box'],                                                     defaultUnit: 'piece'  },
  FURNITURE:    { units: ['piece'],                                                             defaultUnit: 'piece'  },
  BIKE:         { units: ['piece'],                                                             defaultUnit: 'piece'  },
  HARDWARE:     { units: ['piece', 'box', 'pack', 'kg', 'roll'],                              defaultUnit: 'piece'  },
  AUTO_PARTS:   { units: ['piece', 'box'],                                                     defaultUnit: 'piece'  },
  SPORTS:       { units: ['piece', 'pack', 'box'],                                             defaultUnit: 'piece'  },
  TOYS:         { units: ['piece', 'pack', 'box'],                                             defaultUnit: 'piece'  },
  BOOKS:        { units: ['piece', 'pack', 'box'],                                             defaultUnit: 'piece'  },
  OFFICE:       { units: ['piece', 'pack', 'box', 'roll'],                                    defaultUnit: 'piece'  },
  PET:          { units: ['piece', 'pack', 'bag', 'box', 'kg'],                               defaultUnit: 'piece'  },
  BEAUTY:       { units: ['piece', 'box', 'tube', 'bottle', 'pack'],                          defaultUnit: 'piece'  },
  CONVENIENCE:  { units: ['piece', 'pack', 'bag', 'box', 'can', 'bottle', 'kg', 'gram'],      defaultUnit: 'piece'  },
};

export const ALL_UNITS = [
  'piece', 'box', 'bottle', 'can', 'pack', 'bag', 'kg', 'gram', 'mg',
  'liter', 'ml', 'chi', 'tael', 'carat', 'tube', 'bar', 'roll',
  'session', 'hour', 'visit',
] as const;

export type UnitValue = typeof ALL_UNITS[number];

/** Returns the allowed units for a product type, or ALL_UNITS if the type has no config. */
export function getUnitsForType(typeCode: string | null | undefined): string[] {
  if (!typeCode) return [...ALL_UNITS];
  return PRODUCT_TYPE_UNIT_CONFIG[typeCode]?.units ?? [...ALL_UNITS];
}

/** Returns the default unit for a product type. */
export function getDefaultUnit(typeCode: string | null | undefined): string {
  if (!typeCode) return 'piece';
  return PRODUCT_TYPE_UNIT_CONFIG[typeCode]?.defaultUnit ?? 'piece';
}

/** Returns true if this product type uses a dynamic (live market) price. */
export function isDynamicPriceType(typeCode: string | null | undefined): boolean {
  if (!typeCode) return false;
  return PRODUCT_TYPE_UNIT_CONFIG[typeCode]?.dynamicPrice === true;
}

// ─── Onboarding unit picker ───────────────────────────────────────────────────
// Vietnamese display labels + i18n keys shown during shop setup (Step2Screen).
// Separate from PRODUCT_TYPE_UNIT_CONFIG which holds English backend values.

export type UnitDef = { value: string; i18nKey: string };

export const ONBOARDING_UNITS: UnitDef[] = [
  // physical
  { value: 'Cái',   i18nKey: 'onboarding.step2.units.cai' },
  { value: 'Hộp',   i18nKey: 'onboarding.step2.units.hop' },
  { value: 'Chai',  i18nKey: 'onboarding.step2.units.chai' },
  { value: 'Túi',   i18nKey: 'onboarding.step2.units.tui' },
  { value: 'Bộ',    i18nKey: 'onboarding.step2.units.bo' },
  { value: 'Đôi',   i18nKey: 'onboarding.step2.units.doi' },
  { value: 'Cuộn',  i18nKey: 'onboarding.step2.units.cuon' },
  { value: 'Tờ',    i18nKey: 'onboarding.step2.units.to_sheet' },
  // weight / volume
  { value: 'Kg',    i18nKey: 'onboarding.step2.units.kg' },
  { value: 'Gram',  i18nKey: 'onboarding.step2.units.gram' },
  { value: 'Lít',   i18nKey: 'onboarding.step2.units.lit' },
  { value: 'Mét',   i18nKey: 'onboarding.step2.units.met' },
  // service / time
  { value: 'Lần',   i18nKey: 'onboarding.step2.units.lan' },
  { value: 'Lượt',  i18nKey: 'onboarding.step2.units.luot' },
  { value: 'Buổi',  i18nKey: 'onboarding.step2.units.buoi' },
  { value: 'Giờ',   i18nKey: 'onboarding.step2.units.gio' },
  { value: 'Ngày',  i18nKey: 'onboarding.step2.units.ngay' },
  { value: 'Tháng', i18nKey: 'onboarding.step2.units.thang' },
  // food & drink
  { value: 'Phần',  i18nKey: 'onboarding.step2.units.phan' },
  { value: 'Suất',  i18nKey: 'onboarding.step2.units.suat' },
  { value: 'Ly',    i18nKey: 'onboarding.step2.units.ly' },
  { value: 'Tô',    i18nKey: 'onboarding.step2.units.to_bowl' },
  { value: 'Dĩa',   i18nKey: 'onboarding.step2.units.dia' },
];

export const DEFAULT_ONBOARDING_UNIT = 'Cái';

/** Units surfaced first per shop type code — everything else follows. */
export const SHOP_TYPE_UNIT_PRIORITY: Record<string, string[]> = {
  CONVENIENCE_STORE: ['Cái', 'Hộp', 'Chai', 'Túi', 'Kg', 'Gram', 'Lít'],
  FOOD_BEVERAGE:     ['Kg', 'Gram', 'Lít', 'Hộp', 'Chai', 'Túi', 'Cái'],
  RESTAURANT:        ['Phần', 'Suất', 'Tô', 'Dĩa', 'Ly', 'Hộp', 'Kg', 'Gram'],
  COFFEE_SHOP:       ['Ly', 'Phần', 'Chai', 'Hộp', 'Lít'],
  FASHION:           ['Cái', 'Bộ', 'Đôi', 'Mét', 'Cuộn'],
  ELECTRONICS:       ['Cái', 'Bộ', 'Hộp'],
  BARBER_SHOP:       ['Lần', 'Lượt', 'Buổi', 'Giờ', 'Cái', 'Bộ'],
  BARBER_SHOP_MEN:   ['Lần', 'Lượt', 'Buổi', 'Giờ', 'Cái', 'Bộ'],
  HAIR_SALON:        ['Lần', 'Lượt', 'Buổi', 'Giờ', 'Cái', 'Bộ'],
  NAIL_SHOP:         ['Lần', 'Ngón', 'Bộ', 'Lượt', 'Buổi'],
  LASH_PMU_STUDIO:   ['Lần', 'Lượt', 'Buổi', 'Cái'],
  SPA_SHOP:          ['Lần', 'Buổi', 'Giờ', 'Liệu trình', 'Lượt'],
  MASSAGE_SHOP:      ['Lần', 'Buổi', 'Giờ', 'Liệu trình', 'Lượt'],
  BEAUTY_CLINIC:     ['Lần', 'Buổi', 'Giờ', 'Liệu trình', 'Lượt'],
  MAKEUP_STUDIO:     ['Lần', 'Lượt', 'Buổi', 'Giờ'],
  PHARMACY:          ['Cái', 'Hộp', 'Chai', 'Gram'],
  JEWELRY:           ['Cái', 'Bộ', 'Gram', 'Kg'],
  PAWN_SHOP:         ['Cái', 'Bộ', 'Gram', 'Kg'],
  OTHER:             ['Lần', 'Lượt', 'Buổi', 'Cái', 'Hộp', 'Chai', 'Túi'],
};
