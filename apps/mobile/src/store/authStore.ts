import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState, User } from '../types';
import { authApi } from '../services/api';
import { supabase } from '../services/supabase';

interface AuthStore extends AuthState {
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  checkAuthState: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Login with Supabase Auth
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Store tokens
            await AsyncStorage.setItem('access_token', data.session?.access_token || '');
            await AsyncStorage.setItem('refresh_token', data.session?.refresh_token || '');
            
            // Get user profile from API
            const profileResponse = await authApi.login(email, password);
            
            set({
              user: profileResponse.data,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, firstName: string, lastName: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Register with Supabase Auth
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
              },
            },
          });

          if (error) throw error;

          // Also register via API
          await authApi.register(email, password, firstName, lastName);

          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          
          // Logout from Supabase
          await supabase.auth.signOut();
          
          // Logout from API
          try {
            await authApi.logout();
          } catch (error) {
            // Ignore API logout errors
          }

          // Clear stored tokens
          await AsyncStorage.multiRemove([
            'access_token',
            'refresh_token',
            'user',
            'push_token',
          ]);

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Logout failed',
          });
        }
      },

      forgotPassword: async (email: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const { error } = await supabase.auth.resetPasswordForEmail(email);
          
          if (error) throw error;

          set({ isLoading: false });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to send reset email',
          });
          throw error;
        }
      },

      checkAuthState: async () => {
        try {
          set({ isLoading: true });
          
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Refresh user profile
            try {
              const profileResponse = await authApi.login(session.user.email || '', '');
              set({
                user: profileResponse.data,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch (error) {
              // If API call fails, still keep auth state but clear user data
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);