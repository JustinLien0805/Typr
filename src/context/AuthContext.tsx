import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { firebaseAuth } from "../lib/firebase";

interface AppUserProfile {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AppUserProfile | null;
  loading: boolean;
  syncingProfile: boolean;
  error: string | null;
  getIdToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingProfile, setSyncingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setFirebaseUser(user);
      setError(null);

      if (!user) {
        setProfile(null);
        setSyncingProfile(false);
        setLoading(false);
        return;
      }

      setSyncingProfile(true);
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`${apiBaseUrl}/api/me`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load user profile");
        }

        const data = (await response.json()) as { user: AppUserProfile };
        setProfile(data.user);
      } catch (err) {
        setProfile(null);
        setError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        setSyncingProfile(false);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      syncingProfile,
      error,
      async getIdToken() {
        if (!firebaseAuth.currentUser) {
          return null;
        }
        return firebaseAuth.currentUser.getIdToken();
      },
      async signInWithGoogle() {
        setError(null);
        await signInWithPopup(firebaseAuth, googleProvider);
      },
      async signOut() {
        setError(null);
        await firebaseSignOut(firebaseAuth);
        setProfile(null);
      },
    }),
    [error, firebaseUser, loading, profile, syncingProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
