import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => Promise.resolve(
        typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      ),
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }
  return AsyncStorage;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
