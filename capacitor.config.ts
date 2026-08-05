import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartincomeplanner.app',
  appName: 'Smart Expenses Planner & Investment',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '257425560798-5ltn6vsrj4l5dl59t86j1sun05p6f6rf.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
