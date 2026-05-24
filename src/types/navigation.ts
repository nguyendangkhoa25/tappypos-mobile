import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CheckInPayload } from '../services/api';

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
  OtpVerify: { phone: string; maskedPhone: string };
  ResetPassword: { resetToken: string };
  ForgotShopId: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

// ── Onboarding stack ──────────────────────────────────────────────────────────

export type OnboardingStackParamList = {
  Welcome: undefined;
  JoinShop: undefined;
  ShopType: undefined;
  Step1: undefined;
  Step2: undefined;
  PawnFeature: undefined;
  PawnInterest: undefined;
  TableSetup: undefined;
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
  CustomerLoyalty: { customerId: string };
};

export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

// ── Nested stacks inside app ──────────────────────────────────────────────────

export type SellingStackParamList = {
  POSMain: { checkInPayload?: CheckInPayload; existingOrderId?: string } | undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: {
    orderId: string;
    orderNumber: string;
    total: number;
    savedOffline?: boolean;
    /** Pre-fill data for rebook — only passed from BeautyServiceScreen when APPOINTMENT feature is on */
    rebookCustomer?: { id?: number; name?: string; phone?: string | null } | null;
    rebookServices?: Array<{
      productId: number;
      productName: string;
      unitPrice: number;
      durationMinutes?: number;
      assignedEmployeeId?: number;
      assignedEmployeeName?: string;
    }>;
  };
  OrderList: undefined;
  OrderDetail: { orderId: string };
  PawnList: undefined;
  PawnDetail: { pawnId: number };
  PawnForm: { pawnId?: number; customerId?: number; customerName?: string };
  PawnSettings: undefined;
  KitchenDisplay: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  ProfileUpdate: undefined;
  ProfileSettings: undefined;
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
  Subscription: undefined;
  BankAccounts: undefined;
  LoyaltyConfig: undefined;
  LoyaltyProgramEdit: undefined;
  // Zalo settings
  ZaloSettings: undefined;
  ZaloTemplateList: undefined;
  ZaloTemplateForm: { templateId?: number };
  ZaloOaConnect: undefined;
  // Tools (moved from tab bar)
  UtilitiesHub: undefined;
  CurrencyConverter: undefined;
  InterestCalculator: undefined;
  LoanCalculator: undefined;
  TaxCalculator: undefined;
  BillSplitter: undefined;
  BudgetRule: undefined;
  Breakeven: undefined;
  MarketGoldPrices: undefined;
};

// ── Modal stacks (over tab bar, from overflow menu) ───────────────────────────

export type CustomerStackParamList = {
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
  CustomerForm: { customerId?: string };
  CustomerLoyalty: { customerId: string };
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
  PrintTemplateCreate: undefined;
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

export type ExpensesStackParamList = {
  ExpenseMain: undefined;
  ExpenseAdd: { existingNames: string[]; monthFrom: string; monthTo: string };
};

export type ReportStackParamList = {
  ReportMain: undefined;
};

export type ReportScreenProps<T extends keyof ReportStackParamList> =
  NativeStackScreenProps<ReportStackParamList, T>;

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
  MarketGoldPrices: undefined;
};

// ── More tab (replaces Settings tab) ─────────────────────────────────────────

export type MoreStackParamList = {
  MoreMain: undefined;
  ProfileUpdate: undefined;
  ProfileSettings: undefined;
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
  StaffList: undefined;
  StaffDetail: { userId: string };
  StaffForm: { userId?: string };
  GenerateInvite: undefined;
  QueueView: undefined;
  AppointmentList: undefined;
  AppointmentDetail: { appointmentId: number };
  AppointmentForm: {
    appointmentId?: number;
    /** Pre-fill create form (rebook flow). Ignored when appointmentId is set. */
    prefill?: {
      customerName?: string;
      customerPhone?: string;
      customerId?: number;
      services?: Array<{
        productId: number;
        productName: string;
        unitPrice: number;
        durationMinutes?: number;
        assignedEmployeeId?: number;
        assignedEmployeeName?: string;
      }>;
    };
  };
  // Shop config (moved from Settings)
  ShopInfo: undefined;
  POSConfig: undefined;
  BankAccounts: undefined;
  DefaultExpenses: undefined;
  LoyaltyConfig: undefined;
  LoyaltyProgramEdit: undefined;
  Display: undefined;
  NotificationPreferences: undefined;
  // E-Invoice setup
  EInvoiceSetup: undefined;
  // Zalo (moved from Settings → Shop Config)
  ZaloSettings: undefined;
  ZaloTemplateList: undefined;
  ZaloTemplateForm: { templateId?: number };
  ZaloOaConnect: undefined;
  // Support (moved from Settings)
  UtilitiesHub: undefined;
  Feedback: undefined;
  CurrencyConverter: undefined;
  InterestCalculator: undefined;
  LoanCalculator: undefined;
  TaxCalculator: undefined;
  BillSplitter: undefined;
  BudgetRule: undefined;
  Breakeven: undefined;
  MarketGoldPrices: undefined;
  Commission: undefined;
  CommissionDetail: {
    employeeId: number;
    employeeName: string;
    month: number;
    year: number;
  };
  DeleteShop: undefined;
  Subscription: undefined;
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
