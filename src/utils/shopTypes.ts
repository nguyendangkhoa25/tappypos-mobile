export type ShopTypeGroup = {
  id: string;
  emoji: string;
};

export const SHOP_TYPE_GROUPS: ShopTypeGroup[] = [
  { id: 'FOOD',        emoji: '🍽️' },
  { id: 'DRINKS',      emoji: '☕' },
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
  { id: 'BANH_MI',       emoji: '🥖', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'EATERY',        emoji: '🍱', backendCode: 'RESTAURANT',        group: 'FOOD' },
  { id: 'RESTAURANT',    emoji: '🍽️', backendCode: 'RESTAURANT',        group: 'FOOD' },
  // Đồ uống
  { id: 'CAFE',          emoji: '☕', backendCode: 'COFFEE_SHOP',       group: 'DRINKS' },
  { id: 'BUBBLE_TEA',    emoji: '🧋', backendCode: 'COFFEE_SHOP',       group: 'DRINKS' },
  { id: 'JUICE_BAR',     emoji: '🥤', backendCode: 'COFFEE_SHOP',       group: 'DRINKS' },
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
  { id: 'MENS_BARBER',   emoji: '💇‍♂️', backendCode: 'BARBER_SHOP',       group: 'BEAUTY' },
  { id: 'HAIR_SALON',    emoji: '💇', backendCode: 'BARBER_SHOP',       group: 'BEAUTY' },
  { id: 'NAIL_STUDIO',   emoji: '💅', backendCode: 'BARBER_SHOP',       group: 'BEAUTY' },
  { id: 'SPA',           emoji: '🧖', backendCode: 'BARBER_SHOP',       group: 'BEAUTY' },
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
  PAWN_SHOP: 'PAWN_SHOP',
};

export function getBackendCode(shopTypeCode: string | null | undefined): string {
  if (!shopTypeCode) return 'OTHER';
  return BACKEND_CODE_MAP[shopTypeCode] ?? shopTypeCode;
}
