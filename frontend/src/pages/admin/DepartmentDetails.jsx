import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDepartmentOverview, getDepartmentStudents, getDepartmentTeachers, getDepartmentResults, getDepartmentStaffAccess, createDepartmentStaffAccess, resetStaffPassword, toggleStaffStatus, getSemesterResultBoard, revokeStaffAccess } from '../../api/admin.api';
import { ChevronLeft, Users, GraduationCap, KeyRound, CheckCircle2, XCircle, FileText, Lock, Building2, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function DepartmentDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [studentsBySession, setStudentsBySession] = useState([]);
  const [results, setResults] = useState([]);
  const [staffAccess, setStaffAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  const [expandedSession, setExpandedSession] = useState(null);

  // Load basic overview
  const loadOverview = async () => {
    try {
      const res = await getDepartmentOverview(id);
      setData(res.data.data.department);
      setStudentsBySession(res.data.data.students_by_session);
    } catch (err) {
      toast.error('Failed to load department details');
    }
  };

  // Load tab-specific data
  useEffect(() => {
    loadOverview().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 'teachers') {
      getDepartmentTeachers(id).then(res => setTeachers(res.data.data)).catch(() => toast.error('Failed to load teachers'));
    } else if (activeTab === 'results') {
      getDepartmentResults(id).then(res => setResults(res.data.data)).catch(() => toast.error('Failed to load results'));
    } else if (activeTab === 'access') {
      loadStaffAccess();
    }
  }, [activeTab, id]);

  const loadStaffAccess = () => {
    getDepartmentStaffAccess(id).then(res => setStaffAccess(res.data.data)).catch(() => toast.error('Failed to load access data'));
  };

  // Tab 1: Students ----------------------------------------------------
  const [viewStudentsModal, setViewStudentsModal] = useState(false);
  const [selectedSessionStudents, setSelectedSessionStudents] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  
  const handleViewStudents = async (session) => {
    setViewStudentsModal(true);
    setSessionLoading(true);
    try {
      const res = await getDepartmentStudents(id, { session });
      setSelectedSessionStudents(res.data.data);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setSessionLoading(false);
    }
  };

  // Tab 3: Dept Access --------------------------------------------------
  const [accessModal, setAccessModal] = useState(false);
  const [accessForm, setAccessForm] = useState({ name: '', designation: '', email: '', phone: '' });
  const [credentialsModal, setCredentialsModal] = useState(null);

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    try {
      const res = await createDepartmentStaffAccess(id, accessForm);
      setAccessModal(false);
      setAccessForm({ name: '', email: '', phone: '' });
      setCredentialsModal({
        title: `✅ Access Created — ${data.dept_name}`,
        staff_code: res.data.data.staff_code,
        temp_password: res.data.data.temp_password,
        message: 'Share this with the Section Officer.\nPassword cannot be viewed again.'
      });
      loadStaffAccess();
      toast.success('Access generated successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to grant access');
    }
  };

  const handleResetPassword = async (staff) => {
    if (!window.confirm(`Are you sure you want to reset password for ${data.dept_code} Section Officer?`)) return;
    try {
      const res = await resetStaffPassword(staff.staff_id);
      setCredentialsModal({
        title: `🔑 Reset Password — ${data.dept_code} Department`,
        subtitle: `Section Officer: ${staff.name}`,
        temp_password: res.data.data.temp_password,
        message: 'Staff must change on next login.\nShare this password directly.'
      });
      toast.success('Password reset successfully');
    } catch (err) {
      toast.error('Failed to reset password');
    }
  };

  const handleToggleStatus = async (staff) => {
    if (!window.confirm(`Are you sure you want to ${staff.is_active ? 'deactivate' : 'activate'} this account?`)) return;
    try {
      await toggleStaffStatus(staff.staff_id, !staff.is_active);
      toast.success(`Account ${staff.is_active ? 'deactivated' : 'activated'}`);
      loadStaffAccess();
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  const handleRevokeAccess = async (staff) => {
    if (!window.confirm(`⚠️ CRITICAL WARNING: Are you sure you want to completely REVOKE access for the ${data.dept_code} Department?\nThis will delete the Section Officer account and allow you to reassign a new person to this role. This action cannot be undone.`)) return;
    try {
      await revokeStaffAccess(staff.staff_id);
      toast.success(`Access revoked for ${data.dept_code} Department`);
      loadStaffAccess();
    } catch (err) {
      toast.error('Failed to revoke access');
    }
  };

  const [resultBoardModal, setResultBoardModal] = useState(false);
  const [resultBoardData, setResultBoardData] = useState([]);
  const [resultBoardLoading, setResultBoardLoading] = useState(false);

  const handleViewResultBoard = async (semesterId) => {
    setResultBoardModal(true);
    setResultBoardLoading(true);
    try {
      const res = await getSemesterResultBoard(semesterId);
      setResultBoardData(res.data.data);
    } catch (err) {
      toast.error('Failed to load semester results');
      setResultBoardModal(false);
    } finally {
      setResultBoardLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20">Department not found</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <Link to="/admin/departments" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-brand-600 mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Departments
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
              <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-lg border border-brand-100">{data.dept_code}</span>
              {data.dept_name}
            </h1>
          </div>
          <div className="flex gap-4 text-sm font-medium text-gray-600">
            <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-emerald-500"/> Students: {data.student_count}</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-500"/> Teachers: {data.teacher_count}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 no-scrollbar">
          {[
            { id: 'students', label: 'Students', icon: GraduationCap },
            { id: 'teachers', label: 'Teachers', icon: Users },
            { id: 'access', label: 'Dept Access', icon: KeyRound },
            { id: 'results', label: 'Results', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-brand-600 text-brand-600 bg-brand-50/30' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          
          {/* TAB: STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              {studentsBySession.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No students enrolled.</div>
              ) : (
                <div className="grid gap-4">
                  {studentsBySession.map((s) => (
                    <div key={s.session} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                      <div>
                        <h3 className="font-bold text-gray-900">Session {s.session}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{s.count} students enrolled</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleViewStudents(s.session)}>
                        View Students
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: TEACHERS */}
          {activeTab === 'teachers' && (
            <div>
              {teachers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No teachers assigned.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Designation</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {teachers.map(t => (
                      <tr key={t.teacher_id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm text-gray-600">{t.teacher_code}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{t.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{t.designation}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{t.email}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{t.phone}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB: DEPT ACCESS */}
          {activeTab === 'access' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Department Access Control</h2>
                  <p className="text-sm text-gray-500">Each department has one Section Officer with portal access.</p>
                </div>
                {staffAccess.length === 0 && (
                  <Button onClick={() => setAccessModal(true)}>+ Grant Section Officer Access</Button>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-sm text-gray-700">
                  Section Officer Account
                </div>
                {staffAccess.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No section officer access granted yet.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Code</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Login</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {staffAccess.map(s => (
                        <tr key={s.staff_id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm font-bold text-brand-600">{s.staff_code}</td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-500">{s.designation}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {s.last_login ? new Date(s.last_login).toLocaleString() : 'Never'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={() => handleResetPassword(s)} className="text-amber-600 border-amber-200 hover:bg-amber-50" title="Reset Password">
                                        <KeyRound className="w-4 h-4" />
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => handleToggleStatus(s)} className={s.is_active ? 'text-gray-600 border-gray-200 hover:bg-gray-100' : 'text-red-600 border-red-200 hover:bg-red-50'} title={s.is_active ? 'Deactivate Access' : 'Activate Access'}>
                                        {s.is_active ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => handleRevokeAccess(s)} className="text-red-600 border-red-200 hover:bg-red-50" title="Revoke Access">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB: RESULTS */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {results.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No semesters found.</div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    results.reduce((acc, r) => {
                      if (!acc[r.academic_year]) acc[r.academic_year] = [];
                      acc[r.academic_year].push(r);
                      return acc;
                    }, {})
                  ).sort((a, b) => b[0].localeCompare(a[0])).map(([session, sessionResults]) => {
                    const isExpanded = expandedSession === session;
                    return (
                      <div key={session} className="border border-gray-200 bg-white rounded-2xl overflow-hidden shadow-sm">
                        {/* Session Card Header */}
                        <div 
                          className={`p-6 cursor-pointer flex items-center justify-between transition-colors ${isExpanded ? 'bg-brand-50 border-b border-brand-100' : 'hover:bg-gray-50'}`}
                          onClick={() => setExpandedSession(isExpanded ? null : session)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                              <FileText className="w-6 h-6 text-brand-600" />
                            </div>
                            <div>
                              <h3 className="font-display font-bold text-xl text-gray-900">Session {session}</h3>
                              <p className="text-sm text-gray-500 font-medium">{sessionResults.length} Semesters</p>
                            </div>
                          </div>
                          <div className="text-gray-400">
                            {isExpanded ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            )}
                          </div>
                        </div>

                        {/* Session Expanded Content */}
                        {isExpanded && (
                          <div className="p-6 bg-gray-50/50">
                            <div className="grid gap-4">
                              {sessionResults.map((r) => (
                                <div key={r.semester_id} className="border border-gray-200 bg-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-all hover:border-brand-300">
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-lg">Level {r.level} Term {r.term}</h4>
                                    <div className="mt-1">
                                      {r.result_published_at ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                                          Published on {new Date(r.result_published_at).toLocaleDateString()}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
                                          Not Published
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {r.result_published_at && (
                                    <Button variant="outline" onClick={() => handleViewResultBoard(r.semester_id)}>
                                      View Results
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modal: View Students */}
      <Modal isOpen={viewStudentsModal} onClose={() => setViewStudentsModal(false)} title="Session Students" size="lg">
        {sessionLoading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 sticky top-0 bg-white">
                  <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CGPA</th>
                  <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedSessionStudents.map(s => (
                  <tr key={s.student_id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 font-mono text-sm text-gray-700">{s.student_id}</td>
                    <td className="py-2 px-4 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2 px-4 text-sm font-bold text-gray-600">{s.cgpa > 0 ? parseFloat(s.cgpa).toFixed(2) : '—'}</td>
                    <td className="py-2 px-4 text-sm">{s.is_active ? <span className="text-emerald-600">Active</span> : <span className="text-red-600">Inactive</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Modal: Grant Access */}
      <Modal isOpen={accessModal} onClose={() => setAccessModal(false)} title={`🔑 Grant Portal Access`}>
        <form onSubmit={handleGrantAccess} className="space-y-4">
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Department</p>
            <p className="text-lg font-bold text-gray-900">{data.dept_name}</p>
          </div>

          <Input label="Full Name" value={accessForm.name} onChange={e=>setAccessForm({...accessForm, name: e.target.value})} required placeholder="e.g. Md. Karim Hossain" />
          <Input label="Email" type="email" value={accessForm.email} onChange={e=>setAccessForm({...accessForm, email: e.target.value})} required placeholder="e.g. karim@gstu.ac.bd" />
          <Input label="Phone" value={accessForm.phone} onChange={e=>setAccessForm({...accessForm, phone: e.target.value})} required placeholder="e.g. +8801700000000" />
          

          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" type="button" onClick={() => setAccessModal(false)}>Cancel</Button>
            <Button type="submit">Create Access</Button>
          </div>
        </form>
      </Modal>

      {/* CREDENTIALS DISPLAY MODAL (SHOWN ONCE) */}
      <Modal isOpen={!!credentialsModal} onClose={() => setCredentialsModal(null)} title={credentialsModal?.title || "Credentials"} preventClose>
        {credentialsModal && (
          <div className="space-y-6">
            {credentialsModal.subtitle && (
              <p className="text-sm font-bold text-gray-700">{credentialsModal.subtitle}</p>
            )}
            
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <div className="space-y-4">
                {credentialsModal.staff_code && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Staff Code</p>
                    <p className="font-mono text-lg font-bold text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg select-all">{credentialsModal.staff_code}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{credentialsModal.staff_code ? 'Password' : 'New Password'}</p>
                  <p className="font-mono text-lg font-bold text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg select-all">{credentialsModal.temp_password}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 font-bold whitespace-pre-line">
                ⚠️ {credentialsModal.message}
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => {
                const text = credentialsModal.staff_code 
                  ? `Staff Code: ${credentialsModal.staff_code}\nPassword: ${credentialsModal.temp_password}`
                  : `New Password: ${credentialsModal.temp_password}`;
                navigator.clipboard.writeText(text);
                toast.success('Copied to clipboard');
              }}>
                📋 Copy
              </Button>
              <Button onClick={() => setCredentialsModal(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Result Board Modal */}
      {resultBoardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Semester Results</h3>
                <p className="text-sm text-gray-500 mt-1">Student GPAs for this semester</p>
              </div>
              <button onClick={() => setResultBoardModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {resultBoardLoading ? (
                <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
              ) : resultBoardData.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No results found for this semester.</div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student ID</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Semester GPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {resultBoardData.map(s => (
                        <tr key={s.student_id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-sm font-medium text-gray-900">{s.student_id}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{s.name}</td>
                          <td className="py-3 px-4 text-sm font-bold text-brand-600">{Number(s.sgpa).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
