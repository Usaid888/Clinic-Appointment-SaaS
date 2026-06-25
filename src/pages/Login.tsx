import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { useAuth } from '../components/AuthProvider.tsx';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Login() {
  const { user, loading } = useAuth();
  const [error, setError] = useState("");

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="mx-auto w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">SlotSaver</h1>
          <p className="mt-2 text-sm text-gray-500">Manage your clinic's waitlist automatically</p>
        </div>
        <Button onClick={handleLogin} className="w-full" size="lg">
          Sign in with Google
        </Button>
        {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
