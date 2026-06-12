import { useState, useEffect } from 'react';
import { getManageNotices, createNotice, updateNotice, deleteNotice, togglePinNotice } from '../../api/notice.api';
import { Pin, FileText, Plus, Trash2, Edit, X, Loader2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CATEGORIES = ['General', 'Exam', 'Registration', 'Holiday', 'Result', 'Important'];

export default function ManageNotices({ isDeptStaff = false }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    target_role: 'all',
    target_dept: '',
    is_pinned: false,
    is_active: true,
    expires_at: '',
  });
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await getManageNotices();
      setNotices(res.data.data);
    } catch (err) {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (notice = null) => {
    if (notice) {
      setEditingNotice(notice);
      setFormData({
        title: notice.title,
        content: notice.content,
        category: notice.category,
        target_role: notice.target_role,
        target_dept: notice.target_dept || '',
        is_pinned: notice.is_pinned === 1,
        is_active: notice.is_active === 1,
        expires_at: notice.expires_at ? new Date(notice.expires_at).toISOString().split('T')[0] : '',
      });
    } else {
      setEditingNotice(null);
      setFormData({
        title: '',
        content: '',
        category: 'General',
        target_role: 'all',
        target_dept: '',
        is_pinned: false,
        is_active: true,
        expires_at: '',
      });
    }
    setAttachment(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return toast.error('Title and content are required');

    const data = new FormData();
    data.append('title', formData.title);
    data.append('content', formData.content);
    data.append('category', formData.category);
    data.append('target_role', formData.target_role);
    data.append('target_dept', formData.target_dept || 'null');
    data.append('is_pinned', formData.is_pinned);
    data.append('is_active', formData.is_active);
    data.append('expires_at', formData.expires_at || 'null');
    if (attachment) data.append('attachment', attachment);

    try {
      setSubmitting(true);
      if (editingNotice) {
        await updateNotice(editingNotice.notice_id, data);
        toast.success('Notice updated successfully');
      } else {
        await createNotice(data);
        toast.success('Notice published successfully');
      }
      setIsModalOpen(false);
      fetchNotices();
    } catch (err) {
      toast.error('Failed to save notice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await deleteNotice(id);
      toast.success('Notice deleted');
      fetchNotices();
    } catch (err) {
      toast.error('Failed to delete notice');
    }
  };

  const handleTogglePin = async (id) => {
    try {
      await togglePinNotice(id);
      fetchNotices();
    } catch (err) {
      toast.error('Failed to toggle pin');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Notices</h1>
          <p className="text-sm text-gray-500">Create, edit, and manage announcements</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="font-bold">
          <Plus className="h-4 w-4 mr-2" /> New Notice
        </Button>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Target</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Published</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {notices.map(notice => (
                  <tr key={notice.notice_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {notice.is_pinned === 1 && <Pin className="h-3 w-3 text-brand-600" />}
                        {notice.title}
                      </div>
                      {notice.attachment_url && <div className="text-[10px] text-gray-400 flex items-center mt-1"><FileText className="h-3 w-3 mr-1" /> Has Attachment</div>}
                    </td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-bold">{notice.category}</span></td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      Role: {notice.target_role}<br />
                      Dept: {notice.dept_name || 'All'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${notice.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {notice.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(notice.published_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleTogglePin(notice.notice_id)} className={`p-2 rounded-lg transition-colors ${notice.is_pinned ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title={notice.is_pinned ? 'Unpin' : 'Pin'}>
                        <Pin className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleOpenModal(notice)} className="p-2 rounded-lg bg-gray-100 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(notice.notice_id)} className="p-2 rounded-lg bg-gray-100 text-red-600 hover:bg-red-100 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {notices.length === 0 && (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No notices found. Create one to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingNotice ? 'Edit Notice' : 'Create Notice'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border rounded-lg px-4 py-2" required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full border rounded-lg px-4 py-2 bg-white">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Target Role</label>
              <select value={formData.target_role} onChange={e => setFormData({ ...formData, target_role: e.target.value })} className="w-full border rounded-lg px-4 py-2 bg-white">
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="dept_staff">Dept Staff</option>
              </select>
            </div>
          </div>

          {!isDeptStaff && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Target Department ID (Optional, leave blank for all)</label>
              <input type="number" placeholder="e.g. 1" value={formData.target_dept} onChange={e => setFormData({ ...formData, target_dept: e.target.value })} className="w-full border rounded-lg px-4 py-2" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Expires At (Optional)</label>
              <input type="date" value={formData.expires_at} onChange={e => setFormData({ ...formData, expires_at: e.target.value })} className="w-full border rounded-lg px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Attachment (PDF/Image)</label>
              <input type="file" accept="image/*,application/pdf" onChange={e => setAttachment(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
            </div>
          </div>

          <div className="flex gap-6 py-2 border-y">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_pinned} onChange={e => setFormData({ ...formData, is_pinned: e.target.checked })} className="rounded text-brand-600 focus:ring-brand-500" />
              <span className="text-sm font-bold text-gray-700">Pin Notice</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="rounded text-brand-600 focus:ring-brand-500" />
              <span className="text-sm font-bold text-gray-700">Active</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Content</label>
            <div className="border rounded-xl overflow-hidden bg-white">
              <ReactQuill theme="snow" value={formData.content} onChange={val => setFormData({ ...formData, content: val })} className="h-64" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingNotice ? 'Update Notice' : 'Publish Notice')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
