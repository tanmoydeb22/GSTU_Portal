import { useState, useEffect } from 'react';
import { getSessionsApi, logoutAllApi, logoutSessionApi, changePasswordApi, getLoginHistoryApi } from '../../api/auth.api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import toast from 'react-hot-toast';
import { Monitor, Smartphone, Globe, Shield, Key, History } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

export default function SecurityTab() {
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const logout = useAuthStore(state => state.logout);

  // Password State
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [isChangingPw, setIsChangingPw] = useState(false);

  const fetchSecurityData = async () => {
    try {
      const [sessRes, histRes] = await Promise.all([
        getSessionsApi(),
        getLoginHistoryApi()
      ]);
      setSessions(sessRes.data.data);
      setHistory(histRes.data.data);
    } catch (err) {
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSecurityData(); }, []);

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to log out from all devices?')) return;
    try {
      await logoutAllApi();
      toast.success('Logged out from all devices');
      logout();
    } catch (err) { toast.error('Failed to log out from all devices'); }
  };

  const handleRevoke = async (sid, isCurrent) => {
    try {
      await logoutSessionApi(sid);
      toast.success('Session revoked');
      if (isCurrent) logout();
      else fetchSecurityData();
    } catch (err) { toast.error('Failed to revoke session'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) return toast.error('Passwords do not match');
    if (pwForm.new_password.length < 8) return toast.error('Password must be at least 8 characters');
    if (!/[A-Z]/.test(pwForm.new_password)) return toast.error('Password must contain an uppercase letter');
    if (!/[0-9]/.test(pwForm.new_password)) return toast.error('Password must contain a number');
    
    setIsChangingPw(true);
    try {
      await changePasswordApi(pwForm.current_password, pwForm.new_password);
      toast.success('Password changed successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPw(false);
    }
  };

  const getPasswordStrength = () => {
    const pw = pwForm.new_password;
    if (!pw) return { text: '', color: 'bg-gray-200' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { text: 'Weak', color: 'bg-red-500 w-1/3' };
    if (score === 2 || score === 3) return { text: 'Medium', color: 'bg-amber-400 w-2/3' };
    return { text: 'Strong', color: 'bg-green-500 w-full' };
  };
  const strength = getPasswordStrength();

  const getDeviceIcon = (deviceType, os) => {
    if (deviceType === 'mobile') return '📱';
    if (deviceType === 'tablet') return '📟';
    if (os?.includes('Windows')) return '🖥️';
    if (os?.includes('Mac')) return '💻';
    if (os?.includes('Linux')) return '🖥️';
    return '🖥️';
  };

  const getIPDisplay = (ip) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1') return 'Localhost';
    return ip;
  };

  function formatTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-16 bg-gray-100 rounded-lg"/><div className="h-16 bg-gray-100 rounded-lg"/></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Change Password */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-brand-50 rounded-xl">
              <Key className="h-5 w-5 text-brand-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-5 flex-1 flex flex-col">
            <Input type="password" label="Current Password" required value={pwForm.current_password} onChange={e=>setPwForm({...pwForm, current_password: e.target.value})} />
            <div>
              <Input type="password" label="New Password" required value={pwForm.new_password} onChange={e=>setPwForm({...pwForm, new_password: e.target.value})} />
              {pwForm.new_password && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <span>Password Strength</span>
                    <span className={strength.text === 'Strong' ? 'text-emerald-600' : strength.text === 'Medium' ? 'text-amber-600' : 'text-red-600'}>{strength.text}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strength.color}`}></div>
                  </div>
                </div>
              )}
            </div>
            <Input type="password" label="Confirm New Password" required value={pwForm.confirm_password} onChange={e=>setPwForm({...pwForm, confirm_password: e.target.value})} />
            <div className="mt-auto pt-4">
              <Button type="submit" loading={isChangingPw} className="w-full justify-center">Update Password</Button>
            </div>
          </form>
        </section>

        {/* Active Sessions */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Monitor className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Active Sessions</h3>
            </div>
            <button onClick={handleLogoutAll} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
              Log out all
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {sessions.map(s => (
              <div key={s.session_id} className={`flex items-start sm:items-center gap-4 p-4 rounded-2xl border ${s.is_current ? 'border-emerald-200 bg-emerald-50/50 shadow-sm' : 'border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200'} transition-all`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${s.is_current ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {getDeviceIcon(s.device_type, s.os_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 text-sm truncate">
                      {s.browser_name || 'Unknown Browser'}
                      {s.browser_version ? ` ${s.browser_version}` : ''}
                    </span>
                    {s.is_current && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] rounded-md font-bold uppercase tracking-wide">
                        Current Device
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-x-3 gap-y-1 text-xs text-gray-500 flex-wrap font-medium">
                    <span>{s.os_name || 'Unknown OS'}{s.os_version ? ` ${s.os_version}` : ''}</span>
                    <span className="text-gray-300">•</span>
                    <span className="font-mono text-[11px]">{getIPDisplay(s.ip_address)}</span>
                    <span className="text-gray-300">•</span>
                    <span>{formatTimeAgo(s.last_active)}</span>
                  </div>
                </div>
                {!s.is_current && (
                  <button
                    onClick={() => handleRevoke(s.session_id, s.is_current)}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold uppercase transition-all flex-shrink-0"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Login History */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gray-50 rounded-xl">
            <History className="h-5 w-5 text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Recent Login History</h3>
        </div>
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-[11px]">Device Details</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-[11px]">IP Address</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-[11px]">Date & Time</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-[11px] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getDeviceIcon(h.device_type, h.os_name)}</span>
                      <span className="font-semibold text-gray-800">{h.browser_name || 'Unknown'} <span className="text-gray-400 font-normal">/ {h.os_name || 'Unknown'}</span></span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-500 text-[13px]">{getIPDisplay(h.ip_address)}</td>
                  <td className="px-6 py-4 text-gray-600 text-[13px] font-medium">
                    {new Date(h.created_at).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 flex justify-end">
                    <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 w-max ${h.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                      {h.status === 'success' ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Success</> : <><span className="w-1.5 h-1.5 rounded-full bg-red-500"/> Failed</>}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-medium">No recent login history.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
