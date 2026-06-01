import './polyfills';
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
const { Platform } = require('react-native');

if (Platform.OS !== 'web') {
  try {
    require('react-native-webrtc').registerGlobals();
  } catch (e) {
    console.warn('[WebRTC] registerGlobals failed:', e?.message);
  }

  if (typeof global.navigator === 'undefined') {
    global.navigator = {};
  }

  if (typeof global.navigator.userAgent !== 'string') {
    try {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'ReactNative Android',
        configurable: true,
      });
    } catch {
      global.navigator.userAgent = 'ReactNative Android';
    }
  }

  if (typeof global.navigator.platform !== 'string') {
    try {
      Object.defineProperty(global.navigator, 'platform', {
        value: 'android',
        configurable: true,
      });
    } catch {
      global.navigator.platform = 'android';
    }
  }

  try {
    if (typeof navigator !== 'undefined') {
      if (!navigator.mediaDevices) {
        navigator.mediaDevices = {};
      }

      if (typeof navigator.mediaDevices.enumerateDevices !== 'function') {
        navigator.mediaDevices.enumerateDevices = async () => [];
      }

      const originalGetUserMedia =
        navigator.mediaDevices.getUserMedia?.bind(navigator.mediaDevices);

      if (originalGetUserMedia) {
        navigator.mediaDevices.getUserMedia = async function (constraints) {
          const stream = await originalGetUserMedia(constraints);

          stream.getTracks().forEach((track) => {
            const originalGetSettings = track.getSettings?.bind(track);

            track.getSettings = function () {
              let settings = {};

              try {
                settings = originalGetSettings?.() ?? {};
              } catch {
                settings = {};
              }

              return {
                ...settings,
                deviceId: settings.deviceId ?? 'default',
                groupId: settings.groupId ?? '',
                label: settings.label ?? track.label ?? '',
                kind: settings.kind ?? track.kind ?? 'audio',
                width: settings.width ?? 0,
                height: settings.height ?? 0,
                frameRate: settings.frameRate ?? 0,
                facingMode: settings.facingMode ?? '',
              };
            };

            if (typeof track.getCapabilities !== 'function') {
              track.getCapabilities = () => ({
                deviceId: 'default',
                groupId: '',
                kind: track.kind || 'audio',
                label: track.label || '',
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

const React = require('react');
const { registerRootComponent } = require('expo');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const WebBrowser = require('expo-web-browser');
const { LogBox } = require('react-native');

const { AuthProvider } = require('./src/context/AuthContext');
const { PresenceProvider } = require('./src/context/PresenceContext');
const { ThemeProvider } = require('./src/context/ThemeContext');
const { CallProvider } = require('./src/features/call/CallContext');
const { GroupCallProvider } = require('./src/features/call/GroupCallContext');
const { VoiceRoomProvider } = require('./src/features/voice/VoiceRoomContext');
const { NotificationProvider } = require('./src/context/NotificationContext');
const { LanguageProvider } = require('./src/context/LanguageContext');

const IncomingCallScreen =
  require('./src/features/call/screens/IncomingCallScreen').default;
const OutgoingCallScreen =
  require('./src/features/call/screens/OutgoingCallScreen').default;
const ActiveCallScreen =
  require('./src/features/call/screens/ActiveCallScreen').default;
const GroupCallScreen =
  require('./src/features/call/screens/GroupCallScreen').default;
const IncomingGroupCallScreen =
  require('./src/features/call/screens/IncomingGroupCallScreen').default;
const AppNavigator = require('./src/navigation/AppNavigator').default;

LogBox.ignoreLogs(['Text strings must be rendered']);

WebBrowser.maybeCompleteAuthSession();

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LanguageProvider>
            <NotificationProvider>
              <ThemeProvider>
                <PresenceProvider>
                  <CallProvider>
                    <GroupCallProvider>
                      <VoiceRoomProvider>
                        <AppNavigator />
                        <IncomingCallScreen />
                        <OutgoingCallScreen />
                        <ActiveCallScreen />
                        <GroupCallScreen />
                        <IncomingGroupCallScreen />
                      </VoiceRoomProvider>
                    </GroupCallProvider>
                  </CallProvider>
                </PresenceProvider>
              </ThemeProvider>
            </NotificationProvider>
          </LanguageProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);