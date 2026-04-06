import 'react-native-url-polyfill/auto';
import React from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

function ThemeSyncHandler() {
  const { user } = useAuth();
  const { syncTheme } = useTheme();

  React.useEffect(() => {
    if (user) {
      syncTheme(user.themeName || 'dark', user.themeColors || null);
    } else {
      syncTheme('dark', null); // Reset khi đăng xuất
    }
  }, [user, syncTheme]);

  return null;
}

WebBrowser.maybeCompleteAuthSession();

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <ThemeSyncHandler />
          <AppNavigator />
        </ThemeProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

// SDK 54 không dùng Expo Router: phải gọi registerRootComponent thủ công
registerRootComponent(App);
