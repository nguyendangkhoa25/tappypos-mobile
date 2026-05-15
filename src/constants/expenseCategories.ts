export const EXPENSE_CATEGORIES = [
  'RENT',
  'ELECTRICITY',
  'WATER',
  'INTERNET',
  'PHONE',
  'SUPPLIES',
  'EQUIPMENT',
  'MARKETING',
  'SALARY_EXTRA',
  'TRANSPORT',
  'PACKAGING',
  'SOFTWARE',
  'CLEANING',
  'TAX',
  'BANK_FEE',
  'INSURANCE',
  'MAINTENANCE',
  'FOOD_STAFF',
  'OTHER',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// F&B shops buy ingredients/supplies daily — put those costs at the top.
export const FB_SHOP_TYPES = [
  'RESTAURANT', 'COFFEE_SHOP', 'FOOD_BEVERAGE',
  'PUB', 'PUB_SEAFOOD', 'PUB_GOAT', 'PUB_BEEF', 'STREET_FOOD',
];

export const FB_CATEGORY_ORDER: ExpenseCategory[] = [
  'SUPPLIES', 'TRANSPORT', 'FOOD_STAFF', 'PACKAGING', 'SALARY_EXTRA',
  'RENT', 'ELECTRICITY', 'WATER', 'INTERNET', 'PHONE',
  'EQUIPMENT', 'MARKETING', 'CLEANING', 'SOFTWARE',
  'TAX', 'BANK_FEE', 'INSURANCE', 'MAINTENANCE', 'OTHER',
];

export const CATEGORY_EMOJI: Record<string, string> = {
  RENT:         '🏠',
  ELECTRICITY:  '⚡',
  WATER:        '💧',
  INTERNET:     '📶',
  PHONE:        '📱',
  SUPPLIES:     '📦',
  EQUIPMENT:    '🔧',
  MARKETING:    '📣',
  SALARY_EXTRA: '👥',
  TRANSPORT:    '🛵',
  PACKAGING:    '🛍️',
  SOFTWARE:     '💻',
  CLEANING:     '🧹',
  TAX:          '🏛️',
  BANK_FEE:     '🏦',
  INSURANCE:    '🛡️',
  MAINTENANCE:  '🔩',
  FOOD_STAFF:   '🍜',
  OTHER:        '🏷️',
};
