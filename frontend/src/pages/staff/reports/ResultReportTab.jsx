import { useState, useEffect, useMemo } from 'react';
import { getResultReport, getSemesters, exportResultReportPDF } from '../../../api/staff.api';
import Button from '../../../components/ui/Button';
import { Download, Filter, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ResultReportTab() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  
  const [data, setData] = useState({ students: [], summary: {}, distribution: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSemesters().then(r => {
      setSemesters(r.data.data);
      if (r.data.data.length > 0) {
        setSelectedSemester(r.data.data[0].semester_id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedSemester) return;
    setLoading(true);
    getResultReport({ semester_id: selectedSemester, batch: batchFilter })
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load result report'))
      .finally(() => setLoading(false));
  }, [selectedSemester, batchFilter]);

  const handleExport = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf' });
      const res = await exportResultReportPDF({ semester_id: selectedSemester, batch: batchFilter });
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Result_Report_${selectedSemester}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF Downloaded!', { id: 'pdf' });
    } catch (err) {
      toast.error('Export failed', { id: 'pdf' });
    }
  };

  const chartData = useMemo(() => {
    return Object.entries(data.distribution || {}).map(([grade, count]) => ({ grade, count }));
  }, [data.distribution]);

  const COLORS = {
    'A+': '#16a34a', 'A': '#22c55e', 'A-': '#4ade80',
    'B+': '#0284c7', 'B': '#38bdf8', 'B-': '#7dd3fc',
    'C+': '#ca8a04', 'C': '#facc15', 'D': '#fb923c',
    'F': '#ef4444', 'Pending': '#94a3b8'
  };

  return (
    <div className="space-y-6">
      {/* Filters & Export */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={selectedSemester} 
              onChange={e => setSelectedSemester(e.target.value)}
              className="text-sm border-gray-200 rounded-lg focus:ring-brand-500"
            >
              <option value="">Select Semester...</option>
              {semesters.map(s => (
                <option key={s.semester_id} value={s.semester_id}>
                  L{s.level} T{s.term} ({s.academic_year}) {s.is_active === 1 ? '— Active' : ''}
                </option>
              ))}
            </select>
          </div>
          <input 
            type="text" 
            placeholder="Filter Batch (e.g. 2021)"
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            className="text-sm border-gray-200 rounded-lg focus:ring-brand-500 w-48"
          />
        </div>
        
        <Button onClick={handleExport} disabled={!selectedSemester || data.students.length === 0} className="bg-gray-900 hover:bg-gray-800 text-white">
          <Download className="w-4 h-4 mr-2" /> Export PDF
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : data.students.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No results found for the selected filters.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Students</p>
              <p className="text-3xl font-display font-bold text-gray-900">{data.summary.totalStudents}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Class Avg GPA</p>
              <p className="text-3xl font-display font-bold text-brand-600">{data.summary.avgGpa}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Highest GPA</p>
              <p className="text-3xl font-display font-bold text-green-600">{data.summary.highestGpa}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Lowest GPA</p>
              <p className="text-3xl font-display font-bold text-red-500">{data.summary.lowestGpa}</p>
            </div>
          </div>

          {/* Chart & Table Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-gray-100 shadow-sm h-[400px]">
              <h3 className="font-bold text-gray-900 mb-6">Grade Distribution</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.grade] || '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Student Results</h3>
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-bold">Student</th>
                      <th className="px-4 py-3 font-bold">Courses & Grades</th>
                      <th className="px-4 py-3 font-bold text-right">Semester GPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.students.map(s => (
                      <tr key={s.student_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-bold text-gray-900">{s.student_id}</p>
                          <p className="text-xs text-gray-500">{s.name}</p>
                          <p className="text-[10px] text-brand-600 font-bold mt-1">Batch {s.batch}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {s.courses.map((c, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                <span>{c.course_code}</span>
                                <span className={`font-bold ${c.grade_letter === 'F' ? 'text-red-500' : 'text-gray-900'}`}>
                                  {c.grade_letter || '—'}
                                </span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`font-mono font-bold text-lg ${parseFloat(s.semester_gpa) < 2.0 ? 'text-red-500' : 'text-brand-600'}`}>
                            {s.semester_gpa}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
