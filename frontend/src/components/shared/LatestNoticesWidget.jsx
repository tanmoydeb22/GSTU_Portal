import { useState, useEffect } from 'react';
import { getNotices } from '../../api/notice.api';
import { Pin, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotificationSkeleton } from './../ui/Skeletons';

export default function LatestNoticesWidget({ roleBasePath }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getNotices('All', 1, 3),
      new Promise(resolve => setTimeout(resolve, 400))
    ])
      .then(([res]) => setNotices(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-5 h-full shadow-sm flex flex-col">
        <h3 className="font-bold text-gray-900 mb-4">Latest Notices</h3>
        <div className="space-y-4">
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Latest Notices</h3>
        <Link to={`${roleBasePath}/notices`} className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center">
          View All <ChevronRight className="h-3 w-3 ml-0.5" />
        </Link>
      </div>

      {notices.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-gray-400 text-sm italic">No recent announcements</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          {notices.map(n => (
            <div key={n.notice_id} className={`p-3 rounded-xl border transition-colors hover:bg-gray-50 ${n.is_pinned ? 'bg-brand-50/30 border-brand-200' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${n.category === 'Important' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {n.category}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(n.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h4 className="font-bold text-sm text-gray-800 line-clamp-2 flex items-start gap-1.5">
                {n.is_pinned === 1 && <Pin className="h-3.5 w-3.5 text-brand-500 shrink-0 mt-0.5" />}
                {n.title}
              </h4>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
