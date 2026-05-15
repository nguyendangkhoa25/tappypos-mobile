export type ShopTypeGroup = {
  id: string;
  emoji: string;
};

export const SHOP_TYPE_GROUPS: ShopTypeGroup[] = [
  { id: 'FOOD',        emoji: '🍽️' },
  { id: 'DRINKS',      emoji: '☕' },
  { id: 'PUB',         emoji: '🍺' },
  { id: 'GROCERY',     emoji: '🏪' },
  { id: 'FASHION',     emoji: '👗' },
  { id: 'BEAUTY',      emoji: '✂️' },
  { id: 'HEALTH',      emoji: '💊' },
  { id: 'GOLD',        emoji: '💍' },
  { id: 'ELECTRONICS', emoji: '📱' },
  { id: 'SERVICES',    emoji: '🛠️' },
];

export type SpecificShopType = {
  id: string;
  emoji: string;
  backendCode: string;
  group: string;
};

export const SPECIFIC_SHOP_TYPES: SpecificShopType[] = [
  // Quán ăn
  { id: 'PHO_SHOP',      emoji: '🍜', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'RICE_SHOP',     emoji: '🍚', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'NOODLE_SHOP',   emoji: '🥢', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'BUN_BO',        emoji: '🥣', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'HOT_POT',       emoji: '🫕', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'LAU_BO',        emoji: '🥩', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'QUAN_DE',       emoji: '🐐', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'BANH_MI',       emoji: '🥖', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'EATERY',        emoji: '🍱', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'RESTAURANT',    emoji: '🍽️', backendCode: 'RESTAURANT',        group: 'FOOD' },
  // Đồ uống
  { id: 'CAFE',          emoji: '☕', backendCode: 'COFFEE_SHOP',       group: 'DRINKS' },
  { id: 'BUBBLE_TEA',    emoji: '🧋', backendCode: 'COFFEE_SHOP',       group: 'DRINKS' },
  { id: 'JUICE_BAR',     emoji: '🥤', backendCode: 'COFFEE_SHOP',       group: 'DRINKS' },
  // Quán nhậu
  { id: 'PUB',           emoji: '🍺', backendCode: 'PUB',               group: 'PUB' },
  { id: 'PUB_SEAFOOD',   emoji: '🦞', backendCode: 'PUB_SEAFOOD',       group: 'PUB' },
  { id: 'PUB_GOAT',      emoji: '🐐', backendCode: 'PUB_GOAT',          group: 'PUB' },
  { id: 'PUB_BEEF',      emoji: '🐄', backendCode: 'PUB_BEEF',          group: 'PUB' },
  // Tạp hóa & Thực phẩm
  { id: 'GROCERY',       emoji: '🏪', backendCode: 'CONVENIENCE_STORE', group: 'GROCERY' },
  { id: 'MINI_MART',     emoji: '🛒', backendCode: 'CONVENIENCE_STORE', group: 'GROCERY' },
  { id: 'VEGETABLE_SHOP',emoji: '🥬', backendCode: 'FOOD_BEVERAGE',     group: 'GROCERY' },
  { id: 'MEAT_SHOP',     emoji: '🥩', backendCode: 'FOOD_BEVERAGE',     group: 'GROCERY' },
  { id: 'BAKERY',        emoji: '🍞', backendCode: 'FOOD_BEVERAGE',     group: 'GROCERY' },
  // Thời trang
  { id: 'CLOTHING',      emoji: '👗', backendCode: 'FASHION',           group: 'FASHION' },
  { id: 'SHOE_SHOP',     emoji: '👟', backendCode: 'FASHION',           group: 'FASHION' },
  { id: 'ACCESSORIES',   emoji: '👜', backendCode: 'FASHION',           group: 'FASHION' },
  // Làm đẹp
  { id: 'MENS_BARBER',   emoji: '💇‍♂️', backendCode: 'BARBER_SHOP_MEN',  group: 'BEAUTY' },
  { id: 'HAIR_SALON',    emoji: '💇',   backendCode: 'HAIR_SALON',       group: 'BEAUTY' },
  { id: 'NAIL_STUDIO',   emoji: '💅',   backendCode: 'NAIL_SHOP',        group: 'BEAUTY' },
  { id: 'SPA',           emoji: '🧖',   backendCode: 'SPA_SHOP',         group: 'BEAUTY' },
  { id: 'LASH_PMU',      emoji: '👁️',   backendCode: 'LASH_PMU_STUDIO',  group: 'BEAUTY' },
  { id: 'MASSAGE',       emoji: '🤲',   backendCode: 'MASSAGE_SHOP',     group: 'BEAUTY' },
  { id: 'BEAUTY_CLINIC', emoji: '🏥',   backendCode: 'BEAUTY_CLINIC',    group: 'BEAUTY' },
  { id: 'MAKEUP_STUDIO', emoji: '💄',   backendCode: 'MAKEUP_STUDIO',    group: 'BEAUTY' },
  // Y tế
  { id: 'PHARMACY',      emoji: '💊', backendCode: 'PHARMACY',          group: 'HEALTH' },
  { id: 'TRAD_MEDICINE', emoji: '🌿', backendCode: 'PHARMACY',          group: 'HEALTH' },
  // Vàng & Cầm đồ
  { id: 'JEWELRY',       emoji: '💍', backendCode: 'JEWELRY',           group: 'GOLD' },
  { id: 'PAWN',          emoji: '🏦', backendCode: 'PAWN_SHOP',         group: 'GOLD' },
  // Điện tử
  { id: 'PHONE_SHOP',    emoji: '📱', backendCode: 'ELECTRONICS',       group: 'ELECTRONICS' },
  { id: 'COMPUTER_SHOP', emoji: '💻', backendCode: 'ELECTRONICS',       group: 'ELECTRONICS' },
  { id: 'APPLIANCES',    emoji: '⚡', backendCode: 'ELECTRONICS',       group: 'ELECTRONICS' },
  // Dịch vụ
  { id: 'CAR_WASH',      emoji: '🚗', backendCode: 'OTHER',             group: 'SERVICES' },
  { id: 'LAUNDRY',       emoji: '🧺', backendCode: 'OTHER',             group: 'SERVICES' },
  { id: 'PET_SHOP',      emoji: '🐾', backendCode: 'OTHER',             group: 'SERVICES' },
  { id: 'FLOWER_SHOP',   emoji: '🌺', backendCode: 'OTHER',             group: 'SERVICES' },
  { id: 'STATIONERY',    emoji: '📚', backendCode: 'OTHER',             group: 'SERVICES' },
  { id: 'GYM',           emoji: '🏋️', backendCode: 'OTHER',             group: 'SERVICES' },
  { id: 'OTHER',         emoji: '🏷️', backendCode: 'OTHER',             group: 'SERVICES' },
];

// Maps any shop type id (specific or broad backend code) → backend API code
const BACKEND_CODE_MAP: Record<string, string> = {
  ...Object.fromEntries(SPECIFIC_SHOP_TYPES.map((s) => [s.id, s.backendCode])),
  // Broad codes pass through as-is (backward compat for existing drafts)
  CONVENIENCE_STORE: 'CONVENIENCE_STORE',
  FOOD_BEVERAGE: 'FOOD_BEVERAGE',
  COFFEE_SHOP: 'COFFEE_SHOP',
  FASHION: 'FASHION',
  ELECTRONICS: 'ELECTRONICS',
  BARBER_SHOP: 'BARBER_SHOP',
  BARBER_SHOP_MEN: 'BARBER_SHOP_MEN',
  HAIR_SALON: 'HAIR_SALON',
  NAIL_SHOP: 'NAIL_SHOP',
  LASH_PMU_STUDIO: 'LASH_PMU_STUDIO',
  SPA_SHOP: 'SPA_SHOP',
  MASSAGE_SHOP: 'MASSAGE_SHOP',
  BEAUTY_CLINIC: 'BEAUTY_CLINIC',
  MAKEUP_STUDIO: 'MAKEUP_STUDIO',
  PAWN_SHOP: 'PAWN_SHOP',
  RESTAURANT: 'RESTAURANT',
  PUB: 'PUB',
  PUB_SEAFOOD: 'PUB_SEAFOOD',
  PUB_GOAT: 'PUB_GOAT',
  PUB_BEEF: 'PUB_BEEF',
};

export function getBackendCode(shopTypeCode: string | null | undefined): string {
  if (!shopTypeCode) return 'OTHER';
  return BACKEND_CODE_MAP[shopTypeCode] ?? shopTypeCode;
}

export const FB_BACKEND_CODES = new Set([
  'RESTAURANT', 'COFFEE_SHOP', 'FOOD_BEVERAGE',
  'PUB', 'PUB_SEAFOOD', 'PUB_GOAT', 'PUB_BEEF',
]);

export function isFnbShop(backendCode: string | null | undefined): boolean {
  if (!backendCode) return false;
  return FB_BACKEND_CODES.has(backendCode);
}
