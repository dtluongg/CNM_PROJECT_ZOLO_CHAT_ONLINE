import 'react-native-url-polyfill/auto';
import React from 'react';
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { LogBox } from 'react-native';

import { AuthProvider } from './src/context/AuthContext';
import { PresenceProvider } from './src/context/PresenceContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { CallProvider } from './src/features/call/CallContext';
import IncomingCallScreen from './src/features/call/screens/IncomingCallScreen';
import OutgoingCallScreen from './src/features/call/screens/OutgoingCallScreen';
import ActiveCallScreen   from './src/features/call/screens/ActiveCallScreen';
import AppNavigator from './src/navigation/AppNavigator';

LogBox.ignoreLogs(['Text strings must be rendered']);

WebBrowser.maybeCompleteAuthSession();

function App() {
  return (
    // ✅ SafeAreaProvider tự động handle notch, status bar, bottom bar
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <PresenceProvider>
            <CallProvider>
              <AppNavigator />
              <IncomingCallScreen />
              <OutgoingCallScreen />
              <ActiveCallScreen />
            </CallProvider>
          </PresenceProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);