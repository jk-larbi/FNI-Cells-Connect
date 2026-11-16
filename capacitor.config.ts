import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.forerunnersnetwork.fnicellsconnect',
  appName: 'FNI Cells Connect',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    PushNotifications: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
  },
  android: {
    useLegacyBridge: true,
    backgroundColor: '#173B8F',
    allowMixedContent: false,
  },
};

export default config;
