import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase.ts';
import { Organization } from '../types.ts';

type AuthContextType = {
  user: FirebaseUser | null;
  loading: boolean;
  token: string | null;
  organization: Organization | null;
  refreshOrg: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  organization: null,
  refreshOrg: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrg = async (t: string) => {
    try {
      const res = await fetch('/api/organization', {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrganization(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const t = await u.getIdToken();
        setToken(t);
        setUser(u);
        // Sync user
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}` }
        });
        await fetchOrg(t);
      } else {
        setUser(null);
        setToken(null);
        setOrganization(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, token, organization, refreshOrg: async () => { if(token) await fetchOrg(token) } }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
