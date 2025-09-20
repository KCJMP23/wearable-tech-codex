import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { useAppDispatch, useAppSelector } from '../store';
import { loginStart, loginSuccess, loginFailure, logout } from '../store/slices/authSlice';
import { resetApp } from '../store/slices/appSlice';
import { STORAGE_KEYS } from '../constants';
import { User } from '../types';
import { webSocketService } from '../services/websocket';
import { offlineQueue } from '../services/offlineQueue';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  isBiometricsEnabled: boolean;
  enableBiometrics: () => Promise<void>;
  disableBiometrics: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector(state => state.auth);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);

  useEffect(() => {
    initializeAuth();
    checkBiometricsSettings();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch(loginStart());
      
      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        dispatch(loginFailure(error.message));
        return;
      }

      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || session.user.created_at,
        };

        dispatch(loginSuccess({
          user: userData,
          token: session.access_token,
        }));

        // Store user data
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, session.access_token);
        
        // Initialize WebSocket connection
        try {
          await webSocketService.initialize(userData.id);
        } catch (error) {
          console.error('Failed to initialize WebSocket:', error);
        }
      } else {
        dispatch(loginFailure('No active session'));
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      dispatch(loginFailure('Failed to initialize authentication'));
    }
  };

  const checkBiometricsSettings = async () => {
    try {
      const biometricsEnabled = await AsyncStorage.getItem('@biometrics_enabled');
      setIsBiometricsEnabled(biometricsEnabled === 'true');
    } catch (error) {
      console.error('Error checking biometrics settings:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      dispatch(loginStart());
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        dispatch(loginFailure(error.message));
        throw error;
      }

      if (data.user && data.session) {
        const userData: User = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name,
          avatar_url: data.user.user_metadata?.avatar_url,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at,
        };

        dispatch(loginSuccess({
          user: userData,
          token: data.session.access_token,
        }));

        // Store user data
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.session.access_token);

        // Initialize WebSocket connection
        try {
          await webSocketService.initialize(userData.id);
        } catch (error) {
          console.error('Failed to initialize WebSocket on login:', error);
        }

        // Navigate to main app
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      dispatch(loginStart());
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          },
        },
      });

      if (error) {
        dispatch(loginFailure(error.message));
        throw error;
      }

      if (data.user) {
        // User needs to verify email
        dispatch(loginFailure('Please check your email to verify your account'));
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(logout());
      dispatch(resetApp());
      
      // Clear stored data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.SELECTED_TENANT,
      ]);

      // Disconnect WebSocket and clear offline queue
      webSocketService.disconnect();
      await offlineQueue.clearQueue();

      // Navigate to auth
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access AffiliateOS',
        fallbackLabel: 'Use passcode',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const enableBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        throw new Error('Biometric authentication is not available on this device');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Cancel',
      });

      if (result.success) {
        await AsyncStorage.setItem('@biometrics_enabled', 'true');
        setIsBiometricsEnabled(true);
      }
    } catch (error) {
      console.error('Error enabling biometrics:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: data.email,
        data: {
          name: data.name,
          avatar_url: data.avatar_url,
        },
      });

      if (error) {
        throw error;
      }

      // Update local user data
      const updatedUser = { ...user, ...data } as User;
      dispatch(loginSuccess({
        user: updatedUser,
        token: (await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)) || '',
      }));

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const disableBiometrics = async () => {
    try {
      await AsyncStorage.setItem('@biometrics_enabled', 'false');
      setIsBiometricsEnabled(false);
    } catch (error) {
      console.error('Error disabling biometrics:', error);
    }
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    authenticateWithBiometrics,
    isBiometricsEnabled,
    enableBiometrics,
    disableBiometrics,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}