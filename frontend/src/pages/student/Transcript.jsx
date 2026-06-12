import { useState, useEffect, useRef } from 'react';
import { getTranscript, downloadTranscriptPDF, getCourseBreakdown } from '../../api/student.api';
import GradeBadge from '../../components/domain/GradeBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Download, Filter, Loader2, Check, FileText, ShieldCheck } from 'lucide-react';
import { TranscriptSkeleton } from '../../components/ui/Skeletons';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Transcript() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  
  // Marks Breakdown Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalCourse, setModalCourse] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const hiddenExportRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getTranscript(),
      new Promise(resolve => setTimeout(resolve, 400))
    ])
      .then(([r]) => setData(r.data.data))
      .catch(() => toast.error('Failed to load transcript'))
      .finally(() => setLoading(false));
  }, []);



  const handleOfficialPDFDownload = async () => {
    try {
      setDownloadingPDF(true);
      const response = await downloadTranscriptPDF();
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GSTU_Transcript_${data?.student?.student_id || 'Unknown'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Official transcript downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate transcript. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleRowClick = async (course) => {
    if (course.is_published !== 1) {
      toast.error('Marks are not available until results are officially published.');
      return;
    }
    setModalCourse(course);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await getCourseBreakdown(course.enrollment_id);
      setModalData(res.data.data);
    } catch (err) {
      toast.error('Marks breakdown not available or not published yet.');
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) return <TranscriptSkeleton />;
  if (!data) return null;

  const { student, records } = data;

  const groupRecords = (recs) => {
    const grouped = {};
    recs.forEach(r => {
      const key = `${r.level}-${r.term}`;
      if (!grouped[key]) grouped[key] = { level: r.level, term: r.term, ay: r.academic_year, courses: [] };
      grouped[key].courses.push(r);
    });
    return Object.values(grouped).sort((a, b) => b.level - a.level || b.term - a.term);
  };

  const bestGrades = {};
  records.forEach(r => {
    if (!bestGrades[r.course_code] || r.grade_point > bestGrades[r.course_code].grade_point) {
      bestGrades[r.course_code] = r;
    }
  });

  const semesters = groupRecords(records).filter(sem => levelFilter === 'all' || sem.level === parseInt(levelFilter));
  


  const isSemCompleted = (sem) => sem.courses.every(c => c.status === 'Completed' && c.grade_point !== null);

  const SemesterTable = ({ sem, isExport = false }) => {
    const isSemPublished = sem.courses.length > 0 && sem.courses.every(c => c.is_published === 1);
    const totalCr = sem.courses.reduce((s, c) => s + parseFloat(c.credit), 0);
    const points = isSemPublished ? sem.courses.reduce((s, c) => s + (parseFloat(c.grade_point) || 0) * parseFloat(c.credit), 0) : null;
    const gpa = (isSemPublished && totalCr > 0) ? (points / totalCr).toFixed(3) : '—';
    const completed = isSemCompleted(sem);

    return (
      <div className={`bg-white rounded-xl border ${isExport ? 'w-[750px] border-gray-300' : 'shadow-sm'}`}>
        <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b">
          <h3 className="font-bold text-gray-800">Level {sem.level} — Term {sem.term} <span className="text-gray-400 font-normal ml-2">({sem.ay})</span></h3>
          {!isExport && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSemPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {isSemPublished ? 'COMPLETED' : 'NOT PUBLISHED YET'}
            </span>
          )}
        </div>
        {(!isMobile || isExport) && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-bold">Code</th>
                  <th className="text-left font-bold">Course Name</th>
                  <th className="text-center font-bold w-20">Cr</th>
                  <th className="text-center font-bold w-20">Grade</th>
                  <th className="text-center font-bold w-20">Point</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sem.courses.map((c, i) => (
                  <tr 
                    key={i} 
                    onClick={() => handleRowClick(c)}
                    className="text-gray-700 cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
                  >
                    <td className="px-5 py-3 font-mono font-medium">{c.course_code}</td>
                    <td className="py-3 px-2">
                      {c.course_name}
                    </td>
                    <td className="text-center">{c.credit}</td>
                    <td className="text-center">
                      {c.is_published === 1 ? (
                        isExport ? (
                          <span className="font-bold text-brand-600">{c.grade_letter}</span>
                        ) : (
                          <GradeBadge grade={c.grade_letter} />
                        )
                      ) : (
                        <span className="text-gray-400 font-medium text-xs">Pending</span>
                      )}
                    </td>
                    <td className="text-center font-mono">{c.is_published === 1 && c.grade_point !== null ? parseFloat(c.grade_point).toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isMobile && !isExport && (
          <div className="p-3 space-y-3 bg-gray-50/30">
            {sem.courses.map((c, i) => (
              <div 
                key={i} 
                onClick={() => handleRowClick(c)}
                className={`bg-white rounded-xl p-3 border border-gray-100 shadow-sm ${c.status === 'Completed' ? 'active:scale-[0.98] cursor-pointer' : ''}`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-sm text-brand-600 font-bold">{c.course_code}</span>
                  <div className="flex items-center gap-2">
                    {c.is_published === 1 ? (
                      <GradeBadge grade={c.grade_letter} />
                    ) : (
                      <span className="text-gray-400 font-bold text-[10px] uppercase bg-gray-100 px-2 py-0.5 rounded-full">Pending</span>
                    )}
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-800 leading-tight mb-2">
                  {c.course_name}
                </p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">{c.credit} Credits</span>
                  {c.is_published === 1 && c.grade_point !== null && (
                     <span className="text-[10px] text-gray-500 font-bold uppercase">Point: {parseFloat(c.grade_point).toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="px-5 py-3 bg-gray-50/50 border-t flex justify-between items-center text-xs font-bold text-gray-600">
          <div className="flex gap-6">
            <span>CREDITS: {totalCr.toFixed(1)}</span>
            <span>POINTS: {points !== null ? points.toFixed(2) : '—'}</span>
          </div>
          <div className="text-brand-700">GPA: {gpa}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex flex-wrap justify-between items-start gap-3 no-print">
        <h1 className="text-2xl font-bold text-gray-900">Academic Transcript</h1>
        <div className="flex items-center gap-3">
          {/* Official PDF Download button */}
          <button
            id="official-transcript-download-btn"
            onClick={handleOfficialPDFDownload}
            disabled={downloadingPDF}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm
              bg-brand-600 text-white hover:bg-brand-700 active:scale-95
              disabled:opacity-70 disabled:cursor-not-allowed
              shadow-lg shadow-brand-500/25 transition-all duration-200"
          >
            {downloadingPDF ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><ShieldCheck className="h-4 w-4" /> Download Transcript</>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-8 shadow-sm">
        <div className="text-center border-b pb-8 mb-8">
          <h2 className="text-2xl font-display font-bold text-brand-700">Gopalganj Science & Technology University</h2>
          <p className="text-gray-500 font-medium">Academic Record Transcript</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Student Name</label><p className="font-bold text-gray-900">{student.name}</p></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">ID Number</label><p className="font-mono font-bold text-gray-900">{student.student_id}</p></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Department</label><p className="font-bold text-gray-900">{student.dept_name}</p></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Session</label><p className="font-bold text-gray-900">{student.session}</p></div>
        </div>
      </div>

      <div className="space-y-8">
        {semesters.map(sem => <SemesterTable key={sem.level + sem.term} sem={sem} />)}
      </div>

      <div className="bg-brand-600 rounded-2xl p-8 text-white flex justify-around shadow-xl">
        <div className="text-center"><p className="text-4xl font-bold">{parseFloat(student.cgpa || 0).toFixed(3)}</p><p className="text-brand-200 text-xs uppercase font-bold mt-1">Overall CGPA</p></div>
        <div className="text-center"><p className="text-4xl font-bold">{student.total_credit_completed || 0}</p><p className="text-brand-200 text-xs uppercase font-bold mt-1">Credits Earned</p></div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Course Marks: ${modalCourse?.course_code || ''}`}>
        <div className="space-y-4">
          {modalLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
          ) : modalData ? (
            <div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900">{modalCourse?.course_name}</h3>
                  <p className="text-xs text-gray-500">Course Type: {modalData.course_type}</p>
                </div>
                <div className="text-right">
                  {modalData.grade?.letter ? (
                    <GradeBadge grade={modalData.grade.letter} />
                  ) : (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">In Progress</span>
                  )}
                </div>
              </div>

              {!modalData.has_marks ? (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="font-bold">No marks entered yet</p>
                    <p className="text-xs text-blue-500 mt-0.5">Your teacher hasn't entered any marks for this course yet. Check back later.</p>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-2 font-bold">Component</th>
                        <th className="px-4 py-2 font-bold text-right">Marks Secured</th>
                        <th className="px-4 py-2 font-bold text-right">Max Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {modalData.config?.attendance_max > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-gray-800">Attendance</td>
                          <td className="px-4 py-2 text-right font-medium">{modalData.breakdown.attendance_marks ?? '—'}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{modalData.config.attendance_max}</td>
                        </tr>
                      )}
                      {modalData.config?.assignment_max > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-gray-800">Assignment / Lab</td>
                          <td className="px-4 py-2 text-right font-medium">{modalData.breakdown.assignment_marks ?? '—'}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{modalData.config.assignment_max}</td>
                        </tr>
                      )}
                      {modalData.config?.mid_max > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-gray-800">Mid Exam</td>
                          <td className="px-4 py-2 text-right font-medium">{modalData.breakdown.mid_marks ?? '—'}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{modalData.config.mid_max}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">Failed to load data.</p>
          )}
          <div className="flex justify-end pt-4">
            <Button onClick={() => setModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
