import { useState, useEffect } from 'react';
import { getAdminTeachers, getDepartments } from '../../api/admin.api';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/domain/StatusBadge';
import { Users, ArrowLeft, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AllTeachers() {
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    Promise.all([
      getDepartments(),
      getAdminTeachers({ limit: 1000 })
    ])
    .then(([deptRes, teacherRes]) => {
      const sortedDepts = deptRes.data.data.sort((a, b) => a.dept_id - b.dept_id);
      setDepartments(sortedDepts);
      setTeachers(teacherRes.data.data.teachers);
    })
    .catch(() => toast.error('Failed to load data'))
    .finally(() => setLoading(false));
  }, []);

  const columns = [
    { header: 'Code', accessorKey: 'teacher_code', cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span> },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Designation', accessorKey: 'designation' },
    { header: 'Phone', accessorKey: 'phone', cell: ({ getValue }) => getValue() || <span className="text-gray-400 italic">N/A</span> },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Status', accessorKey: 'is_active', cell: ({ getValue }) => <StatusBadge status={getValue() ? 'Active' : 'Closed'} /> },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">All Teachers</h1>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // --- View 2: Teachers Table ---
  if (selectedDept) {
    const deptTeachers = teachers.filter(t => t.dept_code === selectedDept.dept_code);
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedDept(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-display font-bold text-gray-900">{selectedDept.dept_name} ({selectedDept.dept_code})</h1>
            <p className="text-xs md:text-sm text-gray-500 font-medium">{deptTeachers.length} Teacher{deptTeachers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          {deptTeachers.length > 0 ? (
            <DataTable columns={columns} data={deptTeachers} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No teachers assigned to this department yet.
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- View 1: Departments Grid ---
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">All Teachers</h1>
      <p className="text-xs md:text-sm text-gray-500 font-medium">Select a department to view its teachers.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept) => {
          const count = teachers.filter(t => t.dept_code === dept.dept_code).length;
          return (
            <button
              key={dept.dept_id}
              onClick={() => setSelectedDept(dept)}
              className="flex items-start gap-4 p-6 bg-white border border-gray-200 rounded-xl hover:border-brand-500 hover:shadow-md transition-all text-left group"
            >
              <div className="p-3 bg-brand-50 text-brand-600 rounded-lg group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-brand-700 transition-colors">{dept.dept_code}</h2>
                <p className="text-sm text-gray-500 line-clamp-1 mb-2">{dept.dept_name}</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {count} Teacher{count !== 1 ? 's' : ''}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
