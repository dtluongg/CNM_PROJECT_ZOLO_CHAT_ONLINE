import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';

import SigninScreen         from '../features/auth/screens/SigninScreen';
import SignupScreen         from '../features/auth/screens/SignupScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';
import CompleteProfileScreen from '../features/auth/screens/CompleteProfileScreen';
import MainTabScreen        from './MainTabScreen';
import MessageScreen        from '../features/chat/screens/MessageScreen';
import UserProfileScreen    from '../features/user/screens/UserProfileScreen';
import ChangePasswordScreen from '../features/auth/screens/ChangePasswordScreen';
import FriendsScreen        from '../features/friends/screens/FriendsScreen';
import VoiceChannelScreen   from '../features/voice/screens/VoiceChannelScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      Signin: 'signin',
      Signup: 'signup',
      ForgotPassword: 'forgot-password',
      ChangePassword: 'change-password',
      CompleteProfile: 'complete-profile',
      Main: 'main',
      UserProfile: 'user/:userId',
      Message: 'message',
    },
  },
};

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bgPrimary }}>
    <ActivityIndicator size="large" color={THEME.accent} />
  </View>
);

const AppNavigator = () => {
  const { token, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1e1f22' }} edges={['top']}>
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {token ? (
          <Stack.Group>
            <Stack.Screen name="Main" component={MainTabScreen} />
            <Stack.Screen name="Message" component={MessageScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="DeviceManagement" component={require('../features/user/screens/DeviceManagementScreen').default} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
            <Stack.Screen name="Friends" component={FriendsScreen} />
            <Stack.Screen name="FriendRequests" component={require('../features/friends/screens/FriendRequestsScreen').default} />
            <Stack.Screen name="VoiceChannel" component={VoiceChannelScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Signin" component={SigninScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
      </SafeAreaView>

  );
};

export default AppNavigator;
