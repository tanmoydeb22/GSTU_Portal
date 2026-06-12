import { useState } from 'react';
import { Megaphone, Send, Users, GraduationCap, UserCheck, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../api/axios';

const ROLE_OPTIONS = [
  { value: 'all',        label: 'Everyone',            icon: Users,       desc: 'All roles across all departments' },
  { value: 'student',    label: 'All Students',        icon: GraduationCap, desc: 'Every student in the system' },
  { value: 'teacher',    label: 'All Teachers',        icon: UserCheck,   desc: 'Every faculty member' },
  { value: 'dept_staff', label: 'All Section Officers',icon: ShieldCheck, desc: 'Every department staff member' },
];

const TYPE_OPTIONS = [
  { value: 'info',    label: '🔵 Info',    className: 'text-blue-600' },
  { value: 'success', label: '🟢 Success', className: 'text-green-600' },
  { value: 'warning', label: '🟡 Warning', className: 'text-amber-600' },
  { value: 'error',   label: '🔴 Urgent',  className: 'text-red-600' },
];

export default function AdminBroadcast() {
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info',
    userType: 'all',
    link: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post('/notifications/broadcast', {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        userType: form.userType,
        link: form.link.trim() || null,
      });
      if (data.success) {
        toast.success(`Notice broadcast to ${form.userType}!`);
        setForm({ title: '', message: '', type: 'info', userType: 'all', link: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Broadcast failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLE_OPTIONS.find(r => r.value === form.userType);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center">
          <Megaphone size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Broadcast Notice</h1>
          <p className="text-sm text-gray-500">Send an announcement to users in real-time</p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Target Audience */}
        <div className="p-5 border-b border-gray-50">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Target Audience</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((r) => {
              const Icon = r.icon;
              const isSelected = form.userType === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, userType: r.value }))}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150
                    ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                >
                  <Icon size={18} className={isSelected ? 'text-brand-600' : 'text-gray-400'} />
                  <div>
                    <p className={`text-sm font-semibold leading-tight ${isSelected ? 'text-brand-700' : 'text-gray-700'}`}>
                      {r.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Fields */}
        <div className="p-5 space-y-4">
          {/* Type */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 w-20 flex-shrink-0">Type</label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all
                    ${form.type === t.value ? 'border-gray-300 bg-gray-100 shadow-sm' : 'border-transparent hover:bg-gray-50'} ${t.className}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={200}
              placeholder="e.g. Important: Campus closure notice"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={4}
              placeholder="Write your announcement here..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition resize-none"
              required
            />
          </div>

          {/* Link (optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Link <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              name="link"
              value={form.link}
              onChange={handleChange}
              placeholder="e.g. /student/registration"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
            />
            <p className="text-xs text-gray-400 mt-1">Users will be redirected here when they click the notification.</p>
          </div>
        </div>

        {/* Submit Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Will be sent to: <span className="font-semibold text-gray-700">{selectedRole?.label}</span>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm shadow-brand-500/20"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {loading ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </form>
    </div>
  );
}
