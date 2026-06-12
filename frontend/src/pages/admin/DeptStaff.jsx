import { useState, useEffect } from 'react';
import { getDeptStaff, createDepartmentStaffAccess, resetStaffPassword, toggleStaffStatus, revokeStaffAccess } from '../../api/admin.api';
import { Building2, Search, KeyRound, CheckCircle2, XCircle, Clock, Lock, ShieldAlert, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function DeptStaff() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [accessModal, setAccessModal] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [accessForm, setAccessForm] = useState({ name: '', email: '', phone: '' });

  const load = () => {
    getDeptStaff({ search, limit: 100 })
      .then(r => setDepartments(r.data.data.staff))
      .catch(() => toast.error('Failed to load department staff'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(load, 500);
    return () => clearTimeout(delay);
  }, [search]);

  // Derived metrics
  const totalDepts = departments.length;
  const grantedDepts = departments.filter(d => d.staff_id != null).length;
  const grantedPercentage = totalDepts === 0 ? 0 : Math.round((grantedDepts / totalDepts) * 100);

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!accessModal) return;
    try {
      const res = await createDepartmentStaffAccess(accessModal.dept_id, accessForm);
      setCredentialsModal({
        title: `✅ Access Created — ${accessModal.dept_name}`,
        staff_code: res.data.data.staff_code,
        temp_password: res.data.data.temp_password,
        message: 'Share this with the Section Officer.\nPassword cannot be viewed again.'
      });
      setAccessModal(null);
      setAccessForm({ name: '', email: '', phone: '' });
      load();
      toast.success('Access generated successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to grant access');
    }
  };

  const handleResetPassword = async (dept) => {
    if (!window.confirm(`Are you sure you want to reset password for ${dept.dept_code} Section Officer?`)) return;
    try {
      const res = await resetStaffPassword(dept.staff_id);
      setCredentialsModal({
        title: `🔑 Reset Password — ${dept.dept_code} Department`,
        subtitle: `Section Officer: ${dept.name}`,
        temp_password: res.data.data.temp_password,
        message: 'Staff must change on next login.\nShare this password directly.'
      });
      toast.success('Password reset successfully');
    } catch (err) {
      toast.error('Failed to reset password');
    }
  };

  const handleToggleStatus = async (dept) => {
    const action = dept.is_active ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${action} portal access for ${dept.dept_code} Section Officer?\nThey will ${dept.is_active ? 'not ' : ''}be able to login until ${dept.is_active ? 'reactivated' : 'deactivated'}.`)) return;
    try {
      await toggleStaffStatus(dept.staff_id, !dept.is_active);
      toast.success(`Account ${dept.is_active ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  const handleRevokeAccess = async (dept) => {
    if (!window.confirm(`⚠️ CRITICAL WARNING: Are you sure you want to completely REVOKE access for ${dept.dept_code} Department?\nThis will delete the Section Officer account and allow you to reassign a new person to this role. This action cannot be undone.`)) return;
    try {
      await revokeStaffAccess(dept.staff_id);
      toast.success(`Access revoked for ${dept.dept_code} Department`);
      load();
    } catch (err) {
      toast.error('Failed to revoke access');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-brand-600" />
            Department Access Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Each department has one Section Officer with portal access.</p>
        </div>
        
        <div className="w-full sm:w-72 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search departments..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
          />
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold text-gray-700">Access granted: {grantedDepts} / {totalDepts} departments</span>
          <span className="text-sm font-bold text-brand-600">{grantedPercentage}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${grantedPercentage}%` }}></div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
        ) : departments.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No departments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Dept</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Section Officer</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-48">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {departments.map((d) => {
                  const hasAccess = d.staff_id != null;
                  
                  return (
                    <tr key={d.dept_id} className={`hover:bg-gray-50 transition-colors ${!hasAccess ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200">
                          {d.dept_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{d.dept_name}</td>
                      <td className="px-6 py-4">
                        {hasAccess ? (
                          <span className="font-bold text-gray-900">{d.name}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {hasAccess ? (
                          d.last_login ? (
                            <span className="text-emerald-700 font-medium">
                              {new Date(d.last_login).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">Never</span>
                          )
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {hasAccess ? (
                          <div className="flex justify-end gap-2 items-center">
                            <span title="Access granted" className="text-emerald-500 mr-2"><CheckCircle2 className="w-5 h-5" /></span>
                            <Button variant="outline" size="sm" onClick={() => handleResetPassword(d)} className="text-amber-600 border-amber-200 hover:bg-amber-50" title="Reset Password">
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleToggleStatus(d)} className={d.is_active ? 'text-gray-600 border-gray-200 hover:bg-gray-100' : 'text-red-600 border-red-200 hover:bg-red-50'} title={d.is_active ? 'Deactivate Access' : 'Activate Access'}>
                              {d.is_active ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleRevokeAccess(d)} className="text-red-600 border-red-200 hover:bg-red-50" title="Revoke Access">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2 items-center">
                            <span title="No access yet" className="text-red-400 mr-2"><XCircle className="w-5 h-5" /></span>
                            <Button variant="outline" size="sm" onClick={() => setAccessModal(d)} className="border-brand-200 text-brand-700 hover:bg-brand-50">
                              + Grant
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GRANT ACCESS MODAL */}
      <Modal isOpen={!!accessModal} onClose={() => setAccessModal(null)} title="🔑 Grant Portal Access">
        {accessModal && (
          <form onSubmit={handleGrantAccess} className="space-y-4">
            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Department</p>
              <p className="text-lg font-bold text-gray-900">{accessModal.dept_name}</p>
            </div>

            <Input label="Full Name" value={accessForm.name} onChange={e=>setAccessForm({...accessForm, name: e.target.value})} required placeholder="e.g. Md. Karim Hossain" />
            <Input label="Email" type="email" value={accessForm.email} onChange={e=>setAccessForm({...accessForm, email: e.target.value})} required placeholder="e.g. karim@gstu.ac.bd" />
            <Input label="Phone" value={accessForm.phone} onChange={e=>setAccessForm({...accessForm, phone: e.target.value})} required placeholder="e.g. +8801700000000" />
            

            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="ghost" type="button" onClick={() => setAccessModal(null)}>Cancel</Button>
              <Button type="submit">Create Access</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* CREDENTIALS DISPLAY MODAL (SHOWN ONCE) */}
      <Modal isOpen={!!credentialsModal} onClose={() => setCredentialsModal(null)} title={credentialsModal?.title || "Credentials"} preventClose>
        {credentialsModal && (
          <div className="space-y-6">
            {credentialsModal.subtitle && (
              <p className="text-sm font-bold text-gray-700">{credentialsModal.subtitle}</p>
            )}
            
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <div className="space-y-4">
                {credentialsModal.staff_code && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Staff Code</p>
                    <p className="font-mono text-lg font-bold text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg select-all">{credentialsModal.staff_code}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{credentialsModal.staff_code ? 'Password' : 'New Password'}</p>
                  <p className="font-mono text-lg font-bold text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg select-all">{credentialsModal.temp_password}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 font-bold whitespace-pre-line">
                ⚠️ {credentialsModal.message}
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => {
                const text = credentialsModal.staff_code 
                  ? `Staff Code: ${credentialsModal.staff_code}\nPassword: ${credentialsModal.temp_password}`
                  : `New Password: ${credentialsModal.temp_password}`;
                navigator.clipboard.writeText(text);
                toast.success('Copied to clipboard');
              }}>
                📋 Copy
              </Button>
              <Button onClick={() => setCredentialsModal(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
