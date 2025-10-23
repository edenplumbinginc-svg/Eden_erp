import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.access_token) {
        localStorage.setItem('edenAuthToken', session.access_token);
        fetchPermissions(session.access_token);
      } else {
        localStorage.removeItem('edenAuthToken');
        setPermissions([]);
      }
      
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.access_token) {
        localStorage.setItem('edenAuthToken', session.access_token);
        fetchPermissions(session.access_token);
      } else {
        localStorage.removeItem('edenAuthToken');
        setPermissions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPermissions = async (token) => {
    try {
      const response = await api.get('/me/permissions', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setPermissions(response.data.permissions || []);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setPermissions([]);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    if (data.session?.access_token) {
      localStorage.setItem('edenAuthToken', data.session.access_token);
      await fetchPermissions(data.session.access_token);
    }
    
    return data;
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    
    if (data.session?.access_token) {
      localStorage.setItem('edenAuthToken', data.session.access_token);
      await fetchPermissions(data.session.access_token);
    }
    
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    localStorage.removeItem('edenAuthToken');
    setPermissions([]);
  };

  const value = {
    session,
    user,
    permissions,
    isLoading,
    signIn,
    signOut,
    signUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
