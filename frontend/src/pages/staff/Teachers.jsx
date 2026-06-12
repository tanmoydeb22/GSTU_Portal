import { useState, useEffect } from 'react';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, resetTeacherPassword } from '../../api/staff.api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import CredentialsModal from '../../components/ui/CredentialsModal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/domain/StatusBadge';
import ConfirmDialog from '../../components/domain/ConfirmDialog';
import { Plus, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Teachers() {
  const [teachers, setTeachers] = useState([]); const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState(null); 
  const [credentialsModal, setCredentialsModal] = useState(false);
  const [credentialsData, setCredentialsData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ teacher_code: '', name: '', email: '', phone: '', designation: 'Lecturer', is_active: 1 });
  const load = () => { getTeachers({}).then(r => setTeachers(r.data.data.teachers)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); };
  useEffect(load, []);

  const columns = [
    { header: 'Code', accessorKey: 'teacher_code', cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span> },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Designation', accessorKey: 'designation', cell: ({ getValue }) => <span className="text-sm">{getValue()}</span> },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Status', accessorKey: 'is_active', cell: ({ getValue }) => {
      const val = getValue();
      const statusLabel = val === 1 ? 'Active' : val === 2 ? 'On Leave' : 'Closed';
      return <StatusBadge status={statusLabel} />;
    }},
    { header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => { setEditing(row.original); setForm(row.original); setModal(true); }}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={async () => {
          if (!window.confirm('Reset password for ' + row.original.name + '?')) return;
          try {
            const res = await resetTeacherPassword(row.original.teacher_id);
            setCredentialsData({ teacher_code: row.original.teacher_code, name: row.original.name, email: row.original.email, temp_password: res.data.data.temp_password });
            setCredentialsModal(true);
          } catch (err) { toast.error('Failed to reset password'); }
        }}>Reset Password</Button>
        <Button variant="ghost" size="sm" className="text-red-600 border border-transparent hover:border-red-500 hover:bg-red-50/50" onClick={() => setDeleteTarget(row.original.teacher_id)}>Delete Info</Button>
      </div>
    )},
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await updateTeacher(editing.teacher_id, form); toast.success('Updated'); setModal(false); }
      else { 
        const r = await createTeacher(form); 
        setCredentialsData({ teacher_code: form.teacher_code, name: form.name, email: form.email, temp_password: r.data.data.tempPassword });
        setCredentialsModal(true);
        setModal(false);
      }
      setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-gray-900">Teachers</h1>
        <Button onClick={() => { setEditing(null); setForm({ teacher_code: '', name: '', email: '', phone: '', designation: 'Lecturer' }); setModal(true); }} className="w-full sm:w-auto justify-center"><Plus className="h-4 w-4 mr-2" /> Add Teacher</Button>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div> : <DataTable columns={columns} data={teachers} />}
      
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Teacher' : 'Add Teacher'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Teacher ID" value={form.teacher_code} onChange={e => setForm({...form, teacher_code: e.target.value})} required disabled={!!editing} />
            <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation</label>
              <select value={form.designation} onChange={e => setForm({...form, designation: e.target.value})}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Academic Status</label>
                <select value={form.is_active} onChange={e => setForm({...form, is_active: parseInt(e.target.value)})}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value={1}>Active</option>
                  <option value={2}>On Leave (Ph.D. / Other)</option>
                  <option value={0}>Closed / Inactive</option>
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3"><Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button><Button type="submit">{editing ? 'Update' : 'Create'}</Button></div>
          </form>
      </Modal>

      <CredentialsModal
        isOpen={credentialsModal}
        onClose={() => setCredentialsModal(false)}
        credentials={credentialsData}
      />

      <ConfirmDialog 
        isOpen={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteTeacher(deleteTarget);
            toast.success('Teacher info deleted');
            load();
          } catch (err) {
            toast.error('Failed to delete');
          } finally {
            setDeleteTarget(null);
          }
        }}
        title="Delete Info" 
        message="Are you sure you want to delete this teacher's info?" 
        confirmText="Delete" 
      />
    </div>
  );
}
