import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { OfflineBanner } from '../components/OfflineBanner';
import { ShopIdScreen } from '../screens/auth/ShopIdScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { PinLoginScreen } from '../screens/auth/PinLoginScreen';
import { PinSetupScreen } from '../screens/auth/PinSetupScreen';
import { ForgotPinScreen } from '../screens/auth/ForgotPinScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { ForgotShopIdScreen } from '../screens/auth/ForgotShopIdScreen';
import type { AuthStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { storedPhone, pinEnabled } = useAuthStore();

  const initialRoute: keyof AuthStackParamList =
    storedPhone && pinEnabled ? 'PinLogin' : 'Login';

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
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
        <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="ForgotShopId" component={ForgotShopIdScreen} />
      </Stack.Navigator>
    </View>
  );
}
