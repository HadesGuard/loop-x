'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/api';
import type { ApiUserResponse } from '@/types/api';

interface AuthState {
  user: ApiUserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const userData = localStorage.getItem('user_data');
          if (userData) {
            const user = JSON.parse(userData);
            setAuthState({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Try to fetch current user
            try {
              const currentUser = await api.getCurrentUser();
              setAuthState({
                user: currentUser,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch {
              // Token invalid, clear it
              localStorage.removeItem('auth_token');
              setAuthState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          }
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    try {
      const result = await api.login(email, password, rememberMe);
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
  }) => {
    try {
      const result = await api.register(data);
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await api.getCurrentUser();
      setAuthState(prev => ({
        ...prev,
        user,
      }));
      localStorage.setItem('user_data', JSON.stringify(user));
    } catch {
      // If refresh fails, user might be logged out
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  return {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
  };
}

