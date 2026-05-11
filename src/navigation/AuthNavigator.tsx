import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { ShopIdScreen } from '../screens/auth/ShopIdScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { PinLoginScreen } from '../screens/auth/PinLoginScreen';
import { PinSetupScreen } from '../screens/auth/PinSetupScreen';
import { ForgotPinScreen } from '../screens/auth/ForgotPinScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import type { AuthStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { storedPhone, pinEnabled } = useAuthStore();
  const hasTenantId = !!useAuthStore.getState().tenantId;

  // Return to stored shop login if tenant known + PIN enabled
  const initialRoute: keyof AuthStackParamList =
    storedPhone && pinEnabled ? 'PinLogin' : hasTenantId ? 'Login' : 'ShopId';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }}
    >
      <Stack.Screen name="ShopId" component={ShopIdScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="PinLogin" component={PinLoginScreen} />
      <Stack.Screen name="PinSetup" component={PinSetupScreen} />
      <Stack.Screen name="ForgotPin" component={ForgotPinScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
