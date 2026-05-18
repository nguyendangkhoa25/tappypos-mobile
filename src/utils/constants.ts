export const PAGE_SIZE = 20;

export const APP_STORE_URL = 'https://apps.apple.com/app/tappypos/id000000000';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=vn.tappypos';

export const SUPPORT = {
  phone: '0901234567',
  email: 'support@tappypos.vn',
  zaloOA: 'https://zalo.me/tappypos',
  website: 'https://tappypos.vn',
} as const;

export const SHOP_TYPES = [
  { code: 'PHO_SHOP', name: 'Quán phở', emoji: '🍜', tenantPrefix: 'pho' },
  { code: 'BARBER_SHOP', name: 'Tiệm cắt tóc', emoji: '💈', tenantPrefix: 'toc' },
  { code: 'CAFE', name: 'Quán cà phê', emoji: '☕', tenantPrefix: 'cf' },
  { code: 'GROCERY', name: 'Cửa hàng tạp hóa', emoji: '🏪', tenantPrefix: 'tg' },
  { code: 'BAKERY', name: 'Tiệm bánh', emoji: '🥐', tenantPrefix: 'bm' },
  { code: 'RESTAURANT', name: 'Quán ăn', emoji: '🍽️', tenantPrefix: 'qa' },
  { code: 'FASHION', name: 'Thời trang', emoji: '👗', tenantPrefix: 'tt' },
  { code: 'JEWELRY', name: 'Tiệm vàng / Cầm đồ', emoji: '💍', tenantPrefix: 'vang' },
  { code: 'OTHER', name: 'Khác', emoji: '🏬', tenantPrefix: 'shop' },
] as const;

export const JEWELRY_SHOP_TYPE_CODE = 'JEWELRY';
