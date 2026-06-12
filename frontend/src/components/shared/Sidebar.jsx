import { NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import useUIStore from '../../store/useUIStore';
import { getNotices } from '../../api/notice.api';

export default function Sidebar({ items, title = 'GSTU Portal' }) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const location = useLocation();
  const [hasNewNotices, setHasNewNotices] = useState(false);

  useEffect(() => {
    // Check for new notices
    getNotices('All', 1, 1).then(res => {
      const notices = res.data.data;
      if (notices && notices.length > 0) {
        const latestNoticeTime = new Date(notices[0].published_at).getTime();
        const lastViewed = localStorage.getItem('last_viewed_notices');
        if (!lastViewed || latestNoticeTime > parseInt(lastViewed)) {
          setHasNewNotices(true);
        }
      }
    }).catch(() => {});
  }, []);

  const handleNavClick = (path) => {
    if (path.includes('/notice-board') || path.includes('/notices')) {
      localStorage.setItem('last_viewed_notices', Date.now().toString());
      setHasNewNotices(false);
    }
    if (window.innerWidth < 1024) toggleSidebar();
  };

  return (
    <>
      <aside className="no-print hidden lg:flex fixed top-0 left-0 z-50 h-full bg-white border-r border-brand-100 shadow-sm w-64 flex-col lg:static lg:z-0">

        {/* Logo area */}
        <div className="relative py-4 px-5 bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-br-3xl shadow-md mb-3">
          <button onClick={toggleSidebar} className="lg:hidden absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3.5">
            {/* Logo with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 blur-xl rounded-full"></div>
              <div className="relative w-11 h-11 bg-white rounded-2xl shadow-xl flex items-center justify-center transform hover:rotate-12 transition-transform p-1">
                <img src="/gstu_logo.png" alt="GSTU" className="h-full w-full object-cover rounded-xl" />
              </div>
            </div>
            
            {/* Text */}
            <div>
              <h1 className="text-white text-base font-bold tracking-tight font-display">
                {title}
              </h1>
              <p className="text-green-100 text-[9px] font-semibold tracking-wider uppercase mt-0.5">
                Course Registration
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav flex-1 overflow-y-auto py-1.5 space-y-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.endsWith('/dashboard') || item.path === '/student/payment'}
              onClick={() => handleNavClick(item.path)}
              className={({ isActive }) => {
                const isResultBoardActive = item.path === '/student/results/board' && location.pathname.includes('/student/results/individual');
                const customIsActive = isActive || isResultBoardActive;
                return `group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12.5px] font-semibold transition-all duration-200 relative ${
                  customIsActive
                    ? 'bg-brand-50 text-brand-700 font-bold border border-brand-500/30'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`;
              }}
            >
              {({ isActive }) => {
                const isResultBoardActive = item.path === '/student/results/board' && location.pathname.includes('/student/results/individual');
                const customIsActive = isActive || isResultBoardActive;
                return (
                <>
                  {customIsActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4.5 bg-brand-500 rounded-r-full" />
                  )}
                  <item.icon className={`h-[16px] w-[16px] flex-shrink-0 transition-all duration-200 ${customIsActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-brand-500'}`} />
                  <span className="transition-all duration-200">{item.label}</span>
                  {hasNewNotices && (item.path.includes('/notice-board') || item.path.includes('/notices')) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  )}
                </>
                );
              }}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-2 flex flex-col items-center">
          <div className="w-12 h-[3px] bg-brand-400/80 rounded-full mb-2 shadow-brand-glow-sm" />
          <p className="text-[10px] text-gray-400 text-center font-bold tracking-widest uppercase">© 2026 GSTU PORTAL</p>
        </div>
      </aside>
    </>
  );
}
