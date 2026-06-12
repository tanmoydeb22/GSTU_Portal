import { Outlet } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Header from '../components/shared/Header';
import { LayoutDashboard, BookOpen, UserCircle, Bell, ClipboardList } from 'lucide-react';

const navItems = [
  { path: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/teacher/courses', label: 'My Courses', icon: BookOpen },
  { path: '/teacher/profile', label: 'Profile', icon: UserCircle },
  { path: '/teacher/notifications', label: 'Notifications', icon: Bell },
  { path: '/teacher/notices', label: 'Notice Board', icon: ClipboardList },
];

export default function TeacherLayout() {
  return (
    <div className="flex print:block h-screen print:h-auto print:bg-white bg-brand-50 dot-grid">
      <Sidebar items={navItems} title="Teacher Panel" />
      <div className="flex-1 print:block flex flex-col overflow-hidden print:overflow-visible">
        <Header />
        <main className="flex-1 print:block overflow-y-auto print:overflow-visible p-4 lg:p-6 print:p-0 bg-transparent"><Outlet /></main>
      </div>
    </div>
  );
}
