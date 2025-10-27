import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { loadCachedPerms, saveCachedPerms, clearCachedPerms } from '../lib/permissionsCache';
import { fetchPermissions as fetchPermsFromAPI } from '../lib/permissionsClient';

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
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user had "remember me" unchecked and browser was closed
      const rememberMe = localStorage.getItem('edenRememberMe');
      const hasTemporaryFlag = sessionStorage.getItem('edenTemporarySession');
      
      // If session exists but remember-me was false and no temporary flag, user closed browser - log them out
      if (session && rememberMe === 'false' && !hasTemporaryFlag) {
        await supabase.auth.signOut();
        localStorage.removeItem('edenAuthToken');
        clearCachedPerms();
        setSession(null);
        setUser(null);
        setPermissions([]);
        setRoles([]);
        setIsLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.access_token) {
        localStorage.setItem('edenAuthToken', session.access_token);
        
        // Try cache first for instant UI
        const cached = loadCachedPerms();
        if (cached) {
          setPermissions(cached.permissions);
          setRoles(cached.roles);
        }
        
        // Always refresh in background to stay current
        try {
          const fresh = await fetchPermsFromAPI(session.access_token);
          setPermissions(fresh.permissions);
          setRoles(fresh.roles);
          saveCachedPerms(fresh);
        } catch (error) {
          console.warn('Permission refresh failed', error);
          // Cached view is better than nothing
        }
      } else {
        localStorage.removeItem('edenAuthToken');
        setPermissions([]);
        setRoles([]);
        clearCachedPerms();
      }
      
      setIsLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.access_token) {
        localStorage.setItem('edenAuthToken', session.access_token);
        
        // Immediate refresh on auth state changes
        try {
          const fresh = await fetchPermsFromAPI(session.access_token);
          setPermissions(fresh.permissions);
          setRoles(fresh.roles);
          saveCachedPerms(fresh);
        } catch (error) {
          console.warn('Permission refresh failed', error);
        }
      } else {
        localStorage.removeItem('edenAuthToken');
        setPermissions([]);
        setRoles([]);
        clearCachedPerms();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    if (data.session?.access_token) {
      localStorage.setItem('edenAuthToken', data.session.access_token);
      
      try {
        const fresh = await fetchPermsFromAPI(data.session.access_token);
        setPermissions(fresh.permissions);
        setRoles(fresh.roles);
        saveCachedPerms(fresh);
      } catch (err) {
        console.warn('Permission fetch failed on sign in', err);
      }
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
      
      try {
        const fresh = await fetchPermsFromAPI(data.session.access_token);
        setPermissions(fresh.permissions);
        setRoles(fresh.roles);
        saveCachedPerms(fresh);
      } catch (err) {
        console.warn('Permission fetch failed on sign up', err);
      }
    }
    
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    localStorage.removeItem('edenAuthToken');
    setPermissions([]);
    setRoles([]);
    clearCachedPerms();
  };

  // Memoized permission set for fast lookups
  const permSet = useMemo(() => new Set(permissions || []), [permissions]);

  // Memoized permission checker
  const hasPermission = useMemo(
    () => (perm) => permSet.has(perm),
    [permSet]
  );

  const value = useMemo(
    () => ({
      session,
      user,
      permissions,
      roles,
      isLoading,
      signIn,
      signOut,
      signUp,
      hasPermission
    }),
    [session, user, permissions, roles, isLoading, signIn, signOut, signUp, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
