import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Library, UserCircle, Menu, X, FileText, ClipboardList, RefreshCw, CreditCard, History, FileBarChart, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mainTabs = [
  { path: '/student/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/student/registration', label: 'Register', icon: BookOpen },
  { path: '/student/my-courses', label: 'Courses', icon: Library },
  { path: '/student/profile', label: 'Profile', icon: UserCircle },
];

const moreTabs = [
  { path: '/student/retake-improvement', label: 'Retake', icon: RefreshCw },
  { path: '/student/payment', label: 'Payment', icon: CreditCard },
  { path: '/student/payment/history', label: 'Transactions', icon: History },
  { path: '/student/transcript', label: 'Transcript', icon: FileText },
  { path: '/student/results/board', label: 'Results', icon: FileBarChart },
  { path: '/student/notifications', label: 'Alerts', icon: Bell },
  { path: '/student/notices', label: 'Notices', icon: ClipboardList },
];

export default function BottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200/50 pt-2 pb-safe-bottom px-4 flex justify-around items-center shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)]">
        {mainTabs.map(tab => {
          const isActive = location.pathname.includes(tab.path);
          return (
            <NavLink key={tab.path} to={tab.path} onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1 relative w-12">
              {isActive && <motion.div layoutId="bottom-nav-indicator" className="absolute -top-3 w-6 h-1 bg-brand-500 rounded-b-full" />}
              <tab.icon className={`w-6 h-6 transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
              <span className={`text-[10px] font-bold ${isActive ? 'text-brand-700' : 'text-gray-500'}`}>{tab.label}</span>
            </NavLink>
          );
        })}
        
        <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-1 relative w-12">
          {menuOpen && <motion.div layoutId="bottom-nav-indicator" className="absolute -top-3 w-6 h-1 bg-brand-500 rounded-b-full" />}
          <Menu className={`w-6 h-6 transition-colors ${menuOpen ? 'text-brand-600' : 'text-gray-400'}`} />
          <span className={`text-[10px] font-bold ${menuOpen ? 'text-brand-700' : 'text-gray-500'}`}>Menu</span>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="lg:hidden fixed inset-0 z-40 bg-white/95 backdrop-blur-3xl flex flex-col pb-24 pt-12 px-6 overflow-y-auto shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-display font-bold text-gray-900">Explore</h2>
                <p className="text-sm text-gray-500">More portal features</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-3 bg-gray-100/80 rounded-full text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {moreTabs.map(tab => {
                const isActive = location.pathname.includes(tab.path);
                return (
                  <NavLink 
                    key={tab.path} 
                    to={tab.path} 
                    onClick={() => setMenuOpen(false)}
                    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border transition-all ${isActive ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'bg-white border-gray-100 text-gray-600 shadow-sm hover:border-gray-200 hover:shadow-md'}`}
                  >
                    <tab.icon className={`w-8 h-8 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold text-center">{tab.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
