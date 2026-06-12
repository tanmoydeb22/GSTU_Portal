import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseStudents, bulkUpdateCourseGrades, exportCourseStudents } from '../../api/teacher.api';
import { Users, Save, Download, FileText, ChevronLeft, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function TeacherCourseDetails() {
  const { id: offeringId } = useParams();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Grade state: { enrollment_id: grade_point }
  const [draftGrades, setDraftGrades] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [offeringId]);

  const loadStudents = () => {
    setLoading(true);
    getCourseStudents(offeringId)
      .then(r => {
        setStudents(r.data.data);
        const initialDrafts = {};
        r.data.data.forEach(s => {
          if (s.grade_point !== null) initialDrafts[s.enrollment_id] = s.grade_point;
        });
        setDraftGrades(initialDrafts);
      })
      .catch(e => {
        console.error(e);
        toast.error('Failed to load students');
      })
      .finally(() => setLoading(false));
  };

  const handleGradeChange = (enrollmentId, val) => {
    setDraftGrades(prev => ({ ...prev, [enrollmentId]: val }));
  };

  const handleSaveDraft = async () => {
    const payload = Object.entries(draftGrades).map(([enrollment_id, grade_point]) => ({
      enrollment_id,
      grade_point: grade_point === '' ? null : parseFloat(grade_point)
    })).filter(g => g.grade_point !== null && !isNaN(g.grade_point));

    if (payload.length === 0) return toast.error('No valid grades entered');

    setIsSaving(true);
    try {
      await bulkUpdateCourseGrades(offeringId, { grades: payload });
      toast.success('Grades saved as Draft successfully!');
      loadStudents(); // reload to get letters and status
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save grades');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format) => {
    try {
      toast.loading(`Generating ${format.toUpperCase()}...`, { id: 'export' });
      const res = await exportCourseStudents(offeringId, format);
      
      const mime = format === 'pdf' ? 'application/pdf' : 'text/csv';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mime }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Course_Roster_${offeringId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${format.toUpperCase()} Downloaded!`, { id: 'export' });
    } catch (err) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFullyPublished = students.length > 0 && students.every(s => s.is_published === 1);
  const hasChanges = Object.keys(draftGrades).some(eid => {
    const student = students.find(s => s.enrollment_id === parseInt(eid));
    return student && String(student.grade_point) !== String(draftGrades[eid]);
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <button onClick={() => navigate('/teacher/courses')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Courses
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
              Student Roster <span className="bg-brand-100 text-brand-700 text-sm py-1 px-3 rounded-full">{students.length} Enrolled</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Review student list and submit grades for Dept Staff approval.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => handleExport('csv')} variant="outline" className="text-sm">
              <FileText className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={() => handleExport('pdf')} variant="outline" className="text-sm">
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            {!isFullyPublished && (
              <Button onClick={handleSaveDraft} disabled={isSaving || !hasChanges} className="bg-brand-600 hover:bg-brand-700 text-white">
                <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Drafts'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by Name or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 text-sm border-transparent focus:border-transparent focus:ring-0 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors py-2.5"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-20 text-gray-400 italic">No students found matching your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-bold w-16">#</th>
                  <th className="px-6 py-4 font-bold">Student</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold w-32">Grade Point</th>
                  <th className="px-6 py-4 font-bold w-32">Grade Letter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((s, idx) => (
                  <tr key={s.enrollment_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 font-mono">{s.student_id}</p>
                      <p className="text-xs text-gray-500">{s.name}</p>
                      <p className="text-[10px] text-brand-600 font-bold mt-1">Batch {s.batch}</p>
                    </td>
                    <td className="px-6 py-4">
                      {s.is_published ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Published
                        </span>
                      ) : s.grade_point !== null ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                          <Save className="w-3 h-3" /> Draft Saved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                          <AlertCircle className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.is_published ? (
                        <span className="font-mono font-bold text-gray-900">{s.grade_point?.toFixed(2) || '—'}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="4"
                          value={draftGrades[s.enrollment_id] ?? ''}
                          onChange={(e) => handleGradeChange(s.enrollment_id, e.target.value)}
                          placeholder="e.g. 3.50"
                          className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500 font-mono py-1.5 px-3 bg-gray-50 hover:bg-white transition-colors"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${s.grade_letter === 'F' ? 'text-red-500' : 'text-gray-900'}`}>
                        {s.grade_letter || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
