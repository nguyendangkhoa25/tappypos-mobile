import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { JoinShopScreen } from '../screens/onboarding/JoinShopScreen';
import { ShopTypeScreen } from '../screens/onboarding/ShopTypeScreen';
import { Step1Screen } from '../screens/onboarding/Step1Screen';
import { Step2Screen } from '../screens/onboarding/Step2Screen';
import { PawnFeatureScreen } from '../screens/onboarding/PawnFeatureScreen';
import { PawnInterestScreen } from '../screens/onboarding/PawnInterestScreen';
import { TableSetupScreen } from '../screens/onboarding/TableSetupScreen';
import { Step3Screen } from '../screens/onboarding/Step3Screen';
import { Step4Screen } from '../screens/onboarding/Step4Screen';
import type { OnboardingStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="JoinShop" component={JoinShopScreen} />
      <Stack.Screen name="ShopType" component={ShopTypeScreen} />
      <Stack.Screen name="Step1" component={Step1Screen} />
      <Stack.Screen name="Step2" component={Step2Screen} />
      <Stack.Screen name="PawnFeature" component={PawnFeatureScreen} />
      <Stack.Screen name="PawnInterest" component={PawnInterestScreen} />
      <Stack.Screen name="TableSetup" component={TableSetupScreen} />
      <Stack.Screen name="Step3" component={Step3Screen} />
      <Stack.Screen name="Step4" component={Step4Screen} />
    </Stack.Navigator>
  );
}
