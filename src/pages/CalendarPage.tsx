import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider.tsx';
import { Service, Appointment } from '../types.ts';
import { format, startOfWeek, addDays, addHours, startOfDay, parseISO, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function CalendarPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isNewApptOpen, setIsNewApptOpen] = useState(false);

  // Form State
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [apptDate, setApptDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [apptTime, setApptTime] = useState("09:00");

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [apptsRes, srvsRes] = await Promise.all([
        fetch('/api/appointments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAppointments(await apptsRes.json());
      setServices(await srvsRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) {
      toast.error("Please select a service.");
      return;
    }
    try {
      const startTime = new Date(`${apptDate}T${apptTime}`);
      const service = services.find(s => s.id === parseInt(serviceId));
      if (!service) return;
      
      const endTime = new Date(startTime.getTime() + service.durationMinutes * 60000);

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientName,
          patientPhone,
          serviceId: parseInt(serviceId),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
      });

      if (res.ok) {
        toast.success("Appointment created");
        setIsNewApptOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create appointment");
    }
  };

  const handleCancelAppointment = async (id: number) => {
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Canceled. Waitlist auto-fill triggered! Notified ${data.notified} patients.`);
        fetchData();
      } else {
        toast.error(data.error || "Failed to cancel");
      }
    } catch (e) {
      toast.error("Failed to cancel");
    }
  };

  // Basic Calendar View
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 5 }).map((_, i) => addDays(weekStart, i)); // Mon-Fri
  const hours = Array.from({ length: 9 }).map((_, i) => addHours(startOfDay(today), i + 9)); // 9 AM to 5 PM

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Calendar <span className="text-sm font-normal text-slate-400 ml-2">{format(today, 'EEEE, MMM d')}</span>
        </h1>
        <div className="flex space-x-4 items-center">
          <Dialog open={isNewApptOpen} onOpenChange={setIsNewApptOpen}>
            <DialogTrigger asChild>
              <Button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm">New Appointment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Book Appointment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAppointment} className="space-y-4 pt-4">
                <div>
                  <Label>Patient Name</Label>
                  <Input value={patientName} onChange={e => setPatientName(e.target.value)} required />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input type="tel" placeholder="+1234567890" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} required />
                </div>
                <div>
                  <Label>Service</Label>
                  <Select value={serviceId || undefined} onValueChange={setServiceId}>
                    <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>
                      {services.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.durationMinutes}m)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full">Book Slot</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Weekly Schedule</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-6 divide-x border-b bg-gray-50/50 min-w-[600px]">
            <div className="p-4 text-center text-sm font-medium text-gray-500 sticky left-0 bg-gray-50/50 z-10">Time</div>
            {days.map(day => (
              <div key={day.toISOString()} className="p-4 text-center">
                <div className="text-sm font-medium text-slate-700">{format(day, 'EEEE')}</div>
                <div className="text-xs text-slate-400">{format(day, 'MMM d')}</div>
              </div>
            ))}
          </div>
          <div className="divide-y min-w-[600px]">
            {hours.map(hour => (
              <div key={hour.toISOString()} className="grid grid-cols-6 divide-x">
                <div className="p-4 text-center font-mono text-sm text-slate-400 sticky left-0 bg-white z-10 border-r">{format(hour, 'h:mm a')}</div>
                {days.map(day => {
                  const cellTime = new Date(day);
                  cellTime.setHours(hour.getHours(), 0, 0, 0);
                  
                  const cellAppts = appointments.filter(a => {
                    const aStart = parseISO(a.startTime);
                    return isSameDay(aStart, cellTime) && aStart.getHours() === cellTime.getHours() && a.status === 'BOOKED';
                  });
  
                  return (
                    <div key={day.toISOString()} className="relative p-2 h-24">
                      {cellAppts.map(appt => (
                        <div key={appt.id} className="absolute inset-x-2 top-2 rounded-lg bg-indigo-50/50 border border-indigo-100 p-2 text-xs transition-colors hover:border-indigo-200">
                          <div className="font-bold text-slate-700 truncate">{appt.patientName}</div>
                          <div className="text-[10px] text-slate-500 truncate">{appt.service?.name}</div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-1 h-6 w-full text-[10px] font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded shadow-sm shadow-red-100 border border-red-100/50 bg-white"
                            onClick={() => handleCancelAppointment(appt.id)}
                          >
                            CANCEL SLOT
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
