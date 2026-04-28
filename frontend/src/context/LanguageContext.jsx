import React, { createContext, useState, useContext, useEffect } from 'react';
import vi from '../locales/vi.json';
import en from '../locales/en.json';
import { useAuth } from './AuthContext';
import userApi from '../features/user/api/userApi';

const LanguageContext = createContext();

const translations = { vi, en };

export const LanguageProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('user_language') || 'vi';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Priority: User Profile > LocalStorage > Default (vi)
    const storedLang = localStorage.getItem('user_language');
    
    if (user?.language && translations[user.language]) {
      if (language !== user.language) {
        setLanguage(user.language);
        localStorage.setItem('user_language', user.language);
      }
      setLoading(false);
    } else if (storedLang && translations[storedLang]) {
      if (language !== storedLang) {
        setLanguage(storedLang);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [user?.language]);

  const changeLanguage = async (newLang) => {
    if (translations[newLang]) {
      setLanguage(newLang);
      localStorage.setItem('user_language', newLang);
      
      // Sync to backend if logged in
      if (user) {
        try {
          const res = await userApi.updateProfile({ language: newLang });
          if (res.data?.user) {
            updateUser(res.data.user);
          }
        } catch (err) {
          console.error('[Language Sync] Failed to save language to backend:', err);
        }
      }
    }
  };

  /**
   * Translate function
   * @param {string} key - Key in JSON file (e.g., 'common.login')
   * @param {object} params - Key-value pairs for interpolation (e.g., { name: 'Trung' })
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
      {!loading && children}
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
