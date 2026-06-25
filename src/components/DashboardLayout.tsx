import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider.tsx';
import { Calendar, Users, Settings, LogOut, CheckCircle } from 'lucide-react';
import { auth } from '../lib/firebase.ts';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DashboardLayout() {
  const { user, organization, token, refreshOrg } = useAuth();
  const location = useLocation();
  const [orgName, setOrgName] = useState("");

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: orgName })
    });
    await refreshOrg();
  };

  if (!organization) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="mx-auto w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold">Create your Clinic</h2>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <Label htmlFor="orgName">Clinic Name</Label>
              <Input id="orgName" value={orgName} onChange={e => setOrgName(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Create Clinic</Button>
          </form>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Waitlist', href: '/waitlist', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#0f172a] p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-indigo-500 p-2 rounded-lg flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight truncate" title={organization.name}>{organization.name}</span>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => auth.signOut()}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#0f172a] h-full p-6 flex-col border-r border-slate-200">
        <div className="flex items-center gap-3 mb-10 overflow-hidden">
          <div className="bg-indigo-500 p-2 rounded-lg flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight truncate" title={organization.name}>{organization.name}</span>
        </div>
        <nav className="space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">Main Menu</div>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={
                  isActive
                    ? "flex items-center gap-3 px-3 py-2 bg-indigo-500/10 text-indigo-400 rounded-md font-medium"
                    : "flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors"
                }
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-slate-800 pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white border-2 border-slate-700">
              {organization.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-white truncate max-w-[120px]">{user?.displayName || 'Admin'}</div>
              <div className="text-xs text-slate-500 truncate max-w-[120px]">{organization.name}</div>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 h-auto" onClick={() => auth.signOut()}>
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a] border-t border-slate-800 flex justify-around items-center p-2 z-10 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={
                isActive
                  ? "flex flex-col items-center gap-1 p-2 text-indigo-400 font-medium"
                  : "flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white transition-colors"
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
