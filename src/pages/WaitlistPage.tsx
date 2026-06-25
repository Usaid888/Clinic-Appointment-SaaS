import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider.tsx';
import { Service, WaitlistEntry } from '../types.ts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function WaitlistPage() {
  const { token } = useAuth();
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [wlRes, srvsRes] = await Promise.all([
        fetch('/api/waitlist', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setWaitlist(await wlRes.json());
      setServices(await srvsRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) {
      toast.error("Please select a service.");
      return;
    }
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientName, phone, serviceId: parseInt(serviceId) })
      });
      if (res.ok) {
        toast.success("Patient added to waitlist");
        setIsOpen(false);
        fetchData();
        setPatientName("");
        setPhone("");
      }
    } catch (e) {
      toast.error("Failed to add to waitlist");
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/waitlist/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success("Status updated");
        fetchData();
      } else {
        toast.error("Failed to update status");
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Priority Waitlist <span className="text-sm font-normal text-slate-400 ml-2">Active</span></h1>
        <div className="flex space-x-4 items-center">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm">Add Waitlist Patient</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Patient</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddWaitlist} className="space-y-4 pt-4">
              <div>
                <Label>Patient Name</Label>
                <Input value={patientName} onChange={e => setPatientName(e.target.value)} required />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input type="tel" placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div>
                <Label>Service Requested</Label>
                <Select value={serviceId || undefined} onValueChange={setServiceId}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Add Patient</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </header>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Waitlist Candidates</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Date / Time</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {waitlist.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-8 text-sm">Waitlist is empty.</td></tr>
              ) : waitlist.map((entry, index) => (
                <tr key={entry.id} className={entry.status === 'PENDING' ? "bg-indigo-50/30" : ""}>
                  <td className={`px-4 py-3 text-xs font-bold ${entry.status === 'PENDING' ? 'text-indigo-500' : 'text-slate-300'}`}>
                    {(index + 1).toString().padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-bold text-slate-800">{entry.patientName}</div>
                    <div className="text-[10px] text-slate-400">Service: {entry.service?.name}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-500">
                    {format(parseISO(entry.createdAt), 'MMM d, h:mm a')}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{entry.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      entry.status === 'WAITING' ? 'bg-slate-100 text-slate-500' :
                      entry.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      entry.status === 'CLAIMED' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {entry.status === 'WAITING' && (
                      <Button size="sm" variant="outline" className="text-xs h-7 mr-2" onClick={() => handleUpdateStatus(entry.id, 'PENDING')}>Arrived</Button>
                    )}
                    {entry.status === 'PENDING' && (
                      <Button size="sm" variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-7" onClick={() => handleUpdateStatus(entry.id, 'CLAIMED')}>Complete</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
