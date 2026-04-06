import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';

import SigninScreen         from '../screens/SigninScreen';
import SignupScreen         from '../screens/SignupScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import MainTabScreen        from '../screens/MainTabScreen';
import MessageScreen        from '../screens/MessageScreen';
import UserProfileScreen    from '../screens/UserProfileScreen';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bgPrimary }}>
    <ActivityIndicator size="large" color={THEME.accent} />
  </View>
);

const AppNavigator = () => {
  const { token, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {token ? (
          // ── Authenticated ──────────────────────────
          <>
            <Stack.Screen name="Main"        component={MainTabScreen} />
            <Stack.Screen name="Message"     component={MessageScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </>
        ) : (
          // ── Unauthenticated ────────────────────────
          <>
            <Stack.Screen name="Signin"          component={SigninScreen} />
            <Stack.Screen name="Signup"          component={SignupScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
