import { Outlet } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Header from '../components/shared/Header';
import BottomNav from '../components/shared/BottomNav';
import { LayoutDashboard, BookOpen, FileText, ClipboardList, UserCircle, RefreshCw, Library, CreditCard, History, GraduationCap, Bell, FileBarChart } from 'lucide-react';

const navItems = [
  { path: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/student/registration', label: 'Registration', icon: BookOpen },
  { path: '/student/retake-improvement', label: 'Retake/Improvement', icon: RefreshCw },
  { path: '/student/my-courses', label: 'My Courses', icon: Library },
  { path: '/student/payment', label: 'Payment', icon: CreditCard },
  { path: '/student/payment/history', label: 'Payment History', icon: History },
  { path: '/student/transcript', label: 'Transcript', icon: FileText },
  { path: '/student/results/board', label: 'Result Board', icon: FileBarChart },
  { path: '/student/profile', label: 'Profile', icon: UserCircle },
  { path: '/student/notifications', label: 'Notifications', icon: Bell },
  { path: '/student/notices', label: 'Notice Board', icon: ClipboardList },
];

export default function StudentLayout() {
  return (
    <div className="flex print:block h-screen print:h-auto print:bg-white bg-brand-50 dot-grid">
      <Sidebar items={navItems} title="Student Portal" />
      <div className="flex-1 print:block flex flex-col overflow-hidden print:overflow-visible">
        <Header />
        <main className="flex-1 print:block overflow-y-auto overflow-x-hidden print:overflow-visible p-4 pb-20 lg:p-6 lg:pb-0 print:p-0 bg-transparent"><Outlet /></main>
        <BottomNav />
      </div>
    </div>
  );
}
