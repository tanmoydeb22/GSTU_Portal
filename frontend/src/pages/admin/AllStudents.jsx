import { useState, useEffect } from 'react';
import { getAdminStudents, getDepartments } from '../../api/admin.api';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/domain/StatusBadge';
import { Users, ArrowLeft, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const YEAR_LEVELS = [
  { level: 1, name: '1st Year' },
  { level: 2, name: '2nd Year' },
  { level: 3, name: '3rd Year' },
  { level: 4, name: '4th Year' }
];

export default function AllStudents() {
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    Promise.all([
      getDepartments(),
      getAdminStudents({ limit: 5000 })
    ])
    .then(([deptRes, studentRes]) => {
      const sortedDepts = deptRes.data.data.sort((a, b) => a.dept_id - b.dept_id);
      setDepartments(sortedDepts);
      setStudents(studentRes.data.data.students);
    })
    .catch(() => toast.error('Failed to load data'))
    .finally(() => setLoading(false));
  }, []);

  const columns = [
    { header: 'Student ID', accessorKey: 'student_id', cell: ({ getValue }) => <span className="font-mono text-sm font-medium">{getValue()}</span> },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Batch', accessorKey: 'batch' },
    { header: 'Term', accessorKey: 'term', cell: ({ getValue }) => `Term ${getValue()}` },
    { header: 'CGPA', accessorKey: 'cgpa', cell: ({ getValue }) => <span className="font-mono font-medium">{getValue() > 0 ? getValue() : '—'}</span> },
    { header: 'Status', accessorKey: 'is_active', cell: ({ getValue }) => <StatusBadge status={getValue() ? 'Active' : 'Closed'} /> },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">All Students</h1>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // --- View 3: Students Table ---
  if (selectedDept && selectedYear) {
    const levelStudents = students.filter(s => s.dept_code === selectedDept.dept_code && s.level === selectedYear.level);
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedYear(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-display font-bold text-gray-900">{selectedDept.dept_code} — {selectedYear.name}</h1>
            <p className="text-xs md:text-sm text-gray-500 font-medium">{levelStudents.length} Student{levelStudents.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          {levelStudents.length > 0 ? (
            <DataTable columns={columns} data={levelStudents} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No students registered for this year yet.
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- View 2: Years Grid ---
  if (selectedDept && !selectedYear) {
    const deptStudents = students.filter(s => s.dept_code === selectedDept.dept_code);
    
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
            <p className="text-xs md:text-sm text-gray-500 font-medium">Select Academic Year</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {YEAR_LEVELS.map(year => {
            const count = deptStudents.filter(s => s.level === year.level).length;
            return (
              <button
                key={year.level}
                onClick={() => setSelectedYear(year)}
                className="flex flex-col items-center justify-center p-8 bg-white border border-gray-200 rounded-xl hover:border-brand-500 hover:shadow-md transition-all group"
              >
                <div className="p-4 bg-brand-50 text-brand-600 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{year.name}</h3>
                <p className="text-sm text-gray-500">{count} Student{count !== 1 ? 's' : ''}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- View 1: Departments Grid ---
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">All Students</h1>
      <p className="text-xs md:text-sm text-gray-500 font-medium">Select a department to view students.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept) => {
          const count = students.filter(s => s.dept_code === dept.dept_code).length;
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
                  {count} Student{count !== 1 ? 's' : ''}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
