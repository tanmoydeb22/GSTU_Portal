import { Menu, LogOut, HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useUIStore from '../../store/useUIStore';
import NotificationBell from './NotificationBell';
import useSocket from '../../hooks/useSocket';

const roleBadge = {
  admin:     { label: 'Admin',           bg: 'bg-red-500/10 text-red-600 border-red-500/20' },
  dept_staff:{ label: 'Section Officer', bg: 'bg-brand-500/10 text-brand-700 border-brand-500/20' },
  teacher:   { label: 'Teacher',         bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  student:   { label: 'Student',         bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
};

export default function Header() {
  const { user, role, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const location = useLocation();
  const rb = roleBadge[role] || roleBadge.student;

  // Initialize Socket.io connection and notification listeners
  useSocket();

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard Overview';
    if (path.includes('/registration')) return 'Semester Course Registration';
    if (path.includes('/retake-improvement')) return 'Retake & Improvement Application';
    if (path.includes('/my-courses')) return 'My Enrolled Courses';
    if (path.includes('/payment/history')) return 'Transaction & Payment History';
    if (path.includes('/payment')) return 'Semester Fees & Payments';
    if (path.includes('/transcript')) return 'Official Academic Transcript';
    if (path.includes('/notifications')) return 'Notifications';
    if (path.includes('/broadcast')) return 'Broadcast Notice';

    // Department Staff specific views
    if (path.includes('/staff/teachers')) return 'Academic Faculty Members';
    if (path.includes('/staff/students')) return 'Enrolled Students Directory';
    if (path.includes('/staff/courses')) return 'Department Course Catalog';
    if (path.includes('/staff/semesters')) return 'Semester Registration Setup';
    if (path.includes('/staff/offerings')) return 'Active Course Offerings';
    if (path.includes('/staff/grade-entry') || path.includes('/staff/grades')) return 'Academic Grade Entry Desk';
    if (path.includes('/staff/enrollments')) return 'Student Enrolled Courses';
    if (path.includes('/staff/bulk-upload')) return 'Bulk Import Student Records';
    if (path.includes('/staff/reports') || path.includes('/staff/result-report')) return 'Academic Result Reports';
    if (path.includes('/staff/fees')) return 'Fee Structure Setup';
    if (path.includes('/staff/payments')) return 'Student Payment Records';

    if (path.includes('/profile')) {
      if (role === 'teacher') return 'Teacher Profile & Details';
      if (role === 'dept_staff') return 'Staff Profile & Details';
      if (role === 'admin') return 'Admin Profile & Details';
      return 'Student Profile & Details';
    }
    return 'GSTU Portal';
  };

  const getWorkspaceName = () => {
    if (role === 'student') return 'Student Workspace';
    if (role === 'teacher') return 'Faculty Member Desk';
    if (role === 'dept_staff') return 'Section Officer Desk';
    return 'Administrator Panel';
  };

  return (
    <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 lg:px-6 h-14 lg:h-auto lg:py-4 flex items-center shadow-sm">
      <div className="flex items-center justify-between w-full gap-4">
        
        {/* Left Side: Dynamic Section Title */}
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-left min-w-0">
            <p className="text-[10px] font-bold text-gray-400 lg:text-brand-600 uppercase tracking-wide lg:tracking-widest leading-none mb-0.5 lg:mb-1">
              {getWorkspaceName()}
            </p>
            <h2 className="font-display font-extrabold text-gray-900 truncate text-sm lg:text-lg leading-tight tracking-tight">
              {getPageTitle()}
            </h2>
          </div>
        </div>

        {/* Right Side: Profile & Actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Help Button */}
          <button onClick={() => window.dispatchEvent(new Event('start-tour'))}
            className="hidden sm:block p-2 rounded-xl text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all duration-200" title="Help / Tour">
            <HelpCircle className="h-5 w-5" />
          </button>

          {/* Notification Bell */}
          <NotificationBell />
          
          {/* User Profile unified card */}
          <div className="flex items-center gap-2.5 lg:bg-gray-50 lg:border lg:border-gray-100 rounded-xl lg:p-1.5 lg:pr-3">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full overflow-hidden border-2 border-green-200 flex-shrink-0 relative">
              {user?.photo_url ? (
                <img
                  src={`${(import.meta.env.VITE_API_URL || 'http://localhost:5001').replace('/api', '')}${user.photo_url}`}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div
                className="w-full h-full bg-green-600 items-center justify-center text-white font-bold text-sm"
                style={{ display: user?.photo_url ? 'none' : 'flex' }}
              >
                {initials}
              </div>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-bold text-gray-800 leading-snug">{user?.name || 'User'}</p>
              <span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">{rb.label}</span>
            </div>
          </div>

          {/* Logout button */}
          <button onClick={logout}
            className="hidden sm:block p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200" title="Logout">
            <LogOut className="h-4.5 w-4.5" />
          </button>

        </div>
      </div>
    </header>
  );
}
