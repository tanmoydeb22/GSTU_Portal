import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCourseMarksForReview, publishGrades, overrideStudentGrade } from '../../api/staff.api';
import toast from 'react-hot-toast';
import { ChevronLeft, CheckCircle, Edit3 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

export default function GradeReview() {
  const { offeringId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const [overrideModal, setOverrideModal] = useState({ open: false, student: null, reason: '' });
  const [overrideMarks, setOverrideMarks] = useState({ attendance: 0, assignment: 0, mid: 0, final: 0 });

  useEffect(() => {
    loadData();
  }, [offeringId]);

  const loadData = async () => {
    try {
      const res = await getCourseMarksForReview(offeringId);
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load marks');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to verify and publish these grades? This will make them visible to students.')) return;
    try {
      setPublishing(true);
      await publishGrades(offeringId);
      toast.success('Grades verified and published successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const openOverride = (student) => {
    setOverrideMarks({
      attendance: student.attendance_marks || 0,
      assignment: student.assignment_marks || 0,
      mid: student.mid_marks || 0,
      final: student.final_marks || 0
    });
    setOverrideModal({ open: true, student, reason: '' });
  };

  const submitOverride = async (e) => {
    e.preventDefault();
    if (!overrideModal.reason) return toast.error('Reason is required');

    try {
      await overrideStudentGrade(offeringId, {
        enrollment_id: overrideModal.student.enrollment_id,
        attendance: overrideMarks.attendance,
        assignment: overrideMarks.assignment,
        mid: overrideMarks.mid,
        final: overrideMarks.final,
        reason: overrideModal.reason
      });
      toast.success('Grade overridden successfully');
      setOverrideModal({ open: false, student: null, reason: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to override grade');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20">Data not found.</div>;

  const { config, students, marks_submitted_at } = data;
  const isSubmitted = !!marks_submitted_at;
  const allPublished = students.length > 0 && students.every(s => s.is_published);

  // Column visibility logic
  const showAttendance = config.attendance_max > 0;
  const showAssignment = config.assignment_max > 0;
  const showMid = config.mid_max > 0;
  const showFinal = config.final_max > 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 pb-20">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <Link to="/staff/grades" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Grades
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900">Grade Verification</h1>
          <p className="text-gray-600 font-medium">Review and verify marks submitted by the teacher.</p>
        </div>
        <div>
          {allPublished ? (
            <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold text-sm">Published</span>
            </div>
          ) : isSubmitted ? (
            <Button onClick={handlePublish} disabled={publishing} className="gap-2 shadow-md">
              <CheckCircle className="w-4 h-4" /> Verify & Publish
            </Button>
          ) : (
            <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
              <span className="font-bold text-sm">Waiting for Teacher Submission</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4 text-sm font-medium text-gray-600">
          <div className="flex gap-4">
            <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Max Marks:</span>
            {showAttendance && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Attendance: {config.attendance_max}</span>}
            {showAssignment && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Assignment: {config.assignment_max}</span>}
            {showMid && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Mid Exam: {config.mid_max}</span>}
            {showFinal && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Final Exam: {config.final_max}</span>}
          </div>
          {isSubmitted && <span className="text-xs text-gray-400">Teacher Submitted: {new Date(marks_submitted_at).toLocaleString()}</span>}
        </div>

        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-bold">Student ID</th>
                <th className="px-4 py-3 font-bold">Name</th>
                {showAttendance && <th className="px-4 py-3 font-bold text-center">Attendance</th>}
                {showAssignment && <th className="px-4 py-3 font-bold text-center">Assignment</th>}
                {showMid && <th className="px-4 py-3 font-bold text-center">Mid Exam</th>}
                {showFinal && <th className="px-4 py-3 font-bold text-center">Final Exam</th>}
                <th className="px-4 py-3 font-bold text-center bg-gray-200/50">Total</th>
                <th className="px-4 py-3 font-bold text-center bg-brand-50">Grade</th>
                {!allPublished && <th className="px-4 py-3 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.enrollment_id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono font-bold text-brand-700">{s.student_code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  
                  {showAttendance && <td className="px-4 py-3 text-center">{s.attendance_marks ?? '—'}</td>}
                  {showAssignment && <td className="px-4 py-3 text-center">{s.assignment_marks ?? '—'}</td>}
                  {showMid && <td className="px-4 py-3 text-center">{s.mid_marks ?? '—'}</td>}
                  {showFinal && <td className="px-4 py-3 text-center">{s.final_marks ?? '—'}</td>}
                  
                  <td className="px-4 py-3 font-bold text-center bg-gray-50/50">{s.total_marks ?? 0}</td>
                  <td className={`px-4 py-3 font-bold text-center ${s.grade_letter === 'F' ? 'text-red-600 bg-red-50/50' : 'text-emerald-700 bg-emerald-50/50'}`}>
                    {s.grade_letter || '—'}
                  </td>
                  {!allPublished && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openOverride(s)} disabled={!isSubmitted} className="text-gray-400 hover:text-brand-600 p-1 rounded transition-colors disabled:opacity-50">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={overrideModal.open} onClose={() => setOverrideModal({ open: false, student: null, reason: '' })} title={`Override Grade: ${overrideModal.student?.student_code}`}>
        <form onSubmit={submitOverride} className="space-y-4">
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
            You are overriding the marks submitted by the teacher. This action will be logged in the grade audit trail.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {showAttendance && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Attendance (Max {config.attendance_max})</label>
                <input type="number" step="0.01" value={overrideMarks.attendance} onChange={e => setOverrideMarks({ ...overrideMarks, attendance: parseFloat(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brand-500" required />
              </div>
            )}
            {showAssignment && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Assignment (Max {config.assignment_max})</label>
                <input type="number" step="0.01" value={overrideMarks.assignment} onChange={e => setOverrideMarks({ ...overrideMarks, assignment: parseFloat(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brand-500" required />
              </div>
            )}
            {showMid && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mid Exam (Max {config.mid_max})</label>
                <input type="number" step="0.01" value={overrideMarks.mid} onChange={e => setOverrideMarks({ ...overrideMarks, mid: parseFloat(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brand-500" required />
              </div>
            )}
            {showFinal && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Final Exam (Max {config.final_max})</label>
                <input type="number" step="0.01" value={overrideMarks.final} onChange={e => setOverrideMarks({ ...overrideMarks, final: parseFloat(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brand-500" required />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Override <span className="text-red-500">*</span></label>
            <textarea value={overrideModal.reason} onChange={e => setOverrideModal({ ...overrideModal, reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brand-500 min-h-[80px]" placeholder="Explain why this grade is being changed..." required></textarea>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setOverrideModal({ open: false, student: null, reason: '' })}>Cancel</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white">Save Override</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
