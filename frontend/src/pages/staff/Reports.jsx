import { useState, useEffect } from 'react';
import { getResultReport, getSemesters, exportResultReportPDF, getSessions } from '../../api/staff.api';
import Button from '../../components/ui/Button';
import { Download, Filter, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reports() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  
  const [data, setData] = useState({ students: [] });
  const [loading, setLoading] = useState(false);

  // 1. Fetch Sessions (Batches)
  useEffect(() => {
    getSessions().then(r => {
      const s = r.data.data;
      setSessions(s);
      if (s.length > 0) setSelectedSession(s[0]);
    }).catch(err => console.error('Failed to load sessions', err));
  }, []);

  // 2. Fetch Semesters for the selected session
  useEffect(() => {
    if (!selectedSession) return;
    setSemesters([]);
    setSelectedSemester('');
    getSemesters({ student_session: selectedSession }).then(r => {
      const sems = r.data.data;
      setSemesters(sems);
      if (sems.length > 0) setSelectedSemester(sems[0].semester_id);
    }).catch(err => console.error('Failed to load semesters', err));
  }, [selectedSession]);

  // 3. Fetch Result Data when Semester changes
  useEffect(() => {
    if (!selectedSemester) {
      setData({ students: [] });
      return;
    }
    setLoading(true);
    getResultReport({ semester_id: selectedSemester })
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load result report'))
      .finally(() => setLoading(false));
  }, [selectedSemester]);

  const handleExport = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf' });
      const res = await exportResultReportPDF({ semester_id: selectedSemester });
      
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

  const selectedSemesterData = semesters.find(s => String(s.semester_id) === String(selectedSemester));
  
  const uniqueCourses = Array.from(new Set(
    data.students.flatMap(s => s.courses.map(c => c.course_code))
  )).sort();

  const sortedStudents = [...data.students].sort((a, b) => {
    if (b.batch !== a.batch) return b.batch - a.batch;
    return a.student_id.localeCompare(b.student_id);
  });

  const uniqueSessionsList = Array.from(new Set(semesters.map(s => s.academic_year)));
  const availableSemesters = semesters.filter(s => s.academic_year === selectedSession);

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          
          <select 
            value={selectedSession} 
            onChange={e => setSelectedSession(e.target.value)}
            className="text-sm font-bold border-gray-200 rounded-lg focus:ring-brand-500"
          >
            <option value="" disabled>Select Session</option>
            {sessions.map(session => (
              <option key={session} value={session}>
                Session {session}
              </option>
            ))}
          </select>

          <select 
            value={selectedSemester} 
            onChange={e => setSelectedSemester(e.target.value)}
            className="text-sm font-bold border-gray-200 rounded-lg focus:ring-brand-500"
            disabled={!selectedSession}
          >
            <option value="" disabled>Select Level & Term</option>
            {availableSemesters.map(s => (
              <option key={s.semester_id} value={s.semester_id}>
                Level {s.level} Term {s.term}
              </option>
            ))}
          </select>
        </div>
        
        <Button onClick={handleExport} disabled={!selectedSemester || data.students.length === 0} className="bg-brand-600 hover:bg-brand-700 text-white shadow-md">
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : data.students.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 text-gray-400 shadow-sm">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">No results found for the selected semester.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden p-6">
          <div className="text-center mb-6 border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-display font-bold text-brand-700 uppercase tracking-wider">Gopalganj Science & Technology University</h1>
            <h2 className="text-lg font-bold text-gray-800 mt-1">Academic Result Report</h2>
            {selectedSemesterData && (
              <div className="flex justify-center items-center gap-4 mt-3 text-xs font-bold text-gray-600 bg-gray-50 inline-flex px-4 py-1.5 rounded-full border border-gray-200">
                <p>Session: <span className="text-brand-600">{selectedSemesterData.academic_year}</span></p>
                <p>Level: <span className="text-brand-600">{selectedSemesterData.level}</span></p>
                <p>Term: <span className="text-brand-600">{selectedSemesterData.term}</span></p>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-gray-300 rounded-lg">
              <thead className="bg-brand-600 text-white">
                <tr>
                  <th className="px-2 py-2 font-bold border border-brand-700 whitespace-nowrap">Student ID</th>
                  <th className="px-2 py-2 font-bold border border-brand-700 whitespace-nowrap min-w-[120px]">Name</th>
                  {uniqueCourses.map(course => (
                    <th key={course} className="px-2 py-2 font-bold text-center border border-brand-700 whitespace-nowrap">{course}</th>
                  ))}
                  <th className="px-2 py-2 font-bold text-center border border-brand-700 whitespace-nowrap">GPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedStudents.map((s, idx) => (
                  <tr key={s.student_id} className={`hover:bg-brand-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-2 py-1.5 font-bold text-gray-900 border border-gray-200 whitespace-nowrap">{s.student_id}</td>
                    <td className="px-2 py-1.5 text-gray-700 border border-gray-200 whitespace-nowrap truncate max-w-[150px]">{s.name}</td>
                    {uniqueCourses.map(courseCode => {
                      const courseData = s.courses.find(c => c.course_code === courseCode);
                      const grade = courseData ? courseData.grade_letter : '—';
                      return (
                        <td key={courseCode} className={`px-2 py-1.5 text-center font-bold border border-gray-200 ${grade === 'F' ? 'text-red-600 bg-red-50/50' : 'text-gray-800'}`}>
                          {grade}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center border border-gray-200 bg-brand-50/30">
                      <span className={`font-mono font-bold ${parseFloat(s.semester_gpa) < 2.0 ? 'text-red-600' : 'text-brand-700'}`}>
                        {s.semester_gpa}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
