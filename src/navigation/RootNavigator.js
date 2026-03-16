import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';

export default function RootNavigator() {
  const { userToken, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('Login');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (userToken == null) {
    return currentScreen === 'Login' ? (
      <LoginScreen onNavigate={() => setCurrentScreen('Register')} />
    ) : (
      <RegisterScreen onNavigate={() => setCurrentScreen('Login')} />
    );
  }

  return <HomeScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617'
  }
});
