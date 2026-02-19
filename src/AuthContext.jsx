import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [profileData, setProfileData] = useState(null); // cached step_one_data

  /** Fetch the profile row and decide onboarding status */
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('step_one_data')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error.message);
        setIsOnboardingComplete(false);
        setProfileData(null);
        return;
      }

      const d = data?.step_one_data;
      // Onboarding is complete only when step_one_data is a non-empty object
      const complete = d != null && typeof d === 'object' && Object.keys(d).length > 0;
      setIsOnboardingComplete(complete);
      setProfileData(complete ? d : null);
    } catch (err) {
      console.error('Profile fetch exception:', err);
      setIsOnboardingComplete(false);
      setProfileData(null);
    }
  }, []);

  /** Save wizard data to profiles table and mark onboarding complete */
  const saveOnboardingData = useCallback(async (userId, wizardData) => {
    const { error } = await supabase
      .from('profiles')
      .update({ step_one_data: wizardData })
      .eq('id', userId);

    if (error) {
      console.error('Failed to save onboarding data:', error.message);
      throw error;
    }

    setIsOnboardingComplete(true);
    setProfileData(wizardData);
  }, []);

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        // Logged out — reset onboarding state
        setIsOnboardingComplete(false);
        setProfileData(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsOnboardingComplete(false);
    setProfileData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signOut,
        isOnboardingComplete,
        setIsOnboardingComplete,
        profileData,
        saveOnboardingData,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
