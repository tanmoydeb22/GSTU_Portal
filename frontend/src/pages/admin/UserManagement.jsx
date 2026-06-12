import { useState, useEffect } from 'react';
import { globalUserSearch, updateGlobalUser, createAdmin } from '../../api/admin.api';
import { Search, UserCheck, ShieldAlert, KeyRound, AlertCircle, CheckCircle2, XCircle, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import CredentialsModal from '../../components/ui/CredentialsModal';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';

export default function UserManagement() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuthStore();
  
  const [createModal, setCreateModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '' });
  const [creating, setCreating] = useState(false);
  
  const [credentialsModal, setCredentialsModal] = useState(false);
  const [credentialsData, setCredentialsData] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query || query.length < 2) return toast.error('Enter at least 2 characters to search');
    
    setLoading(true);
    try {
      const res = await globalUserSearch(query);
      setResults(res.data.data);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (!window.confirm(`Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} this user?`)) return;
    try {
      await updateGlobalUser(user.role, user.id, { is_active: user.is_active ? 0 : 1 });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      setResults(results.map(r => r.id === user.id && r.role === user.role ? { ...r, is_active: !user.is_active } : r));
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleResetPassword = async (targetUser) => {
    if (!window.confirm(`Are you sure you want to completely reset the password for ${targetUser.name}?`)) return;
    try {
      const res = await updateGlobalUser(targetUser.role, targetUser.id, { reset_password: true });
      if (res.data.data?.tempPassword) {
        setCredentialsData({ ...targetUser, temp_password: res.data.data.tempPassword });
        setCredentialsModal(true);
      } else {
        toast.success(`Password reset successful!`);
      }
    } catch (err) {
      toast.error('Password reset failed');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createAdmin(adminForm);
      setCredentialsData({ name: adminForm.name, email: adminForm.email, temp_password: res.data.data.temp_password });
      setCredentialsModal(true);
      setCreateModal(false);
      setAdminForm({ name: '', email: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const filteredResults = activeTab === 'all' ? results : results.filter(r => r.role === activeTab);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-rose-100 text-rose-700';
      case 'dept_staff': return 'bg-purple-100 text-purple-700';
      case 'teacher': return 'bg-blue-100 text-blue-700';
      case 'student': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'System Admin';
      case 'dept_staff': return 'Dept Staff';
      case 'teacher': return 'Teacher';
      case 'student': return 'Student';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Global User Management</h1>
          <p className="text-sm text-gray-500">Search and manage any account across the entire university.</p>
        </div>
        {user?.adminRole === 'super_admin' && (
          <Button onClick={() => setCreateModal(true)} className="flex items-center shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Create Sub-Admin
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
          <form onSubmit={handleSearch} className="flex gap-4 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by Name, Email, or ID/Code..." 
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow text-sm"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="px-6">
              {loading ? 'Searching...' : 'Search Users'}
            </Button>
          </form>
        </div>

        {results.length > 0 && (
          <div className="border-b border-gray-100 bg-white px-6 pt-4 flex gap-6 overflow-x-auto no-scrollbar">
            {['all', 'student', 'teacher', 'dept_staff', 'admin'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                {tab === 'all' ? 'All Results' : getRoleLabel(tab)}
              </button>
            ))}
          </div>
        )}

        <div className="p-0">
          {results.length === 0 && !loading ? (
            <div className="text-center py-20">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Enter a search query to find users.</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-sm">No results found for this category.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filteredResults.map(user => (
                <li key={`${user.role}-${user.id}`} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                      <UserCheck className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">{user.name}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        {user.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      <p className="text-sm text-gray-500 font-mono mb-1">{user.code}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(user)} className={user.is_active ? 'text-red-600 hover:bg-red-50 hover:border-red-200' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'}>
                      {user.is_active ? <XCircle className="w-4 h-4 mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleResetPassword(user)} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200">
                      <KeyRound className="w-4 h-4 mr-1.5" /> Force Reset Password
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Create Admin Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Sub-Admin">
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <Input 
            label="Name" 
            required 
            value={adminForm.name} 
            onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} 
            placeholder="e.g. John Doe"
          />
          <Input 
            label="Email" 
            type="email" 
            required 
            value={adminForm.email} 
            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} 
            placeholder="admin@gstu.ac.bd"
          />
          <div className="flex justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setCreateModal(false)} className="mr-3">Cancel</Button>
            <Button type="submit" loading={creating}>Create Admin</Button>
          </div>
        </form>
      </Modal>

      <CredentialsModal
        isOpen={credentialsModal}
        onClose={() => setCredentialsModal(false)}
        credentials={credentialsData}
      />
    </div>
  );
}
