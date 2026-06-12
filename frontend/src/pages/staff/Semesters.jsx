import { useState, useEffect } from 'react';
import { getSemesters, createSemester, updateSemester, toggleSemester, deleteSemester, closeRegistrationAndGeneratePayments } from '../../api/staff.api';
import DataTable from '../../components/ui/DataTable'; import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button'; import Input from '../../components/ui/Input';
import StatusBadge from '../../components/domain/StatusBadge'; import SemesterCountdown from '../../components/domain/SemesterCountdown';
import ConfirmDialog from '../../components/domain/ConfirmDialog';
import { Link } from 'react-router-dom';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react'; import toast from 'react-hot-toast';

export default function Semesters() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ academic_year:'', level:1, term:1, reg_start:'', reg_end:'' });

  const load = () => { getSemesters().then(r => setSemesters(r.data.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await toggleSemester(id);
      toast.success(`Semester ${currentStatus ? 'closed' : 'activated'}`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Status update failed'); }
  };

  const handleCloseAndGenerate = async (id) => {
    if (!window.confirm('This will lock registration and generate payment invoices for all enrolled students. Proceed?')) return;
    try {
      const res = await closeRegistrationAndGeneratePayments(id);
      toast.success(res.data.message || 'Payments generated successfully');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Payment generation failed'); }
  };

  const [deleteTarget, setDeleteTarget] = useState(null);

  const columns = [
    { header: 'Academic Year', accessorKey: 'academic_year' },
    { header: 'Level', accessorKey: 'level' }, { header: 'Term', accessorKey: 'term' },
    { header: 'Registration', cell: ({ row }) => <span className="text-sm">{row.original.reg_start?.slice(0,10)} → {row.original.reg_end?.slice(0,10)}</span> },
    { header: 'Credits', cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="text-sm space-y-0.5">
          <div className="flex gap-2">
            <span className="text-gray-400">Total:</span><span className="font-mono font-bold text-brand-600">{r.total_credit || 0}</span>
          </div>
          {r.total_credit === 0 && r.offering_count === 0 && <p className="text-[10px] text-amber-500 font-medium">⚠ No offerings yet</p>}
        </div>
      );
    }},
    { header: 'Students', accessorKey: 'student_count' },
    { header: 'Status', accessorKey: 'is_active', cell: ({ getValue, row }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const regEnd = new Date(row.original.reg_end);
      regEnd.setHours(0, 0, 0, 0);
      const isPast = today > regEnd;
      const isActive = !!getValue();

      return (
        <div className="flex items-center gap-2">
          <StatusBadge status={isActive ? 'Active' : 'Closed'} />
          {(isActive || !isPast) && (
            <Button variant="ghost" size="xs" onClick={() => handleToggleStatus(row.original.semester_id, isActive)}>
              {isActive ? 'Close' : 'Open'}
            </Button>
          )}
        </div>
      );
    }},
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={() => {
            setEditing(row.original);
            setForm({
              ...row.original,
              reg_start: row.original.reg_start?.slice(0, 10) || '',
              reg_end: row.original.reg_end?.slice(0, 10) || ''
            });
            setModal(true);
          }}>Edit</Button>
          <Button variant="ghost" size="sm" className="text-red-600 border border-transparent hover:border-red-500 hover:bg-red-50/50" onClick={() => setDeleteTarget(row.original.semester_id)}>
            Delete
          </Button>
        </div>
      )
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateSemester(editing.semester_id, form);
        toast.success('Updated');
      } else {
        await createSemester(form);
        toast.success('Created');
      }
      setModal(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-gray-900">Semesters</h1>
        <Button onClick={() => { setEditing(null); setForm({ academic_year:'', level:1, term:1, reg_start:'', reg_end:'' }); setModal(true); }} className="w-full sm:w-auto justify-center"><Plus className="h-4 w-4 mr-2" /> Create Semester</Button>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div> : <DataTable columns={columns} data={semesters} />}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Semester' : 'Create Semester'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Academic Year" value={form.academic_year} onChange={e => setForm({...form, academic_year: e.target.value})} placeholder="2024-25" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Level" type="number" min="1" max="4" value={form.level} onChange={e => setForm({...form, level: parseInt(e.target.value)})} required />
            <Input label="Term" type="number" min="1" max="2" value={form.term} onChange={e => setForm({...form, term: parseInt(e.target.value)})} required />
            <Input label="Reg Start" type="date" value={form.reg_start} onChange={e => setForm({...form, reg_start: e.target.value})} required />
            <Input label="Reg End" type="date" value={form.reg_end} onChange={e => setForm({...form, reg_end: e.target.value})} required />
          </div>
          <div className="flex justify-end gap-3"><Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button><Button type="submit">{editing ? 'Update' : 'Create'}</Button></div>
        </form>
      </Modal>
      <ConfirmDialog 
        isOpen={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteSemester(deleteTarget);
            toast.success('Semester deleted successfully');
            load();
          } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete semester');
          } finally {
            setDeleteTarget(null);
          }
        }}
        title="Delete Semester" 
        message="Are you sure you want to delete this semester? This action cannot be undone." 
        confirmText="Delete" 
      />
    </div>
  );
}
