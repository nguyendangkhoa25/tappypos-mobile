import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ShopTypeScreen } from '../screens/onboarding/ShopTypeScreen';
import { Step1Screen } from '../screens/onboarding/Step1Screen';
import { Step2Screen } from '../screens/onboarding/Step2Screen';
import { TableSetupScreen } from '../screens/onboarding/TableSetupScreen';
import { Step3Screen } from '../screens/onboarding/Step3Screen';
import { Step4Screen } from '../screens/onboarding/Step4Screen';
import type { OnboardingStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="ShopType" component={ShopTypeScreen} />
      <Stack.Screen name="Step1" component={Step1Screen} />
      <Stack.Screen name="Step2" component={Step2Screen} />
      <Stack.Screen name="TableSetup" component={TableSetupScreen} />
      <Stack.Screen name="Step3" component={Step3Screen} />
      <Stack.Screen name="Step4" component={Step4Screen} />
    </Stack.Navigator>
  );
}
