import React, { createContext, useState, useEffect, useContext } from 'react';
import * as storage from '../api/storage';
import api from '../api/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await storage.getItem('userToken');
        const email = await storage.getItem('userEmail');
        if (token) {
          setUserToken(token);
          setUserEmail(email);
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, email: returnedEmail } = response.data;
      await storage.setItem('userToken', token);
      await storage.setItem('userEmail', returnedEmail || email);
      setUserToken(token);
      setUserEmail(returnedEmail || email);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erreur lors de la connexion' 
      };
    }
  };

  const register = async (email, password) => {
    try {
      const response = await api.post('/auth/register', { email, password });
      const { token, email: returnedEmail } = response.data;
      await storage.setItem('userToken', token);
      await storage.setItem('userEmail', returnedEmail || email);
      setUserToken(token);
      setUserEmail(returnedEmail || email);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || "Erreur lors de l'inscription" 
      };
    }
  };

  const logout = async () => {
    await storage.deleteItem('userToken');
    await storage.deleteItem('userEmail');
    setUserToken(null);
    setUserEmail(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, userEmail, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
