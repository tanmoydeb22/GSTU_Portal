import { useState, useEffect } from 'react';
import { getEnrollmentReport } from '../../api/admin.api';
import DataTable from '../../components/ui/DataTable';
import toast from 'react-hot-toast';

export default function EnrollmentReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getEnrollmentReport({}).then(r => setData(r.data.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);

  const columns = [
    { header: 'Dept', accessorKey: 'dept_code' },
    { header: 'Course', accessorKey: 'course_code' },
    { header: 'Name', accessorKey: 'course_name' },
    { header: 'Credit', accessorKey: 'credit' },
    { header: 'Teacher', accessorKey: 'teacher_name' },
    { header: 'Registered', accessorKey: 'total_registered' },
    { header: 'Completed', accessorKey: 'completed' },
    { header: 'Dropped', accessorKey: 'dropped' },
    { header: 'Avg Grade', accessorKey: 'avg_grade', cell: ({ getValue }) => <span className="font-mono">{getValue() || '—'}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">Enrollment Report</h1>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div> :
        <DataTable columns={columns} data={data} />}
    </div>
  );
}
