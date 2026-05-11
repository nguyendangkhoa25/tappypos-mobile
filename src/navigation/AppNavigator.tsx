import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { useFeatureCheck } from '../hooks/useFeature';

// Tab screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ExpensesScreen } from '../screens/main/ExpensesScreen';
import { ReportScreen } from '../screens/main/ReportScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

// Selling stack screens
import { POSScreen } from '../screens/pos/POSScreen';
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
import { DisplayScreen } from '../screens/settings/DisplayScreen';
import { TnCScreen } from '../screens/settings/TnCScreen';
import { ActivityLogScreen } from '../screens/settings/ActivityLogScreen';
import { DeleteAccountScreen } from '../screens/settings/DeleteAccountScreen';
import { NotificationPreferencesScreen } from '../screens/settings/NotificationPreferencesScreen';
import { FeedbackScreen } from '../screens/settings/FeedbackScreen';
import { FeedbackHistoryScreen } from '../screens/settings/FeedbackHistoryScreen';
import { SubscriptionScreen } from '../screens/settings/SubscriptionScreen';
import { BankAccountsScreen } from '../screens/settings/BankAccountsScreen';

// Tools stack screens
import { UtilitiesScreen } from '../screens/tools/UtilitiesScreen';
import { CurrencyConverterScreen } from '../screens/tools/CurrencyConverterScreen';
import { InterestCalculatorScreen } from '../screens/tools/InterestCalculatorScreen';
import { LoanCalculatorScreen } from '../screens/tools/LoanCalculatorScreen';
import { TaxCalculatorScreen } from '../screens/tools/TaxCalculatorScreen';
import { BillSplitterScreen } from '../screens/tools/BillSplitterScreen';
import { BudgetRuleScreen } from '../screens/tools/BudgetRuleScreen';
import { BreakevenScreen } from '../screens/tools/BreakevenScreen';

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
import { CategoryListScreen } from '../screens/products/CategoryListScreen';
import { NotificationScreen } from '../screens/main/NotificationScreen';

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
  ToolsStackParamList,
} from '../types/navigation';

// ── Navigators ────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<AppTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SellStack = createNativeStackNavigator<SellingStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const CustomerStack = createNativeStackNavigator<CustomerStackParamList>();
const InventoryStack = createNativeStackNavigator<InventoryStackParamList>();
const ComboStack = createNativeStackNavigator<ComboStackParamList>();
const PrintStack = createNativeStackNavigator<PrintTemplateStackParamList>();
const GoldStack = createNativeStackNavigator<GoldPriceStackParamList>();
const ProductStack = createNativeStackNavigator<ProductStackParamList>();
const ToolsStack = createNativeStackNavigator<ToolsStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="CustomerList" component={CustomerListScreen} />
      <HomeStack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <HomeStack.Screen name="CustomerForm" component={CustomerFormScreen} />
    </HomeStack.Navigator>
  );
}

function SellingNavigator() {
  return (
    <SellStack.Navigator screenOptions={{ headerShown: false }}>
      <SellStack.Screen name="POSMain" component={POSScreen} />
      <SellStack.Screen name="Cart" component={CartScreen} />
      <SellStack.Screen name="Checkout" component={CheckoutScreen} />
      <SellStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
      <SellStack.Screen name="OrderList" component={OrderListScreen} />
      <SellStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </SellStack.Navigator>
  );
}

function ToolsNavigator() {
  return (
    <ToolsStack.Navigator screenOptions={{ headerShown: false }}>
      <ToolsStack.Screen name="UtilitiesHub" component={UtilitiesScreen} />
      <ToolsStack.Screen name="CurrencyConverter" component={CurrencyConverterScreen} />
      <ToolsStack.Screen name="InterestCalculator" component={InterestCalculatorScreen} />
      <ToolsStack.Screen name="LoanCalculator" component={LoanCalculatorScreen} />
      <ToolsStack.Screen name="TaxCalculator" component={TaxCalculatorScreen} />
      <ToolsStack.Screen name="BillSplitter" component={BillSplitterScreen} />
      <ToolsStack.Screen name="BudgetRule" component={BudgetRuleScreen} />
      <ToolsStack.Screen name="Breakeven" component={BreakevenScreen} />
    </ToolsStack.Navigator>
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
      <SettingsStack.Screen name="Display" component={DisplayScreen} />
      <SettingsStack.Screen name="TnC" component={TnCScreen} />
      <SettingsStack.Screen name="ActivityLog" component={ActivityLogScreen} />
      <SettingsStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <SettingsStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <SettingsStack.Screen name="Feedback" component={FeedbackScreen} />
      <SettingsStack.Screen name="FeedbackHistory" component={FeedbackHistoryScreen} />
      <SettingsStack.Screen name="Subscription" component={SubscriptionScreen} />
      <SettingsStack.Screen name="BankAccounts" component={BankAccountsScreen} />
    </SettingsStack.Navigator>
  );
}

// ── Tab Navigator ─────────────────────────────────────────────────────────────

export function AppNavigator() {
  const { t } = useTranslation();
  const has = useFeatureCheck();
  const insets = useSafeAreaInsets();

  return (
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
      {has('DASHBOARD') && (
        <Tab.Screen
          name="Home"
          component={HomeNavigator}
          options={{
            title: t('home.title'),
            // eslint-disable-next-line react/no-unstable-nested-components
            tabBarButton: (props) => <Pressable {...props} testID="tab-home" />,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home-outline" color={color} size={size} />
            ),
          }}
        />
      )}

      {(has('POS') || has('ORDER')) && (
        <Tab.Screen
          name="Selling"
          component={SellingNavigator}
          options={{
            title: t('selling.title'),
            // eslint-disable-next-line react/no-unstable-nested-components
            tabBarButton: (props) => <Pressable {...props} testID="tab-selling" />,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cash-register" color={color} size={size} />
            ),
          }}
        />
      )}

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

      {has('DASHBOARD') && (
        <Tab.Screen
          name="Report"
          component={ReportScreen}
          options={{
            title: t('report.title'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-bar" color={color} size={size} />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="Tools"
        component={ToolsNavigator}
        options={{
          title: t('tools.title'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calculator-variant-outline" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          title: t('settings.title'),
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarButton: (props) => <Pressable {...props} testID="tab-settings" />,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Modal stacks (pushed from overflow menu) ──────────────────────────────────

export function CustomerNavigator() {
  return (
    <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
      <CustomerStack.Screen name="CustomerList" component={CustomerListScreen} />
      <CustomerStack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <CustomerStack.Screen name="CustomerForm" component={CustomerFormScreen} />
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
      <GoldStack.Screen name="GoldPrice" component={GoldPriceScreen} />
    </GoldStack.Navigator>
  );
}

export function ProductNavigator() {
  return (
    <ProductStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductStack.Screen name="ProductList" component={ProductListScreen} />
      <ProductStack.Screen name="ProductDetail" component={ProductDetailScreen} />
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
