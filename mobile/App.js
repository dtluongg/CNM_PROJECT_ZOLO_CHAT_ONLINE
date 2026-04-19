import 'react-native-url-polyfill/auto';

// Must use require() NOT import — ES imports are hoisted and would load
// react-native-webrtc in the web bundle where requireNativeComponent doesn't exist.
import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  try {
    require('react-native-webrtc').registerGlobals();
  } catch (e) {
    console.warn('[WebRTC] registerGlobals failed:', e?.message);
  }
}

import React from 'react';
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { LogBox } from 'react-native';

import { AuthProvider } from './src/context/AuthContext';
import { PresenceProvider } from './src/context/PresenceContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { CallProvider } from './src/features/call/CallContext';
import { VoiceRoomProvider } from './src/features/voice/VoiceRoomContext';
import IncomingCallScreen from './src/features/call/screens/IncomingCallScreen';
import OutgoingCallScreen from './src/features/call/screens/OutgoingCallScreen';
import ActiveCallScreen   from './src/features/call/screens/ActiveCallScreen';
import AppNavigator from './src/navigation/AppNavigator';

LogBox.ignoreLogs(['Text strings must be rendered']);

WebBrowser.maybeCompleteAuthSession();

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <PresenceProvider>
            <CallProvider>
              <VoiceRoomProvider>
                <AppNavigator />
                <IncomingCallScreen />
                <OutgoingCallScreen />
                <ActiveCallScreen />
              </VoiceRoomProvider>
            </CallProvider>
          </PresenceProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
