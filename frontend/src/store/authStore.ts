import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

const KEY_TOKEN = 'token';
const KEY_USER = 'user';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(KEY_TOKEN);
    const savedUser = localStorage.getItem(KEY_USER);
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    setToken(result.token);
    setUser(result.user);
    localStorage.setItem(KEY_TOKEN, result.token);
    localStorage.setItem(KEY_USER, JSON.stringify(result.user));
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error(e);
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
  }, []);

  const updateUser = useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem(KEY_USER, JSON.stringify(userData));
  }, []);

  return {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!token && !!user
  };
};
