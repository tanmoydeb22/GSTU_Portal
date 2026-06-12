import React, { useState, useEffect } from 'react';
import {
  getClosedSemesters, getHistoricalOfferings, assignHistoricalTeachers,
  bulkEnrollHistorical, getMarksTemplate, bulkGradeEntryHistorical, getHistoricalStatus,
  getSessions, getStudents
} from '../../api/staff.api';
import toast from 'react-hot-toast';
import {
  FolderClock, CheckCircle, Download, Upload, AlertCircle, Users, BookOpen
} from 'lucide-react';
import Button from '../../components/ui/Button';

export default function HistoricalData() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [activeTab, setActiveTab] = useState(1);
  const [status, setStatus] = useState(null);

  // Tab 1 Data
  const [offerings, setOfferings] = useState([]);
  const [teachersByDept, setTeachersByDept] = useState({});
  const [teacherAssignments, setTeacherAssignments] = useState({});

  // Tab 2 Data
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');

  // Tab 3 Data
  const [file, setFile] = useState(null);

  useEffect(() => {
    getClosedSemesters().then(res => setSemesters(res.data.data)).catch(() => { });
    getSessions().then(res => setSessions(res.data.data)).catch(() => { });
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      loadSemesterData();
    } else {
      setStatus(null);
      setOfferings([]);
      setTeacherAssignments({});
    }
  }, [selectedSemester]);

  const loadSemesterData = async () => {
    try {
      const [offeringsRes, statusRes] = await Promise.all([
        getHistoricalOfferings(selectedSemester),
        getHistoricalStatus(selectedSemester)
      ]);

      const { offerings: obs, teachersByDept: tbd } = offeringsRes.data.data;
      setOfferings(obs);
      setTeachersByDept(tbd);
      setStatus(statusRes.data.data);

      const assignments = {};
      obs.forEach(o => { assignments[o.offering_id] = o.teacher_id || ''; });
      setTeacherAssignments(assignments);
    } catch (err) {
      toast.error('Failed to load semester data');
    }
  };

  const handleSaveTeachers = async () => {
    try {
      const assignments = Object.keys(teacherAssignments).map(offering_id => ({
        offering_id,
        teacher_id: teacherAssignments[offering_id] || null
      }));
      await assignHistoricalTeachers(selectedSemester, assignments);
      toast.success('Teachers assigned successfully');
      loadSemesterData();
    } catch (err) {
      toast.error('Failed to assign teachers');
    }
  };

  const handleBulkEnroll = async () => {
    if (!selectedSession) return toast.error('Please select a session');

    try {
      toast.loading('Fetching students...', { id: 'enroll' });
      const studentsRes = await getStudents({ session: selectedSession, all: 'true' });
      const activeStudents = studentsRes.data.data.students.filter(s => s.student_status === 'Active');

      if (activeStudents.length === 0) {
        toast.dismiss('enroll');
        return toast.error('No active students found in this session');
      }

      if (!window.confirm(`Enroll ${activeStudents.length} students into all courses of this semester?`)) {
        toast.dismiss('enroll');
        return;
      }

      toast.loading('Enrolling students...', { id: 'enroll' });
      const studentIds = activeStudents.map(s => s.student_id);
      await bulkEnrollHistorical(selectedSemester, { student_ids: studentIds });
      toast.success('Students enrolled successfully!', { id: 'enroll' });
      loadSemesterData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enroll students', { id: 'enroll' });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      toast.loading('Generating template...', { id: 'template' });
      const res = await getMarksTemplate(selectedSemester);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historical_grades_${selectedSemester}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded', { id: 'template' });
    } catch (err) {
      toast.error('Failed to download template', { id: 'template' });
    }
  };

  const handleUploadGrades = async () => {
    if (!file) return toast.error('Please select a file');

    try {
      toast.loading('Uploading and processing grades...', { id: 'grades' });
      const formData = new FormData();
      formData.append('file', file);

      const res = await bulkGradeEntryHistorical(selectedSemester, formData);
      toast.success(res.data.message || `Processed ${res.data.data.updated} grades`, { id: 'grades' });
      setFile(null);
      loadSemesterData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload grades', { id: 'grades' });
      if (err.response?.data?.data && Array.isArray(err.response.data.data)) {
        console.error('Validation Errors:', err.response.data.data);
      }
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-brand-100 text-brand-600 rounded-xl">
          <FolderClock className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Historical Data Entry</h1>
          <p className="text-sm text-gray-500">Retroactively enter past semester data — teachers, enrollments, and results</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Past Semester</label>
        <select
          className="w-full max-w-md border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
          value={selectedSemester}
          onChange={e => setSelectedSemester(e.target.value)}
        >
          <option value="">-- Select a closed semester --</option>
          {semesters.map(s => (
            <option key={s.semester_id} value={s.semester_id}>
              {s.academic_year} | Level {s.level} | Term {s.term} | Closed
            </option>
          ))}
        </select>
        {semesters.length === 0 && <p className="text-sm text-amber-600 mt-2">No closed semesters found.</p>}
      </div>

      {selectedSemester && status && (
        <div className="space-y-6">
          {/* Status Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`p-2 rounded-full ${status.teachers_assigned === status.offerings_total ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Teachers</p>
                <p className="text-lg font-bold">{status.teachers_assigned} / {status.offerings_total}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`p-2 rounded-full ${status.students_enrolled > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Students Enrolled</p>
                <p className="text-lg font-bold">{status.students_enrolled}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`p-2 rounded-full ${status.students_with_grades === status.students_enrolled && status.students_enrolled > 0 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Grades Entered</p>
                <p className="text-lg font-bold">{status.students_with_grades} / {status.students_enrolled}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button onClick={() => setActiveTab(1)} className={`flex-1 py-4 text-sm font-medium ${activeTab === 1 ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>1. Teacher Assignment</button>
              <button onClick={() => setActiveTab(2)} className={`flex-1 py-4 text-sm font-medium ${activeTab === 2 ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>2. Student Enrollment</button>
              <button onClick={() => setActiveTab(3)} className={`flex-1 py-4 text-sm font-medium ${activeTab === 3 ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>3. Marks & Results</button>
            </div>

            <div className="p-6">
              {/* TAB 1 */}
              {activeTab === 1 && (
                <div className="space-y-6">
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-medium">
                        <tr>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Course Name</th>
                          <th className="px-4 py-3">Teacher</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {offerings.map(o => {
                          const deptTeachers = teachersByDept[o.course_dept_id] || [];
                          return (
                            <tr key={o.offering_id}>
                              <td className="px-4 py-3 font-mono font-medium text-brand-600">{o.course_code}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span>{o.course_name}</span>
                                  {o.is_cross_dept && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Cross-Department Course">
                                      [{o.course_dept_code}] 🔀
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {/viva|project|thesis/i.test(o.course_name) ? (
                                  <div className="w-full max-w-sm border border-gray-200 bg-gray-50 text-gray-700 rounded px-3 py-1.5 text-sm">
                                     All Teacher 
                                  </div>
                                ) : deptTeachers.length === 0 ? (
                                  <div className="w-full max-w-sm">
                                    <select disabled className="w-full border border-red-200 bg-red-50 text-red-600 rounded px-3 py-1.5 text-sm outline-none opacity-80 cursor-not-allowed">
                                      <option>-- TBA (To Be Assigned) --</option>
                                    </select>
                                    <p className="text-xs text-red-500 mt-1">No teachers found for [{o.course_dept_code}] dept. Admin must add.</p>
                                  </div>
                                ) : (
                                  <select 
                                    className="w-full max-w-sm border border-gray-200 rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-brand-500 text-sm"
                                    value={teacherAssignments[o.offering_id] || ''}
                                    onChange={e => setTeacherAssignments({...teacherAssignments, [o.offering_id]: e.target.value})}
                                  >
                                    <option value="">-- TBA (To Be Assigned) --</option>
                                    {deptTeachers.map(t => (
                                      <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveTeachers} className="bg-brand-600 hover:bg-brand-700 text-white">Save Teacher Assignments</Button>
                  </div>
                </div>
              )}

              {/* TAB 2 */}
              {activeTab === 2 && (
                <div className="space-y-8">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Option A — Bulk Enroll by Session (Recommended)</h3>
                    <p className="text-sm text-gray-600 mb-4">Select a session to enroll all its currently active students into all {offerings.length} courses of this semester.</p>
                    
                    <div className="flex items-end gap-4 max-w-lg">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Select Session</label>
                        <select 
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none"
                          value={selectedSession}
                          onChange={e => setSelectedSession(e.target.value)}
                        >
                          <option value="">-- Select Session --</option>
                          {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <Button onClick={handleBulkEnroll} disabled={!selectedSession} className="bg-brand-600 hover:bg-brand-700 h-[42px]">
                        Enroll All Students
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Option B — Irregular Student Entry</h3>
                    <p className="text-sm text-gray-600 mb-4">To handle dropouts, re-admissions, or customized past enrollments, use the individual manual registration page instead.</p>
                    <Button variant="outline" onClick={() => window.open('/staff/enrollments', '_blank')}>Go to Manual Registrations ↗</Button>
                  </div>
                </div>
              )}

              {/* TAB 3 */}
              {activeTab === 3 && (
                <div className="space-y-8">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-bold mb-1">Before entering marks:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Make sure you have completed <strong>Tab 2 (Student Enrollment)</strong> first.</li>
                        <li>This action will definitively recalculate CGPA and mark the semester as <strong>Published</strong>.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
                      <Download className="w-8 h-8 text-brand-600 mx-auto mb-3" />
                      <h4 className="font-bold text-gray-900 mb-2">1. Download Template</h4>
                      <p className="text-xs text-gray-500 mb-4">Pre-filled with enrolled students and course codes for this specific semester.</p>
                      <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">Download Excel Template</Button>
                    </div>
                    
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
                      <Upload className="w-8 h-8 text-brand-600 mx-auto mb-3" />
                      <h4 className="font-bold text-gray-900 mb-2">2. Upload Grades</h4>
                      <p className="text-xs text-gray-500 mb-4">Fill out the template using Grade Letters (A+, B-, F) and upload it here.</p>
                      <input 
                        type="file" 
                        accept=".xlsx"
                        id="gradeUpload"
                        className="hidden"
                        onChange={e => setFile(e.target.files[0])}
                      />
                      <label 
                        htmlFor="gradeUpload" 
                        className={`block w-full py-2 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${file ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 hover:border-brand-500 text-gray-600'}`}
                      >
                        {file ? file.name : 'Click to select Excel file'}
                      </label>
                      {file && (
                        <Button onClick={handleUploadGrades} className="w-full mt-4 bg-brand-600 hover:bg-brand-700">Confirm & Save All Grades</Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

