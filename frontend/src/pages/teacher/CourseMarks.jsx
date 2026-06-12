import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCourseMarks, saveCourseMarks, submitCourseMarks } from '../../api/teacher.api';
import toast from 'react-hot-toast';
import { ChevronLeft, Save, Send, AlertTriangle } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function CourseMarks() {
  const { offeringId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [offeringId]);

  const loadData = async () => {
    try {
      const res = await getCourseMarks(offeringId);
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load marks');
    } finally {
      setLoading(false);
    }
  };

  const handleMarksChange = (idx, field, val) => {
    const students = [...data.students];
    const s = students[idx];
    s[`${field}_marks`] = val === '' ? null : parseFloat(val);
    
    // Auto calculate total
    const total = 
      (s.attendance_marks || 0) + 
      (s.assignment_marks || 0) + 
      (s.mid_marks || 0) + 
      (s.final_marks || 0);
    s.total_marks = total;
    
    // Auto calculate grade
    const scale = data.grading_scale.find(
      sc => total >= parseFloat(sc.min_marks) && total <= parseFloat(sc.max_marks)
    );
    s.grade_letter = scale ? scale.grade_letter : 'F';
    
    setData({ ...data, students });
  };

  const handleSave = async () => {
    // Validation
    const marksData = data.students.map(s => ({
      enrollment_id: s.enrollment_id,
      attendance: s.attendance_marks || 0,
      assignment: s.assignment_marks || 0,
      mid: s.mid_marks || 0,
      final: s.final_marks || 0,
    }));

    try {
      setSubmitting(true);
      await saveCourseMarks(offeringId, marksData);
      toast.success('Marks saved successfully as draft');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit? You cannot edit marks after submission.')) return;
    
    // Ensure save first
    const marksData = data.students.map(s => ({
      enrollment_id: s.enrollment_id,
      attendance: s.attendance_marks || 0,
      assignment: s.assignment_marks || 0,
      mid: s.mid_marks || 0,
      final: s.final_marks || 0,
    }));

    try {
      setSubmitting(true);
      await saveCourseMarks(offeringId, marksData);
      await submitCourseMarks(offeringId);
      toast.success('Marks submitted to Department successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20">Data not found.</div>;

  const { config, students, marks_status, marks_submitted_at } = data;
  const isSubmitted = marks_status !== 'Pending';
  const isLocked = marks_status === 'Completed';
  
  // Column visibility logic
  const showAttendance = config.attendance_max > 0;
  const showAssignment = config.assignment_max > 0;
  const showMid = config.mid_max > 0;
  const showFinal = config.final_max > 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 pb-20">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <Link to={`/teacher/courses/${offeringId}`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Course
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900">Marks Entry</h1>
          <p className="text-gray-600 font-medium">Enter component-wise marks for students.</p>
        </div>
        {isLocked ? (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
            <span className="font-bold text-sm">🔒 Locked by Department (Verified)</span>
          </div>
        ) : isSubmitted ? (
          <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold text-sm">Submitted on {new Date(marks_submitted_at).toLocaleDateString()} (Pending Verification)</span>
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600">
          <span>Max Marks:</span>
          {showAttendance && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Attendance: {config.attendance_max}</span>}
          {showAssignment && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Assignment: {config.assignment_max}</span>}
          {showMid && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Mid Exam: {config.mid_max}</span>}
          {showFinal && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Final Exam: {config.final_max}</span>}
          <span className="bg-white px-3 py-1 rounded-lg border border-brand-200 text-brand-700 shadow-sm font-bold">Total: 100</span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s, idx) => {
                const isAttErr = s.attendance_marks > config.attendance_max;
                const isAsgErr = s.assignment_marks > config.assignment_max;
                const isMidErr = s.mid_marks > config.mid_max;
                const isFinErr = s.final_marks > config.final_max;

                return (
                  <tr key={s.enrollment_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-brand-700">{s.student_code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    
                    {showAttendance && (
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" disabled={isSubmitted} value={s.attendance_marks ?? ''} onChange={e => handleMarksChange(idx, 'attendance', e.target.value)}
                          className={`w-20 px-2 py-1.5 text-center rounded border ${isAttErr ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300'} disabled:bg-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500`} />
                      </td>
                    )}
                    {showAssignment && (
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" disabled={isSubmitted} value={s.assignment_marks ?? ''} onChange={e => handleMarksChange(idx, 'assignment', e.target.value)}
                          className={`w-20 px-2 py-1.5 text-center rounded border ${isAsgErr ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300'} disabled:bg-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500`} />
                      </td>
                    )}
                    {showMid && (
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" disabled={isSubmitted} value={s.mid_marks ?? ''} onChange={e => handleMarksChange(idx, 'mid', e.target.value)}
                          className={`w-20 px-2 py-1.5 text-center rounded border ${isMidErr ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300'} disabled:bg-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500`} />
                      </td>
                    )}
                    {showFinal && (
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" disabled={isSubmitted} value={s.final_marks ?? ''} onChange={e => handleMarksChange(idx, 'final', e.target.value)}
                          className={`w-20 px-2 py-1.5 text-center rounded border ${isFinErr ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300'} disabled:bg-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500`} />
                      </td>
                    )}
                    
                    <td className="px-4 py-3 font-bold text-center bg-gray-50/50">
                      {s.total_marks ?? 0}
                    </td>
                    <td className={`px-4 py-3 font-bold text-center ${s.grade_letter === 'F' ? 'text-red-600 bg-red-50/50' : 'text-emerald-700 bg-emerald-50/50'}`}>
                      {s.grade_letter || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {!isSubmitted && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 sticky bottom-0">
            <Button variant="outline" onClick={handleSave} disabled={submitting} className="gap-2 bg-white">
              <Save className="w-4 h-4" /> Save as Draft
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2 shadow-md">
              <Send className="w-4 h-4" /> Submit to Department
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
