import { useState, useEffect } from 'react';
import { getNotices } from '../../api/notice.api';
import { Pin, Calendar, User, FileText, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'General', 'Exam', 'Registration', 'Holiday', 'Result', 'Important'];

const CATEGORY_COLORS = {
  'General': 'bg-blue-100 text-blue-800 border-blue-200',
  'Exam': 'bg-orange-100 text-orange-800 border-orange-200',
  'Registration': 'bg-green-100 text-green-800 border-green-200',
  'Holiday': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Result': 'bg-purple-100 text-purple-800 border-purple-200',
  'Important': 'bg-red-100 text-red-800 border-red-200 animate-pulse',
};

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  useEffect(() => {
    fetchNotices();
  }, [category, page]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await getNotices(category, page, 10);
      setNotices(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const pinnedNotices = notices.filter(n => n.is_pinned);
  const regularNotices = notices.filter(n => !n.is_pinned);

  const NoticeCard = ({ notice }) => (
    <div className={`bg-white rounded-xl border p-6 shadow-sm transition-all hover:shadow-md ${notice.is_pinned ? 'border-brand-300 bg-brand-50/30' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${CATEGORY_COLORS[notice.category] || CATEGORY_COLORS['General']}`}>
            {notice.category}
          </span>
          {notice.is_pinned && (
            <span className="flex items-center gap-1 text-brand-600 text-xs font-bold bg-brand-100 px-2 py-1 rounded-md">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
        </div>
        <div className="text-right text-xs text-gray-500 flex flex-col gap-1 items-end">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(notice.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {notice.published_by_name || 'Admin'}
          </div>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-3">{notice.title}</h3>
      
      <div 
        className="text-gray-600 text-sm prose prose-sm max-w-none prose-p:my-1 prose-a:text-brand-600 mb-4"
        dangerouslySetInnerHTML={{ __html: notice.content }}
      />

      {notice.attachment_url && (
        <div className="mt-4 pt-4 border-t flex items-center">
          <a 
            href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'}${notice.attachment_url}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 px-4 py-2 rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            View Attachment
            <Download className="h-4 w-4 ml-2" />
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-brand-100 p-3 rounded-xl">
            <FileText className="h-6 w-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notice Board</h1>
            <p className="text-sm text-gray-500">Official announcements and updates</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => { setCategory(c); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${category === c ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : notices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No notices found for this category.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {pinnedNotices.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Pin className="h-4 w-4" /> Pinned Notices
              </h2>
              <div className="space-y-4">
                {pinnedNotices.map(n => <NoticeCard key={n.notice_id} notice={n} />)}
              </div>
            </div>
          )}

          {regularNotices.length > 0 && (
            <div className="space-y-4">
              {pinnedNotices.length > 0 && <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-8">Recent Notices</h2>}
              <div className="space-y-4">
                {regularNotices.map(n => <NoticeCard key={n.notice_id} notice={n} />)}
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-6">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border bg-white disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-gray-600">
                Page {page} of {pagination.totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 rounded-xl border bg-white disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
