import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider.tsx';
import { Service } from '../types.ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { token, organization } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('50');

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } });
      setServices(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, durationMinutes: duration, price })
      });
      if (res.ok) {
        toast.success("Service added");
        setName('');
        setDuration('30');
        setPrice('50');
        fetchData();
      } else {
        toast.error("Failed to add service");
      }
    } catch (e) {
      toast.error("Failed to add service");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings <span className="text-sm font-normal text-slate-400 ml-2">Clinic Configuration</span></h1>
      </header>

      <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider mb-4">Add New Service</h2>
          <form onSubmit={handleAddService} className="space-y-4">
            <div>
              <Label>Service Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Deep Tissue Massage" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (Minutes)</Label>
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} required />
              </div>
              <div>
                <Label>Price ($)</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm h-auto">Add Service</Button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden max-h-full">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Active Services</h2>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <th className="px-4 py-2">Service</th>
                  <th className="px-4 py-2">Duration</th>
                  <th className="px-4 py-2">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {services.length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-slate-500 py-8 text-sm">No services defined yet.</td></tr>
                ) : services.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.durationMinutes} min</td>
                    <td className="px-4 py-3 text-xs text-slate-600">${s.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
