import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResultBoard } from '../../api/student.api';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { ChevronLeft, Search, FileText } from 'lucide-react';

export default function ResultBoard() {
  const { semesterId } = useParams();
  const { user } = useAuthStore();
  const studentId = user?.student_id || user?.userId;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getResultBoard(semesterId)
      .then(res => setData(res.data.data))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load result board'))
      .finally(() => setLoading(false));
  }, [semesterId]);

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    if (!searchQuery.trim()) return data.students;
    return data.students.filter(s => s.student_id.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [data, searchQuery]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-500">Data not found.</div>;

  const { semester_info, courses, students } = data;

  return (
    <div className="space-y-6 animate-fade-in max-w-[95%] mx-auto px-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/student/results/board" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-brand-600 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4" /> Back to Published Semesters
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-6 h-6 text-brand-600" />
            Result Sheet
          </h1>
        </div>
      </div>

      {/* Header Info Box */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm text-gray-700">
          <div className="flex gap-2">
            <span className="font-bold w-24">Exam ID:</span>
            <span className="font-mono text-gray-900">{semester_info.exam_id}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-24">Degree:</span>
            <span className="text-gray-900">{semester_info.degree}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-24">Department:</span>
            <span className="text-gray-900">{semester_info.department}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-24">Session:</span>
            <span className="font-mono text-gray-900">{semester_info.session}</span>
          </div>
          <div className="flex gap-2 md:col-span-2">
            <span className="font-bold w-24">Semester:</span>
            <span className="text-gray-900">{semester_info.semester_label}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by Student ID..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-shadow shadow-sm"
        />
      </div>

      {/* Main Grade Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-50 text-gray-700 sticky top-0 z-20 shadow-sm border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold sticky left-0 z-30 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Student ID
                </th>
                {courses.map(c => (
                  <th key={c.course_code} className="px-6 py-4 font-bold text-center border-r border-gray-100 last:border-r-0">
                    <div className="text-brand-700">{c.course_code}</div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">CH:{c.credit}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? filteredStudents.map((s) => {
                const isMe = s.student_id === studentId;
                return (
                  <tr 
                    key={s.student_id} 
                    className={`transition-colors ${isMe ? 'bg-green-50 border-l-4 border-l-green-500' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`px-6 py-4 font-mono font-bold sticky left-0 z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isMe ? 'bg-green-50 text-green-800' : 'bg-white text-gray-900'}`}>
                      {s.student_id}
                    </td>
                    {courses.map(c => {
                      const grade = s.grades[c.course_code];
                      const isF = grade === 'F';
                      return (
                        <td key={c.course_code} className={`px-6 py-4 text-center font-bold border-r border-gray-100 last:border-r-0 ${isF ? 'bg-red-50 text-red-600' : 'text-gray-700'}`}>
                          {grade || '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={courses.length + 1} className="px-6 py-8 text-center text-gray-500">
                    No matching students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Table */}
      <h3 className="text-lg font-bold text-gray-900 pt-4">Summary</h3>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-50 text-gray-700 sticky top-0 z-20 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 font-bold sticky left-0 z-30 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Student ID
                </th>
                <th className="px-3 py-2 font-bold text-center border-r border-gray-100">Credit Offered</th>
                <th className="px-3 py-2 font-bold text-center border-r border-gray-100">Credit Secured</th>
                <th className="px-3 py-2 font-bold text-center border-r border-gray-100">Points Secured</th>
                <th className="px-3 py-2 font-bold text-center border-r border-gray-100">GPA</th>
                <th className="px-3 py-2 font-bold text-left min-w-[200px]">Incomplete Courses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((s) => {
                const isMe = s.student_id === studentId;
                return (
                  <tr 
                    key={s.student_id} 
                    className={`transition-colors ${isMe ? 'bg-green-50 border-l-4 border-l-green-500' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`px-3 py-2 font-mono font-extrabold sticky left-0 z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isMe ? 'bg-green-50 text-green-900 text-[15px]' : 'bg-white text-gray-900 text-[14px]'}`}>
                      {s.student_id}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600 border-r border-gray-100">{s.credit_offered.toFixed(1)}</td>
                    <td className="px-3 py-2 text-center text-gray-600 border-r border-gray-100">{s.credit_secured.toFixed(1)}</td>
                    <td className="px-3 py-2 text-center text-gray-600 border-r border-gray-100">{s.points_secured.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-center font-bold border-r border-gray-100 ${isMe ? 'bg-green-50' : ''} ${s.gpa >= 3.75 ? 'text-emerald-600' : s.gpa >= 3.0 ? 'text-blue-600' : s.gpa >= 2.5 ? 'text-amber-600' : 'text-red-600'}`}>
                      {s.gpa}
                    </td>
                    <td className="px-3 py-2 text-left">
                      {s.incomplete.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {s.incomplete.map(inc => (
                            <span key={inc} className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs font-bold font-mono">
                              {inc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No matching students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
