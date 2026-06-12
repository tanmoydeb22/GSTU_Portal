import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCourseMarksForReview, saveStaffCourseMarks } from '../../api/staff.api';
import toast from 'react-hot-toast';
import { ChevronLeft, Save, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function StaffMarksEntry() {
  const { semesterId, offeringId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [offeringId, semesterId]);

  const loadData = async () => {
    try {
      const res = await getCourseMarksForReview(semesterId, offeringId);
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
    
    // Auto calculate total - ensure all values are parsed as numbers
    const att = parseFloat(s.attendance_marks) || 0;
    const asg = parseFloat(s.assignment_marks) || 0;
    const mid = parseFloat(s.mid_marks) || 0;
    const fin = parseFloat(s.final_marks) || 0;
    const total = att + asg + mid + fin;
    s.total_marks = parseFloat(total.toFixed(2));
    
    // Auto calculate grade
    const scale = data.grading_scale.find(
      sc => total >= parseFloat(sc.min_marks) && total <= parseFloat(sc.max_marks)
    );
    s.grade_letter = scale ? scale.grade_letter : 'F';
    
    setData({ ...data, students });
  };

  const handleSaveAndComplete = async () => {
    if (!window.confirm('Are you sure you want to verify and complete marks entry for this course? This will lock it from further teacher edits.')) return;

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
      await saveStaffCourseMarks(semesterId, offeringId, marksData);
      toast.success('Marks verified and course marked as Completed!');
      navigate(`/staff/grades/${semesterId}/results`); // we'll navigate back to the dashboard
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20">Data not found.</div>;

  const { config, students, marks_status } = data;
  const isCompleted = marks_status === 'Completed';
  
  // Column visibility logic
  const showAttendance = config.attendance_max > 0;
  const showAssignment = config.assignment_max > 0;
  const showMid = config.mid_max > 0;
  const showFinal = config.final_max > 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 pb-20">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <Link to={`/staff/grades/${semesterId}/results`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900">Marks Verification</h1>
          <p className="text-gray-600 font-medium">Verify, override, and finalize student marks.</p>
        </div>
        {isCompleted ? (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold text-sm">Verified & Completed</span>
          </div>
        ) : marks_status === 'In Progress' ? (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
            <Info className="w-5 h-5" />
            <span className="font-bold text-sm">Teacher Submitted</span>
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600">
          <span>Max Marks:</span>
          {showAttendance && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Attendance: {config.attendance_max}</span>}
          {showAssignment && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Assignment: {config.assignment_max}</span>}
          {showMid && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Mid: {config.mid_max}</span>}
          {showFinal && <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">Final: {config.final_max}</span>}
          <span className="bg-white px-3 py-1 rounded-lg border border-brand-200 text-brand-700 shadow-sm font-bold">Total: 100</span>
        </div>

        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-bold">Student ID</th>
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold text-gray-500 text-xs">Last Edit</th>
                {showAttendance && <th className="px-4 py-3 font-bold text-center">Att.</th>}
                {showAssignment && <th className="px-4 py-3 font-bold text-center">Assign.</th>}
                {showMid && <th className="px-4 py-3 font-bold text-center">Mid</th>}
                {showFinal && <th className="px-4 py-3 font-bold text-center">Final</th>}
                <th className="px-4 py-3 font-bold text-center bg-gray-200/50">Total</th>
                <th className="px-4 py-3 font-bold text-center bg-brand-50">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s, idx) => {
                const enteredBy = s.entered_by_role === 'teacher' ? (s.teacher_entered_name || 'Teacher') : (s.entered_by_role === 'dept_staff' ? 'Staff' : 'None');

                return (
                  <tr key={s.enrollment_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-brand-700">{s.student_code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-medium">
                      {enteredBy}
                    </td>
                    
                    {showAttendance && (
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" value={s.attendance_marks ?? ''} onChange={e => handleMarksChange(idx, 'attendance', e.target.value)}
                          className="w-16 px-1 py-1.5 text-center rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                      </td>
                    )}
                    {showAssignment && (
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" value={s.assignment_marks ?? ''} onChange={e => handleMarksChange(idx, 'assignment', e.target.value)}
                          className="w-16 px-1 py-1.5 text-center rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                      </td>
                    )}
                    {showMid && (
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" value={s.mid_marks ?? ''} onChange={e => handleMarksChange(idx, 'mid', e.target.value)}
                          className="w-16 px-1 py-1.5 text-center rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                      </td>
                    )}
                    {showFinal && (
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" value={s.final_marks ?? ''} onChange={e => handleMarksChange(idx, 'final', e.target.value)}
                          className="w-16 px-1 py-1.5 text-center rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
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
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0">
          <div className="text-sm text-gray-500 font-medium">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Saving will lock this course and finalize grades.
          </div>
          <Button onClick={handleSaveAndComplete} disabled={submitting} className="gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-700">
            <CheckCircle className="w-4 h-4" /> Verify & Complete
          </Button>
        </div>
      </div>
    </div>
  );
}
