import { useState, useEffect } from 'react';
import { getEnrollments } from '../../api/staff.api';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/domain/StatusBadge';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function Enrollments() {
  const [data, setData] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { getEnrollments({}).then(r => setData(r.data.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);
  const columns = [
    { header: 'Student', accessorKey: 'student_id', cell: ({getValue})=><span className="font-mono text-xs">{getValue()}</span> },
    { header: 'Name', accessorKey: 'student_name' },
    { header: 'Course', accessorKey: 'course_code' },
    { header: 'Category', accessorKey: 'enrollment_type', cell: ({getValue}) => {
      const v = getValue();
      if (v === 'Retake') return <Badge variant="danger">🔁 Retake</Badge>;
      if (v === 'Improvement') return <Badge variant="info">⬆️ Improve</Badge>;
      return <Badge variant="brand">Regular</Badge>;
    }},
    { header: 'Status', accessorKey: 'status', cell: ({getValue})=><StatusBadge status={getValue()}/> },
    { header: 'Date', accessorKey: 'registered_at', cell: ({getValue})=> getValue() ? new Date(getValue()).toLocaleDateString() : '—' },
  ];
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">Enrollments</h1>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"/></div> : <DataTable columns={columns} data={data}/>}
    </div>
  );
}
