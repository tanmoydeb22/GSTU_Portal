import { Outlet } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Header from '../components/shared/Header';
import { LayoutDashboard, Building2, Users, GraduationCap, UserCheck, Upload, Bell, Megaphone, ClipboardList, Settings } from 'lucide-react';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/departments', label: 'Departments', icon: Building2 },
  { path: '/admin/staff', label: 'Dept Staff', icon: UserCheck },
  { path: '/admin/users', label: 'User Management', icon: Users },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell },
  { path: '/admin/broadcast', label: 'Broadcast Notice', icon: Megaphone },
  { path: '/admin/notices', label: 'Manage Notices', icon: ClipboardList },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  return (
    <div className="flex print:block h-screen print:h-auto print:bg-white bg-brand-50 dot-grid">
      <Sidebar items={navItems} title="Admin Panel" />
      <div className="flex-1 print:block flex flex-col overflow-hidden print:overflow-visible">
        <Header />
        <main className="flex-1 print:block overflow-y-auto print:overflow-visible p-4 lg:p-6 print:p-0 bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
