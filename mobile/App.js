import './polyfills';
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

  // react-native-webrtc v124 defines getSettings() directly on instances,
  // so prototype patching has no effect. Instead, wrap getUserMedia to patch
  // every track right after it is created.
  try {
    if (typeof navigator !== 'undefined') {
      if (!navigator.mediaDevices) navigator.mediaDevices = {};

      // ── enumerateDevices ──────────────────────────────────────────────────
      if (typeof navigator.mediaDevices.enumerateDevices !== 'function') {
        navigator.mediaDevices.enumerateDevices = async () => [];
      }

      // ── getUserMedia wrapper ──────────────────────────────────────────────
      const _origGUM = navigator.mediaDevices.getUserMedia?.bind(navigator.mediaDevices);
      if (_origGUM) {
        navigator.mediaDevices.getUserMedia = async function (constraints) {
          const stream = await _origGUM(constraints);
          // Patch every track instance so livekit-client's deviceId.toLowerCase() works
          stream.getTracks().forEach(track => {
            const _origGS = track.getSettings?.bind(track);
            track.getSettings = function () {
              const s = (() => { try { return _origGS?.() ?? {}; } catch { return {}; } })();
              return {
                deviceId:   s?.deviceId   ?? 'default',
                groupId:    s?.groupId    ?? '',
                label:      s?.label      ?? (track.label  || ''),
                kind:       s?.kind       ?? (track.kind   || 'audio'),
                width:      s?.width      ?? 0,
                height:     s?.height     ?? 0,
                frameRate:  s?.frameRate  ?? 0,
                facingMode: s?.facingMode ?? '',
                ...s,
              };
            };
            if (typeof track.getCapabilities !== 'function') {
              track.getCapabilities = () => ({
                deviceId: 'default', groupId: '',
                kind: track.kind || 'audio', label: track.label || '',
              });
            }
          });
          return stream;
        };
      }
    }
  } catch (e) {
    console.warn('[Polyfill] getUserMedia patch failed:', e?.message);
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
