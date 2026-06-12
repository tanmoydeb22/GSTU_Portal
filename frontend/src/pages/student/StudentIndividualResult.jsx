import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTranscript } from '../../api/student.api';
import toast from 'react-hot-toast';
import { ChevronLeft, FileText, Users } from 'lucide-react';

export default function StudentIndividualResult() {
  const { semesterId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTranscript()
      .then(res => {
        const fullData = res.data.data;
        // Filter records to only those matching this semesterId
        const semesterRecords = fullData.records.filter(r => r.semester_id === parseInt(semesterId));
        
        if (semesterRecords.length === 0) {
          toast.error("No results found for this semester");
        }
        
        setData({
          student: fullData.student,
          records: semesterRecords
        });
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load individual result'))
      .finally(() => setLoading(false));
  }, [semesterId]);

  const summary = useMemo(() => {
    if (!data?.records || data.records.length === 0) return { credits: 0, gpa: '0.000', level: '', term: '', academic_year: '' };
    
    const validRecords = data.records.filter(r => r.grade_point !== null);
    const totalCredits = validRecords.reduce((sum, r) => sum + parseFloat(r.credit), 0);
    const totalPoints = validRecords.reduce((sum, r) => sum + (parseFloat(r.credit) * parseFloat(r.grade_point)), 0);
    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(3) : '0.000';
    
    return {
      credits: totalCredits.toFixed(1),
      gpa,
      level: data.records[0].level,
      term: data.records[0].term,
      academic_year: data.records[0].academic_year
    };
  }, [data]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  if (!data || data.records.length === 0) return <div className="text-center py-20 text-gray-500">Result data not found.</div>;

  const { student, records } = data;
  const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in max-w-[1000px] mx-auto px-4 pb-20 relative">
      
      {/* Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <Link to="/student/results/board" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-brand-600 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4" /> Back to Published Semesters
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-6 h-6 text-brand-600" />
            Your Result
          </h1>
        </div>
        <div>
          <Link to={`/student/results/board/${semesterId}`} className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors w-full sm:w-auto">
            <Users className="w-4 h-4" />
            See Full Result Sheet
          </Link>
        </div>
      </div>

      {/* Official Transcript UI */}
      <div className="bg-white border border-gray-200 p-8 sm:p-12 relative overflow-hidden shadow-sm mx-auto w-full min-h-[600px]">
        
        {/* CSS Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <div className="text-[120px] font-black text-gray-50/50 uppercase whitespace-nowrap -rotate-45 select-none" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.02)' }}>
            OFFICIAL TRANSCRIPT
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 space-y-10">
          
          {/* STUDENT INFORMATION */}
          <div>
            <h2 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-4 border-b-2 border-green-500 pb-1 w-max">
              STUDENT INFORMATION
            </h2>
            <div className="bg-[#f8fdf9] p-5 rounded-lg border border-green-100/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3 text-sm">
                <div className="flex gap-4">
                  <span className="text-gray-500 font-bold w-32">Student Name</span>
                  <span className="text-gray-900 font-medium">{student.name}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-gray-500 font-bold w-32">Session</span>
                  <span className="text-gray-900 font-medium">{student.session}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-gray-500 font-bold w-32">Student ID</span>
                  <span className="text-gray-900 font-mono font-bold">{student.student_id}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-gray-500 font-bold w-32">Batch</span>
                  <span className="text-gray-900 font-medium">{student.batch}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-gray-500 font-bold w-32">Department</span>
                  <span className="text-gray-900 font-medium">{student.dept_name}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-gray-500 font-bold w-32">Print Date</span>
                  <span className="text-gray-900 font-medium">{printDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACADEMIC RECORD */}
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b-2 border-gray-300 pb-1 w-max">
              ACADEMIC RECORD
            </h2>

            <div className="border border-green-200 rounded-lg overflow-hidden bg-white">
              {/* Table Header Row */}
              <div className="bg-[#f0fbf4] px-4 py-3 flex items-center gap-4 border-b border-green-200">
                <h3 className="text-green-700 font-bold text-lg">
                  Level {summary.level} — Term {summary.term}
                </h3>
                <span className="text-gray-500 text-sm font-medium">
                  Academic Year: {summary.academic_year}
                </span>
              </div>

              {/* Table */}
              <table className="w-full text-left text-[13px] sm:text-sm">
                <thead className="bg-[#0b9c4f] text-white">
                  <tr>
                    <th className="px-4 py-2 font-bold w-[15%]">CODE</th>
                    <th className="px-4 py-2 font-bold w-[50%]">COURSE NAME</th>
                    <th className="px-4 py-2 font-bold text-center w-[10%]">CR</th>
                    <th className="px-4 py-2 font-bold text-center w-[10%]">GRADE</th>
                    <th className="px-4 py-2 font-bold text-center w-[15%]">POINT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r, idx) => (
                    <tr key={r.enrollment_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-2.5 text-gray-700 font-mono">{r.course_code}</td>
                      <td className="px-4 py-2.5 text-gray-700">{r.course_name}</td>
                      <td className="px-4 py-2.5 text-center text-gray-700">{parseFloat(r.credit).toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-center font-bold" style={{ color: '#0b9c4f' }}>
                        {r.grade_letter || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-700">
                        {r.grade_point ? parseFloat(r.grade_point).toFixed(2) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Table Footer */}
                <tfoot className="bg-[#f0fbf4] border-t border-green-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold text-gray-900">
                      Semester Summary
                    </td>
                    <td className="px-4 py-3 font-bold text-center text-gray-900">
                      {summary.credits}
                    </td>
                    <td colSpan={2} className="px-4 py-3 font-bold text-right text-[#0b9c4f]">
                      GPA: {summary.gpa}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
