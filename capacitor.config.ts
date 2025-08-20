import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ar.com.servido.app',
  appName: 'Servido',
  webDir: '.next',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#8B5CF6",
      showSpinner: true,
      spinnerColor: "#FFFFFF"
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#8B5CF6'
    }
  }
};

export default config;

