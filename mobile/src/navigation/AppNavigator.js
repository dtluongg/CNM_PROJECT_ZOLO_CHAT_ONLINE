import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';

import SigninScreen         from '../screens/SigninScreen';
import SignupScreen         from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import MainTabScreen        from '../screens/MainTabScreen';
import MessageScreen        from '../screens/MessageScreen';
import UserProfileScreen    from '../screens/UserProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

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
          // ── Authenticated ──────────────────────────
          <>
            <Stack.Screen name="Main"        component={MainTabScreen} />
            <Stack.Screen name="Message"     component={MessageScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </>
        ) : (
          // ── Unauthenticated ────────────────────────
          <>
            <Stack.Screen name="Signin"          component={SigninScreen} />
            <Stack.Screen name="Signup"          component={SignupScreen} />
            <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
      </SafeAreaView>

  );
};

export default AppNavigator;
