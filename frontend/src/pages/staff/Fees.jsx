import { useState, useEffect } from 'react';
import { getFees, createFee, updateFee } from '../../api/staff.api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Plus, Edit2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Fees() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ academic_year: '2024-2025', level: 1, term: 1, base_amount: 0, per_course_fixed: 110, per_credit_fee: 80 });

  const load = () => {
    getFees()
      .then(res => setFees(res.data.data))
      .catch(() => toast.error('Failed to load fee structures'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const columns = [
    { header: 'Session', accessorKey: 'academic_year', cell: ({getValue}) => <span className="font-bold">{getValue() || '—'}</span> },
    { header: 'Level', accessorKey: 'level', cell: ({getValue}) => `Level ${getValue()}` },
    { header: 'Term', accessorKey: 'term', cell: ({getValue}) => `Term ${getValue()}` },
    { header: 'Base Amount (৳)', accessorKey: 'base_amount', cell: ({getValue}) => <span className="font-mono font-medium">{getValue()}</span> },
    { header: 'Retake/Improve Fixed (৳)', accessorKey: 'per_course_fixed', cell: ({getValue}) => <span className="font-mono text-amber-600">{getValue()}</span> },
    { header: 'Per Credit Fee (৳)', accessorKey: 'per_credit_fee', cell: ({getValue}) => <span className="font-mono text-blue-600">{getValue()}</span> },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditing(row.original); setForm(row.original); setModal(true); }}>
          <Edit2 className="h-4 w-4 mr-1" /> Edit
        </Button>
      )
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateFee(editing.fee_id, form);
        toast.success('Fee structure updated');
      } else {
        await createFee(form);
        toast.success('Fee structure created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Fee Structures</h1>
          <p className="text-sm text-gray-500 mt-1">Manage departmental base fees and credit costs</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ academic_year: '2024-2025', level: 1, term: 1, base_amount: 0, per_course_fixed: 110, per_credit_fee: 80 }); setModal(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Fee Structure
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : (
        <DataTable columns={columns} data={fees} />
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Fee Structure' : 'Create Fee Structure'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div className="space-y-4">
              <Input label="Session (Academic Year)" placeholder="e.g. 2024-2025" value={form.academic_year} onChange={e => setForm({...form, academic_year: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Level" type="number" min="1" max="4" value={form.level} onChange={e => setForm({...form, level: e.target.value})} required />
                <Input label="Term" type="number" min="1" max="2" value={form.term} onChange={e => setForm({...form, term: e.target.value})} required />
              </div>
            </div>
          )}
          {editing && (
            <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-700 font-medium mb-4">
              Updating Fee Structure for Session {form.academic_year}, Level {form.level}, Term {form.term}
            </div>
          )}

          <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 space-y-4">
            <h4 className="font-bold text-brand-800 text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Standard Semester Fees
            </h4>
            <Input label="Base Amount (৳)" type="number" step="0.01" value={form.base_amount} onChange={e => setForm({...form, base_amount: e.target.value})} required placeholder="e.g. 5000" />
            <p className="text-xs text-brand-600 mt-1">This amount is charged to all students registering for this semester, covering all mandatory courses.</p>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-4">
            <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Retake & Improvement Costs
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Per Course Fixed (৳)" type="number" step="0.01" value={form.per_course_fixed} onChange={e => setForm({...form, per_course_fixed: e.target.value})} required />
              <Input label="Per Credit Fee (৳)" type="number" step="0.01" value={form.per_credit_fee} onChange={e => setForm({...form, per_credit_fee: e.target.value})} required />
            </div>
            <div className="bg-white/60 p-3 rounded text-xs text-amber-900 border border-amber-200">
              <strong>Formula:</strong> (Credits × Per Credit Fee) + Fixed Amount
              <br/><em>Example (3 credits):</em> (3 × ৳{form.per_credit_fee || 0}) + ৳{form.per_course_fixed || 0} = <strong>৳{((3 * (form.per_credit_fee || 0)) + Number(form.per_course_fixed || 0))}</strong>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update Structure' : 'Create Structure'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Need to import RefreshCw for the icon above
import { RefreshCw } from 'lucide-react';
