import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ── Root ──────────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  ForceUpdate: { currentVersion: string; minVersion: string };
  Auth: undefined;
  Onboarding: undefined;
  App: undefined;
};

// ── Auth stack ────────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  ShopId: undefined;
  Login: { noTenantRequired?: boolean } | undefined;
  Register: undefined;
  PinLogin: undefined;
  PinSetup: { isFirstSetup: boolean; pendingAccessToken?: string; pendingRefreshToken?: string };
  ForgotPin: undefined;
  ForgotPassword: { prefillPhone?: string };
  ForgotShopId: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

// ── Onboarding stack ──────────────────────────────────────────────────────────

export type OnboardingStackParamList = {
  ShopType: undefined;
  Step1: undefined;
  Step2: undefined;
  Step3: undefined;
  Step4: undefined;
};

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

// ── App tab navigator ─────────────────────────────────────────────────────────

export type AppTabParamList = {
  Home: undefined;
  Sell: undefined;
  Expenses: undefined;
  Report: undefined;
  More: undefined;
};

export type AppTabScreenProps<T extends keyof AppTabParamList> =
  BottomTabScreenProps<AppTabParamList, T>;

// ── Home stack (Dashboard + Customer management) ─────────────────────────────

export type HomeStackParamList = {
  Dashboard: undefined;
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
  CustomerForm: { customerId?: string };
};

export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

// ── Nested stacks inside app ──────────────────────────────────────────────────

export type SellingStackParamList = {
  POSMain: undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string; orderNumber: string; total: number };
  OrderList: undefined;
  OrderDetail: { orderId: string };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  ProfileUpdate: undefined;
  ChangePassword: undefined;
  ShopInfo: undefined;
  POSConfig: undefined;
  DefaultExpenses: undefined;
  Security: undefined;
  PinSetup: { mode: 'setup' | 'change' };
  Display: undefined;
  TnC: undefined;
  ActivityLog: undefined;
  DeleteAccount: undefined;
  NotificationPreferences: undefined;
  Feedback: undefined;
  FeedbackHistory: undefined;
  Subscription: undefined;
  BankAccounts: undefined;
  // Tools (moved from tab bar)
  UtilitiesHub: undefined;
  CurrencyConverter: undefined;
  InterestCalculator: undefined;
  LoanCalculator: undefined;
  TaxCalculator: undefined;
  BillSplitter: undefined;
  BudgetRule: undefined;
  Breakeven: undefined;
};

// ── Modal stacks (over tab bar, from overflow menu) ───────────────────────────

export type CustomerStackParamList = {
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
  CustomerForm: { customerId?: string };
};

export type InventoryStackParamList = {
  InventoryList: undefined;
};

export type ComboStackParamList = {
  ComboList: undefined;
  ComboEdit: { comboId?: string };
};

export type PrintTemplateStackParamList = {
  PrintTemplateList: undefined;
  PrintTemplateDetail: { templateId: string };
};

export type GoldPriceStackParamList = {
  GoldPriceMain: undefined;
};

export type ProductStackParamList = {
  ProductList: undefined;
  ProductDetail: { productId: string };
  ProductEdit: { productId: string };
  ProductCreate: undefined;
};

export type CategoryStackParamList = {
  CategoryList: undefined;
};

export type MyWorkStackParamList = {
  MyWorkMain: undefined;
  MyWorkHistory: undefined;
};

export type MyWorkScreenProps<T extends keyof MyWorkStackParamList> =
  NativeStackScreenProps<MyWorkStackParamList, T>;

export type ToolsStackParamList = {
  UtilitiesHub: undefined;
  CurrencyConverter: undefined;
  InterestCalculator: undefined;
  LoanCalculator: undefined;
  TaxCalculator: undefined;
  BillSplitter: undefined;
  BudgetRule: undefined;
  Breakeven: undefined;
};

// ── More tab (replaces Settings tab) ─────────────────────────────────────────

export type MoreStackParamList = {
  MoreMain: undefined;
  Products: undefined;
  Categories: undefined;
  Customers: undefined;
  Inventory: undefined;
  Combos: undefined;
  PrintTemplates: undefined;
  GoldPrice: undefined;
  MyWork: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type MoreScreenProps<T extends keyof MoreStackParamList> =
  NativeStackScreenProps<MoreStackParamList, T>;

// ── Convenience screen props ──────────────────────────────────────────────────

export type SellingScreenProps<T extends keyof SellingStackParamList> =
  NativeStackScreenProps<SellingStackParamList, T>;

export type SettingsScreenProps<T extends keyof SettingsStackParamList> =
  NativeStackScreenProps<SettingsStackParamList, T>;

export type CustomerScreenProps<T extends keyof CustomerStackParamList> =
  NativeStackScreenProps<CustomerStackParamList, T>;

export type InventoryScreenProps<T extends keyof InventoryStackParamList> =
  NativeStackScreenProps<InventoryStackParamList, T>;

export type ComboScreenProps<T extends keyof ComboStackParamList> =
  NativeStackScreenProps<ComboStackParamList, T>;

export type PrintTemplateScreenProps<T extends keyof PrintTemplateStackParamList> =
  NativeStackScreenProps<PrintTemplateStackParamList, T>;

export type GoldPriceScreenProps<T extends keyof GoldPriceStackParamList> =
  NativeStackScreenProps<GoldPriceStackParamList, T>;

export type ProductScreenProps<T extends keyof ProductStackParamList> =
  NativeStackScreenProps<ProductStackParamList, T>;

export type ToolsScreenProps<T extends keyof ToolsStackParamList> =
  NativeStackScreenProps<ToolsStackParamList, T>;

// ── Legacy aliases (scaffold compatibility) ───────────────────────────────────
export type POSScreenProps<T extends keyof SellingStackParamList> = SellingScreenProps<T>;
export type OrdersScreenProps<T extends keyof SellingStackParamList> = SellingScreenProps<T>;
export type ProductsScreenProps<T extends keyof ProductStackParamList> = ProductScreenProps<T>;
