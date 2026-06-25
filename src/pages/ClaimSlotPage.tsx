import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ClaimSlotPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleClaim = async () => {
    setStatus('claiming');
    try {
      const res = await fetch(`/api/claim/${token}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error);
      }
    } catch (e) {
      setStatus('error');
      setMessage("An unexpected error occurred.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
        <div className="bg-primary px-6 py-8 text-center text-primary-foreground">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 opacity-90" />
          <h1 className="text-2xl font-bold">Last-Minute Slot</h1>
          <p className="mt-2 text-primary-foreground/80 text-sm">A patient cancelled, and you are next on the list!</p>
        </div>
        
        <div className="p-8 text-center">
          {status === 'idle' || status === 'claiming' ? (
            <>
              <p className="mb-8 text-gray-600">This slot is available right now. Click below to claim it before someone else does!</p>
              <Button 
                size="lg" 
                className="w-full text-lg h-14" 
                onClick={handleClaim} 
                disabled={status === 'claiming'}
              >
                {status === 'claiming' ? 'Claiming...' : 'Claim Slot Now'}
              </Button>
            </>
          ) : status === 'success' ? (
            <div className="py-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Slot Claimed!</h2>
              <p className="mt-2 text-gray-500">{message}</p>
            </div>
          ) : (
            <div className="py-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Oops!</h2>
              <p className="mt-2 text-gray-500">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
