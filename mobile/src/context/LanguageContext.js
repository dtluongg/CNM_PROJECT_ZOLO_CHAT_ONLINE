import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import vi from '../locales/vi.json';
import en from '../locales/en.json';
import { useAuth } from './AuthContext';
import apiClient from '../services/apiClient';

const LanguageContext = createContext();

const translations = { vi, en };

export const LanguageProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [language, setLanguage] = useState('vi');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncLanguage = async () => {
      // 1. Prioritize language from user profile if logged in
      if (user?.language && translations[user.language]) {
        setLanguage(user.language);
        await AsyncStorage.setItem('user_language', user.language);
        setLoading(false);
        return;
      }

      // 2. Fallback to storage
      try {
        const savedLanguage = await AsyncStorage.getItem('user_language');
        if (savedLanguage && translations[savedLanguage]) {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('Failed to load language:', error);
      } finally {
        setLoading(false);
      }
    };
    syncLanguage();
  }, [user?.language]);

  const changeLanguage = async (newLang) => {
    if (translations[newLang]) {
      setLanguage(newLang);
      try {
        await AsyncStorage.setItem('user_language', newLang);
        
        // Sync to backend if logged in
        if (user) {
          const res = await apiClient.patch('/users/update-profile', { language: newLang });
          if (res.data?.user) {
            updateUser(res.data.user);
          }
        }
      } catch (error) {
        console.error('Failed to sync language:', error);
      }
    }
  };

  /**
   * Translate function
   * @param {string} key - Key in JSON file (e.g., 'common.login')
   * @param {object} params - Key-value pairs for interpolation
   * @returns {string} - Translated text
   */
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let result = translations[language];
    
    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        result = key; // Fallback to key if not found
        break;
      }
    }

    if (typeof result === 'string') {
      Object.keys(params).forEach(p => {
        result = result.replace(new RegExp(`{{${p}}}`, 'g'), params[p]);
      });
    }

    return result;
  };

  const value = {
    language,
    changeLanguage,
    t,
    loading
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
