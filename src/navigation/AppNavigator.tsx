import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, View } from 'react-native';
import { useFeatureCheck } from '../hooks/useFeature';
import { OfflineBanner } from '../components/OfflineBanner';
import { useNotificationBadge } from '../hooks/useNotificationBadge';
import { useBootstrap } from '../hooks/useBootstrap';
import { useTokenRefresh } from '../hooks/useTokenRefresh';

// Tab screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ExpensesScreen } from '../screens/main/ExpensesScreen';
import { ReportScreen } from '../screens/main/ReportScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

// Selling stack screens
import { POSMainScreen } from '../screens/selling/POSMainScreen';
import { CartScreen } from '../screens/pos/CartScreen';
import { CheckoutScreen } from '../screens/pos/CheckoutScreen';
import { OrderSuccessScreen } from '../screens/pos/OrderSuccessScreen';
import { OrderListScreen } from '../screens/orders/OrderListScreen';
import { OrderDetailScreen } from '../screens/orders/OrderDetailScreen';

// Settings sub-screens
import { ProfileScreen as ProfileUpdateScreen } from '../screens/profile/ProfileScreen';
import { ChangePasswordScreen } from '../screens/settings/ChangePasswordScreen';
import { ShopInfoScreen } from '../screens/settings/ShopInfoScreen';
import { POSConfigScreen } from '../screens/settings/POSConfigScreen';
import { DefaultExpensesScreen } from '../screens/settings/DefaultExpensesScreen';
import { SecurityScreen } from '../screens/settings/SecurityScreen';
import { PinSetupScreen } from '../screens/auth/PinSetupScreen';
import { DisplayScreen } from '../screens/settings/DisplayScreen';
import { TnCScreen } from '../screens/settings/TnCScreen';
import { ActivityLogScreen } from '../screens/settings/ActivityLogScreen';
import { DeleteAccountScreen } from '../screens/settings/DeleteAccountScreen';
import { NotificationPreferencesScreen } from '../screens/settings/NotificationPreferencesScreen';
import { FeedbackScreen } from '../screens/settings/FeedbackScreen';
import { FeedbackHistoryScreen } from '../screens/settings/FeedbackHistoryScreen';
import { SubscriptionScreen } from '../screens/settings/SubscriptionScreen';
import { BankAccountsScreen } from '../screens/settings/BankAccountsScreen';

// Tools screens (now inside Settings stack)
import { UtilitiesScreen } from '../screens/tools/UtilitiesScreen';
import { CurrencyConverterScreen } from '../screens/tools/CurrencyConverterScreen';
import { InterestCalculatorScreen } from '../screens/tools/InterestCalculatorScreen';
import { LoanCalculatorScreen } from '../screens/tools/LoanCalculatorScreen';
import { TaxCalculatorScreen } from '../screens/tools/TaxCalculatorScreen';
import { BillSplitterScreen } from '../screens/tools/BillSplitterScreen';
import { BudgetRuleScreen } from '../screens/tools/BudgetRuleScreen';
import { BreakevenScreen } from '../screens/tools/BreakevenScreen';
import { MarketGoldPricesScreen } from '../screens/tools/MarketGoldPricesScreen';

// Modal stack screens (overflow menu)
import { CustomerListScreen } from '../screens/customers/CustomerListScreen';
import { CustomerDetailScreen } from '../screens/customers/CustomerDetailScreen';
import { CustomerFormScreen } from '../screens/customers/CustomerFormScreen';
import { InventoryListScreen } from '../screens/inventory/InventoryListScreen';
import { ComboListScreen } from '../screens/combos/ComboListScreen';
import { ComboEditScreen } from '../screens/combos/ComboEditScreen';
import { PrintTemplateListScreen } from '../screens/print/PrintTemplateListScreen';
import { PrintTemplateDetailScreen } from '../screens/print/PrintTemplateDetailScreen';
import { GoldPriceScreen } from '../screens/gold/GoldPriceScreen';
import { ProductListScreen } from '../screens/products/ProductListScreen';
import { ProductDetailScreen } from '../screens/products/ProductDetailScreen';
import { ProductEditScreen } from '../screens/products/ProductEditScreen';
import { ProductCreateScreen } from '../screens/products/ProductCreateScreen';
import { CategoryListScreen } from '../screens/products/CategoryListScreen';
import { NotificationScreen } from '../screens/main/NotificationScreen';
import { MyWorkScreen } from '../screens/mywork/MyWorkScreen';
import { MyWorkHistoryScreen } from '../screens/mywork/MyWorkHistoryScreen';
import { MoreScreen } from '../screens/more/MoreScreen';
import { StaffListScreen } from '../screens/staff/StaffListScreen';
import { StaffFormScreen } from '../screens/staff/StaffFormScreen';
import { StaffQueueScreen } from '../screens/staff/StaffQueueScreen';
import { StaffPerformanceScreen } from '../screens/staff/StaffPerformanceScreen';
import { AppointmentListScreen } from '../screens/appointment/AppointmentListScreen';
import { AppointmentDetailScreen } from '../screens/appointment/AppointmentDetailScreen';
import { AppointmentFormScreen } from '../screens/appointment/AppointmentFormScreen';
import { CustomerLoyaltyScreen } from '../screens/customers/CustomerLoyaltyScreen';

import type {
  AppTabParamList,
  HomeStackParamList,
  SellingStackParamList,
  SettingsStackParamList,
  CustomerStackParamList,
  InventoryStackParamList,
  ComboStackParamList,
  PrintTemplateStackParamList,
  GoldPriceStackParamList,
  ProductStackParamList,
  MyWorkStackParamList,
  MoreStackParamList,
} from '../types/navigation';

// ── Navigators ────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<AppTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SellStack = createNativeStackNavigator<SellingStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const CustomerStack = createNativeStackNavigator<CustomerStackParamList>();
const InventoryStack = createNativeStackNavigator<InventoryStackParamList>();
const ComboStack = createNativeStackNavigator<ComboStackParamList>();
const PrintStack = createNativeStackNavigator<PrintTemplateStackParamList>();
const GoldStack = createNativeStackNavigator<GoldPriceStackParamList>();
const ProductStack = createNativeStackNavigator<ProductStackParamList>();
const MyWorkStack = createNativeStackNavigator<MyWorkStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="CustomerList" component={CustomerListScreen} />
      <HomeStack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <HomeStack.Screen name="CustomerForm" component={CustomerFormScreen} />
      <HomeStack.Screen name="CustomerLoyalty" component={CustomerLoyaltyScreen} />
    </HomeStack.Navigator>
  );
}

function SellingNavigator() {
  return (
    <SellStack.Navigator screenOptions={{ headerShown: false }}>
      <SellStack.Screen name="POSMain" component={POSMainScreen} />
      <SellStack.Screen name="Cart" component={CartScreen} />
      <SellStack.Screen name="Checkout" component={CheckoutScreen} />
      <SellStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
      <SellStack.Screen name="OrderList" component={OrderListScreen} />
      <SellStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </SellStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="ProfileUpdate" component={ProfileUpdateScreen} />
      <SettingsStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <SettingsStack.Screen name="ShopInfo" component={ShopInfoScreen} />
      <SettingsStack.Screen name="POSConfig" component={POSConfigScreen} />
      <SettingsStack.Screen name="DefaultExpenses" component={DefaultExpensesScreen} />
      <SettingsStack.Screen name="Security" component={SecurityScreen} />
      <SettingsStack.Screen name="PinSetup" component={PinSetupScreen} />
      <SettingsStack.Screen name="Display" component={DisplayScreen} />
      <SettingsStack.Screen name="TnC" component={TnCScreen} />
      <SettingsStack.Screen name="ActivityLog" component={ActivityLogScreen} />
      <SettingsStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <SettingsStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <SettingsStack.Screen name="Feedback" component={FeedbackScreen} />
      <SettingsStack.Screen name="FeedbackHistory" component={FeedbackHistoryScreen} />
      <SettingsStack.Screen name="Subscription" component={SubscriptionScreen} />
      <SettingsStack.Screen name="BankAccounts" component={BankAccountsScreen} />
      {/* Tools — accessible from Settings */}
      <SettingsStack.Screen name="UtilitiesHub" component={UtilitiesScreen} />
      <SettingsStack.Screen name="CurrencyConverter" component={CurrencyConverterScreen} />
      <SettingsStack.Screen name="InterestCalculator" component={InterestCalculatorScreen} />
      <SettingsStack.Screen name="LoanCalculator" component={LoanCalculatorScreen} />
      <SettingsStack.Screen name="TaxCalculator" component={TaxCalculatorScreen} />
      <SettingsStack.Screen name="BillSplitter" component={BillSplitterScreen} />
      <SettingsStack.Screen name="BudgetRule" component={BudgetRuleScreen} />
      <SettingsStack.Screen name="Breakeven" component={BreakevenScreen} />
      <SettingsStack.Screen name="MarketGoldPrices" component={MarketGoldPricesScreen} />
    </SettingsStack.Navigator>
  );
}

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMain" component={MoreScreen} />
      <MoreStack.Screen name="Products" component={ProductNavigator} />
      <MoreStack.Screen name="Categories" component={CategoryNavigator} />
      <MoreStack.Screen name="Customers" component={CustomerNavigator} />
      <MoreStack.Screen name="Inventory" component={InventoryNavigator} />
      <MoreStack.Screen name="Combos" component={ComboNavigator} />
      <MoreStack.Screen name="PrintTemplates" component={PrintTemplateNavigator} />
      <MoreStack.Screen name="GoldPrice" component={GoldPriceNavigator} />
      <MoreStack.Screen name="MyWork" component={MyWorkNavigator} />
      <MoreStack.Screen name="Notifications" component={NotificationNavigator} />
      <MoreStack.Screen name="Settings" component={SettingsNavigator} />
      <MoreStack.Screen name="StaffList" component={StaffListScreen} />
      <MoreStack.Screen name="StaffForm" component={StaffFormScreen} />
      <MoreStack.Screen name="QueueView" component={StaffQueueScreen} />
      <MoreStack.Screen name="StaffPerformance" component={StaffPerformanceScreen} />
      <MoreStack.Screen name="AppointmentList" component={AppointmentListScreen} />
      <MoreStack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <MoreStack.Screen name="AppointmentForm" component={AppointmentFormScreen} />
    </MoreStack.Navigator>
  );
}

// ── Tab Navigator ─────────────────────────────────────────────────────────────

export function AppNavigator() {
  const { t } = useTranslation();
  const has = useFeatureCheck();
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationBadge();
  useBootstrap();
  useTokenRefresh();

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: insets.bottom + 4,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {/* 1 — Home */}
      {has('DASHBOARD') && (
        <Tab.Screen
          name="Home"
          component={HomeNavigator}
          options={{
            title: t('home.title'),
            tabBarButton: (props) => <Pressable {...props} testID="tab-home" />,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home-outline" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* 2 — Sell (icon/label adapts inside POSMainScreen based on shop type) */}
      {(has('POS') || has('ORDER')) && (
        <Tab.Screen
          name="Sell"
          component={SellingNavigator}
          options={{
            title: t('selling.title'),
            tabBarButton: (props) => <Pressable {...props} testID="tab-sell" />,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cash-register" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* 3 — Expenses */}
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          title: t('expenses.title'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 4 — Report */}
      {has('DASHBOARD') && (
        <Tab.Screen
          name="Report"
          component={ReportScreen}
          options={{
            title: t('report.title'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-areaspline" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* 5 — More */}
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          title: t('more.title'),
          tabBarButton: (props) => <Pressable {...props} testID="tab-more" />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dots-horizontal" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
    </View>
  );
}

// ── Modal stacks (pushed from overflow menu) ──────────────────────────────────

export function CustomerNavigator() {
  return (
    <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
      <CustomerStack.Screen name="CustomerList" component={CustomerListScreen} />
      <CustomerStack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <CustomerStack.Screen name="CustomerForm" component={CustomerFormScreen} />
      <CustomerStack.Screen name="CustomerLoyalty" component={CustomerLoyaltyScreen} />
    </CustomerStack.Navigator>
  );
}

export function InventoryNavigator() {
  return (
    <InventoryStack.Navigator screenOptions={{ headerShown: false }}>
      <InventoryStack.Screen name="InventoryList" component={InventoryListScreen} />
    </InventoryStack.Navigator>
  );
}

export function ComboNavigator() {
  return (
    <ComboStack.Navigator screenOptions={{ headerShown: false }}>
      <ComboStack.Screen name="ComboList" component={ComboListScreen} />
      <ComboStack.Screen name="ComboEdit" component={ComboEditScreen} />
    </ComboStack.Navigator>
  );
}

export function PrintTemplateNavigator() {
  return (
    <PrintStack.Navigator screenOptions={{ headerShown: false }}>
      <PrintStack.Screen name="PrintTemplateList" component={PrintTemplateListScreen} />
      <PrintStack.Screen name="PrintTemplateDetail" component={PrintTemplateDetailScreen} />
    </PrintStack.Navigator>
  );
}

export function GoldPriceNavigator() {
  return (
    <GoldStack.Navigator screenOptions={{ headerShown: false }}>
      <GoldStack.Screen name="GoldPriceMain" component={GoldPriceScreen} />
    </GoldStack.Navigator>
  );
}

export function ProductNavigator() {
  return (
    <ProductStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductStack.Screen name="ProductList" component={ProductListScreen} />
      <ProductStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <ProductStack.Screen name="ProductEdit" component={ProductEditScreen} />
      <ProductStack.Screen name="ProductCreate" component={ProductCreateScreen} />
    </ProductStack.Navigator>
  );
}

const CategoryStack = createNativeStackNavigator<import('../types/navigation').CategoryStackParamList>();

export function CategoryNavigator() {
  return (
    <CategoryStack.Navigator screenOptions={{ headerShown: false }}>
      <CategoryStack.Screen name="CategoryList" component={CategoryListScreen} />
    </CategoryStack.Navigator>
  );
}

export function MyWorkNavigator() {
  return (
    <MyWorkStack.Navigator screenOptions={{ headerShown: false }}>
      <MyWorkStack.Screen name="MyWorkMain" component={MyWorkScreen} />
      <MyWorkStack.Screen name="MyWorkHistory" component={MyWorkHistoryScreen} />
    </MyWorkStack.Navigator>
  );
}

export function NotificationNavigator() {
  const NotifStack = createNativeStackNavigator();
  return (
    <NotifStack.Navigator screenOptions={{ headerShown: false }}>
      <NotifStack.Screen name="NotificationList" component={NotificationScreen} />
    </NotifStack.Navigator>
  );
}
