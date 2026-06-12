import React, { createContext, useContext, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(async () => null);

export interface UserProfile {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  fullName?: string;
  role?: string;
  collegeName?: string;
  course?: string;
  year?: string;
  skillLevel?: string;
  bio?: string;
  onboardingComplete?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: () => { window.location.href = "/api/login"; },
  signOut: () => { window.location.href = "/api/logout"; },
  updateProfile: async () => ({ error: null }),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        await fetchProfile();
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await authFetch("/api/profiles/me");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const signIn = () => {
    window.location.href = "/api/login";
  };

  const signOut = () => {
    window.location.href = "/api/logout";
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      const res = await authFetch("/api/profiles/me", {
        method: "PATCH",
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
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
