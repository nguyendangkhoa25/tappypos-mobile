import type { ConfigContext, ExpoConfig } from 'expo/config';

const IS_STAGING = process.env.EXPO_PUBLIC_APP_VARIANT === 'staging';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_STAGING ? 'TappyPOS Staging' : 'TappyPOS',
  slug: 'tappypos',
  scheme: 'tappypos',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#4f46e5',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_STAGING ? 'com.knp.tappypos.staging' : 'com.knp.tappypos',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#4f46e5',
    },
    package: IS_STAGING ? 'com.knp.tappypos.staging' : 'com.knp.tappypos',
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-secure-store',
    'expo-web-browser',
    'expo-local-authentication',
    'expo-localization',
    'expo-apple-authentication',
  ],
  extra: {
    eas: {
      projectId: '168f3eaa-01dd-4c17-8a08-19f4648c757e',
    },
  },
});
