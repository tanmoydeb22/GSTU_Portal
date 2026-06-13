import { Outlet } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Header from '../components/shared/Header';
import { LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, Layers, ClipboardCheck, FileSpreadsheet, Upload, History, FileText, CreditCard, Bell, ClipboardList } from 'lucide-react';

const navItems = [
  { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/staff/fees', label: 'Fee Structure', icon: FileText },
  { path: '/staff/payments', label: 'Payments', icon: CreditCard },
  { path: '/staff/teachers', label: 'Teachers', icon: Users },
  { path: '/staff/students', label: 'Students', icon: GraduationCap },
  { path: '/staff/courses', label: 'Course List', icon: BookOpen },
  { path: '/staff/semesters', label: 'Semesters', icon: Calendar },
  { path: '/staff/offerings', label: 'Course Offering', icon: Layers },
  { path: '/staff/grades', label: 'Grade Entry', icon: ClipboardCheck },
  { path: '/staff/historical-data', label: 'Historical Data', icon: History },
  { path: '/staff/enrollments', label: 'Enrollments', icon: FileSpreadsheet },
  { path: '/staff/bulk-upload', label: 'Bulk Upload', icon: Upload },
  { path: '/staff/reports', label: 'Reports', icon: FileText },
  { path: '/staff/notifications', label: 'Notifications', icon: Bell },
  { path: '/staff/notices', label: 'Manage Notices', icon: ClipboardList },
  { path: '/staff/notice-board', label: 'Notice Board', icon: ClipboardList },
];

import BottomNav from '../components/shared/BottomNav';

export default function StaffLayout() {
  return (
    <div className="flex print:block h-screen print:h-auto print:bg-white bg-brand-50 dot-grid">
      <Sidebar items={navItems} title="Section Officer" />
      <div className="flex-1 print:block flex flex-col overflow-hidden print:overflow-visible">
        <Header />
        <main className="flex-1 print:block overflow-y-auto overflow-x-hidden print:overflow-visible p-4 pb-20 lg:p-6 lg:pb-0 print:p-0 bg-transparent">
          <Outlet />
        </main>
        <BottomNav items={[
          navItems.find(i => i.path === '/staff/dashboard'),
          navItems.find(i => i.path === '/staff/offerings'),
          navItems.find(i => i.path === '/staff/payments'),
          navItems.find(i => i.path === '/staff/reports'),
          ...navItems.filter(i => !['/staff/dashboard', '/staff/offerings', '/staff/payments', '/staff/reports'].includes(i.path))
        ]} />
      </div>
    </div>
  );
}
