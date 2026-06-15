import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  fullName?: string;
  role?: string;
  college_name?: string;
  collegeName?: string;
  course?: string;
  avatar_url?: string;
  avatarUrl?: string;
  onboarding_complete?: boolean;
  onboardingComplete?: boolean;
  plan?: string;
  trial_used?: boolean;
  skill_level?: string;
  bio?: string;
  username?: string;
  location?: string;
  website?: string;
  notification_preferences?: Record<string, boolean>;
  profile_views?: number;
  is_profile_public?: boolean;
  blueprint_attribution?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminRole: string | null;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isAdmin: false,
  adminRole: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);

  const fetchProfile = async (accessToken: string) => {
    try {
      const res = await fetch("/api/profiles/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
    }
  };

  const checkAdmin = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/check/${userId}`);
      if (res.ok) {
        const { isAdmin: admin, role } = await res.json();
        setIsAdmin(!!admin);
        setAdminRole(role ?? null);
      }
    } catch {
      setIsAdmin(false);
      setAdminRole(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) {
        Promise.all([
          fetchProfile(session.access_token),
          checkAdmin(session.user.id),
        ]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) {
        await Promise.all([
          fetchProfile(session.access_token),
          checkAdmin(session.user!.id),
        ]);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setAdminRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsAdmin(false);
    setAdminRole(null);
  };

  const refreshProfile = async () => {
    if (session?.access_token) {
      await fetchProfile(session.access_token);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      if (!session?.access_token) throw new Error("Not authenticated");
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const updated = await res.json();
      setProfile(updated);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isAdmin, adminRole, signUp, signIn, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
