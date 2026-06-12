import { useState, useEffect, useMemo } from 'react';
import { getStudents, getStudentDetail, createStudent, updateStudent, bulkAdvanceStudents, changeStudentStatus, resetStudentPassword, exportStudents, getSessions } from '../../api/staff.api';
import Modal from '../../components/ui/Modal';
import CredentialsModal from '../../components/ui/CredentialsModal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Plus, ChevronDown, Download, Search, User, Phone, Mail, Droplets, MapPin, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Credentials modal state
  const [credentialsModal, setCredentialsModal] = useState(false);
  const [credentialsData, setCredentialsData] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({ search: '', session: '', level: '', term: '', student_status: '', sort_by: 'session' });
  const [form, setForm] = useState({ student_id: '', name: '', email: '', phone: '', batch: '', session: '', level: '1', term: '1' });
  const [bulkForm, setBulkForm] = useState({ session: '' });
  const [allSessions, setAllSessions] = useState([]);

  useEffect(() => {
    getSessions().then(res => setAllSessions(res.data.data)).catch(() => {});
  }, []);

  const load = () => { 
    setLoading(true);
    getStudents({ all: 'true', ...filters })
      .then(r => setStudents(r.data.data.students))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false)); 
  };
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { load(); }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const openProfile = async (id) => {
    try {
      toast.loading('Loading profile...', { id: 'profile' });
      const res = await getStudentDetail(id);
      setSelectedStudent(res.data.data);
      setProfileModal(true);
      toast.dismiss('profile');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Failed to load profile', { id: 'profile' });
    }
  };

  // Group students by session
  const sessionGroups = useMemo(() => {
    const groups = {};
    students.forEach(s => {
      const key = s.session || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [students]);

  const [expandedSessions, setExpandedSessions] = useState(() => ({}));
  const toggleSession = (key) => setExpandedSessions(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateStudent(editing.student_id, form);
        toast.success('Student updated successfully!');
      } else {
        const res = await createStudent(form);
        if (res.data?.data?.temp_password) {
          setCredentialsData(res.data.data);
          setCredentialsModal(true);
        } else {
          toast.success('Student added successfully!');
        }
      }
      setModal(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save student');
    }
  };

  const handleBulkAdvance = async (e) => {
    e.preventDefault();
    if (!bulkForm.session) return toast.error('Please select a session');
    
    const studentInSession = students.find(s => s.session === bulkForm.session && s.student_status === 'Active');
    if (studentInSession && studentInSession.level === 4 && studentInSession.term === 2) {
      if (!window.confirm('This session is at the final term (4.2). Promoting them will mark them as Graduated. Proceed?')) return;
    }
    
    try {
      const res = await bulkAdvanceStudents({ session: bulkForm.session });
      toast.success(res.data.message || `Promoted students successfully!`);
      setBulkModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to promote students');
    }
  };

  const selectedSessionInfo = useMemo(() => {
    if (!bulkForm.session) return null;
    const studentInSession = students.find(s => s.session === bulkForm.session && s.student_status === 'Active');
    if (!studentInSession) return null;
    
    const lvl = parseInt(studentInSession.level);
    const trm = parseInt(studentInSession.term);
    let nextLvl = lvl, nextTrm = trm, graduated = false;
    if (trm === 1) { nextTrm = 2; }
    else if (lvl < 4) { nextLvl = lvl + 1; nextTrm = 1; }
    else { graduated = true; }
    
    return {
      current_level: lvl,
      current_term: trm,
      next_level: nextLvl,
      next_term: nextTrm,
      graduated
    };
  }, [bulkForm.session, students]);

  const handleExport = async () => {
    try {
      toast.loading('Generating Excel file...', { id: 'export' });
      const res = await exportStudents(filters);
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `students_${new Date().toISOString().slice(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Export downloaded!', { id: 'export' });
    } catch (error) {
      toast.error('Failed to export students', { id: 'export' });
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedStudent || !window.confirm(`Change status to ${status}?`)) return;
    try {
      await changeStudentStatus(selectedStudent.student.student_id, status);
      toast.success('Status updated');
      setProfileModal(false);
      load();
    } catch (err) { toast.error('Failed to update status'); }
  };

  const handlePasswordReset = async () => {
    if (!selectedStudent || !window.confirm('Reset password to a temporary password?')) return;
    try {
      const res = await resetStudentPassword(selectedStudent.student.student_id);
      if (res.data?.data?.temp_password) {
        setCredentialsData({ ...selectedStudent.student, temp_password: res.data.data.temp_password });
        setCredentialsModal(true);
        setProfileModal(false); // Close profile modal to show credentials clearly
      } else {
        toast.success('Password reset successfully');
      }
    } catch (err) { toast.error('Failed to reset password'); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">Advanced Student Management</h1>
          <p className="text-gray-500 text-xs md:text-sm">Manage student records, batch promote, and export data</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} className="flex items-center">
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
          <Button variant="outline" onClick={() => setBulkModal(true)} className="flex items-center">
            Promote Batch
          </Button>
          <Button onClick={() => { setEditing(null); setForm({ student_id: '', name: '', email: '', phone: '', batch: new Date().getFullYear().toString(), session: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, level: '1', term: '1' }); setModal(true); }} className="flex items-center bg-brand-600 hover:bg-brand-700">
            <Plus className="h-4 w-4 mr-2" /> Add Student
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by ID or Name..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
            value={filters.search}
            onChange={e => setFilters({...filters, search: e.target.value})}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-white outline-none" value={filters.session} onChange={e => setFilters({...filters, session: e.target.value})}>
            <option value="">All Sessions</option>
            {allSessions.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-white outline-none" value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})}>
            <option value="">All Levels</option>
            {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
          </select>

          <select className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-white outline-none" value={filters.student_status} onChange={e => setFilters({...filters, student_status: e.target.value})}>
            <option value="">All Statuses</option>
            {['Active', 'On Leave', 'Suspended', 'Graduated'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-gray-50 font-medium outline-none" value={filters.sort_by} onChange={e => setFilters({...filters, sort_by: e.target.value})}>
            <option value="session">Sort: Session</option>
            <option value="id">Sort: ID</option>
            <option value="name">Sort: Name</option>
            <option value="cgpa_desc">Sort: CGPA (High to Low)</option>
            <option value="cgpa_asc">Sort: CGPA (Low to High)</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : sessionGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 italic">No students found.</div>
      ) : (
        <div className="space-y-3">
          {sessionGroups.map(([session, sessionStudents]) => {
            const isOpen = expandedSessions[session] !== false; // default open
            const activeCount = sessionStudents.filter(s => s.student_status === 'Active').length;
            const levelGroups = {};
            sessionStudents.forEach(s => {
              const lk = `L${s.level}T${s.term}`;
              if (!levelGroups[lk]) levelGroups[lk] = [];
              levelGroups[lk].push(s);
            });
            return (
              <div key={session} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Session Header */}
                <button
                  onClick={() => toggleSession(session)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-gray-900 text-sm">Session {session}</span>
                      <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{sessionStudents.length} students</span>
                    </div>
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{activeCount} Active</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Students Grid */}
                {isOpen && (
                  <div className="p-4">
                    {Object.entries(levelGroups).sort().map(([lt, ltStudents]) => (
                      <div key={lt} className="mb-4 last:mb-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{lt}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                          {ltStudents.map(s => {
                            const statusColor = s.student_status === 'Active' ? 'bg-green-100 text-green-700'
                              : s.student_status === 'On Leave' ? 'bg-amber-100 text-amber-700'
                              : s.student_status === 'Suspended' ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700';
                            return (
                              <div
                                key={s.student_id}
                                onClick={() => openProfile(s.student_id)}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-all group"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                                  <span className="text-[10px] font-black text-gray-500 group-hover:text-brand-600">{s.name?.charAt(0)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">{s.name}</p>
                                  <p className="text-[10px] font-mono text-brand-600">{s.student_id}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}>{s.student_status || 'Active'}</span>
                                  <button
                                    onClick={e => { e.stopPropagation(); setEditing(s); setForm(s); setModal(true); }}
                                    className="text-[9px] font-bold text-gray-400 hover:text-brand-600 transition-colors"
                                  >Edit</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* STUDENT PROFILE MODAL */}
      <Modal isOpen={profileModal} onClose={() => setProfileModal(false)} title="Student Profile" size="sm">
        {selectedStudent && (
          <div className="space-y-6">
            {/* SECTION 1 — Header */}
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-full border-4 border-brand-50 bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                {selectedStudent.student.photo_url ? (
                  <img src={`${(import.meta.env.VITE_API_URL || 'http://localhost:5001').replace('/api', '')}${selectedStudent.student.photo_url}`} className="w-full h-full object-cover" alt="Student" />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-1">{selectedStudent.student.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-brand-700 font-bold bg-brand-50 px-2.5 py-0.5 rounded-full text-xs">{selectedStudent.student.student_id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedStudent.student.student_status === 'Active' ? 'bg-green-100 text-green-700' :
                    selectedStudent.student.student_status === 'On Leave' ? 'bg-yellow-100 text-yellow-700' :
                    selectedStudent.student.student_status === 'Suspended' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedStudent.student.student_status} {selectedStudent.student.student_status === 'Active' ? '✅' : selectedStudent.student.student_status === 'On Leave' ? '⚠️' : selectedStudent.student.student_status === 'Suspended' ? '🚫' : '🎓'}
                  </span>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {selectedStudent.student.dept_name || 'Department'}
                </div>
              </div>
            </div>

            {/* SECTION 2 — Academic Position */}
            <div className="space-y-2 border-t border-gray-100 pt-5">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Academic Position</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-500 font-medium mb-0.5 uppercase">Level/Term</p>
                  <p className="text-sm font-bold text-gray-900">L{selectedStudent.student.level} T{selectedStudent.student.term}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-500 font-medium mb-0.5 uppercase">Batch</p>
                  <p className="text-sm font-bold text-gray-900">{selectedStudent.student.batch}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-500 font-medium mb-0.5 uppercase">Session</p>
                  <p className="text-sm font-bold text-gray-900">{selectedStudent.student.session}</p>
                </div>
              </div>
            </div>

            {/* SECTION 3 — Contact Information */}
            <div className="space-y-3 border-t border-gray-100 pt-5">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Information</h3>
              <div className="grid gap-y-2 text-sm text-gray-700">
                <a href={`mailto:${selectedStudent.student.email}`} className="flex items-center gap-2 hover:text-brand-600">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0"/> {selectedStudent.student.email}
                </a>
                <a href={`tel:${selectedStudent.student.phone}`} className="flex items-center gap-2 hover:text-brand-600">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0"/> {selectedStudent.student.phone || 'N/A'}
                </a>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-red-400 shrink-0"/> 
                  <span>Blood Group: <strong className="text-gray-900">{selectedStudent.student.blood_group || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0"/> 
                  <span>Date of Birth: <strong className="text-gray-900">{selectedStudent.student.date_of_birth ? new Date(selectedStudent.student.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5"/> 
                  <span>Current: {selectedStudent.student.address || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5"/> 
                  <span>Permanent: {selectedStudent.student.permanent_address || '—'}</span>
                </div>
              </div>
            </div>

            {/* SECTION 4 — Guardian Emergency Contact */}
            <div className="space-y-3 border-t border-gray-100 pt-5">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">👨‍👩‍👦 Guardian (Emergency Contact)</h3>
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                {selectedStudent.student.guardian_name ? (
                  <div className="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
                    <span className="text-gray-500 font-medium">Name</span>
                    <span className="font-bold text-gray-900">: {selectedStudent.student.guardian_name}</span>
                    
                    <span className="text-gray-500 font-medium">Relation</span>
                    <span className="text-gray-700">: {selectedStudent.student.guardian_relation || 'Not specified'}</span>
                    
                    <span className="text-gray-500 font-medium flex items-center">Phone</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-gray-900">: {selectedStudent.student.guardian_phone || 'N/A'}</span>
                      {selectedStudent.student.guardian_phone && (
                        <a href={`tel:${selectedStudent.student.guardian_phone}`} className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-bold hover:bg-green-100 transition-colors">
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm">
                    <span className="text-lg leading-none">⚠️</span>
                    <span className="font-medium">Guardian info not provided by student</span>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 5 — Semester Status */}
            <div className="space-y-3 border-t border-gray-100 pt-5">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Semester Status {selectedStudent.current_semester ? `(Current: L${selectedStudent.current_semester.level}T${selectedStudent.current_semester.term} ${selectedStudent.current_semester.academic_year})` : ''}
              </h3>
              
              {selectedStudent.current_semester ? (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm space-y-2">
                  <div className="grid grid-cols-[100px_1fr]">
                    <span className="text-gray-600 font-medium">Registration</span>
                    <span className="font-bold text-gray-900">: {selectedStudent.current_semester.is_registered ? '✅ Registered' : '❌ Not Registered'}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr]">
                    <span className="text-gray-600 font-medium">Payment</span>
                    <span className="font-bold flex items-center gap-1">
                      : 
                      {selectedStudent.current_semester.payment_status === 'Paid' ? <span className="text-green-600">✅ Completed</span> :
                       <span className="text-yellow-600">⏳ Pending</span>}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100">No active semester found for this department.</div>
              )}
            </div>

            {/* SECTION 6 — Action Buttons */}
            <div className="border-t border-gray-100 pt-5 flex flex-wrap gap-2 justify-between items-center">
              <Button variant="outline" size="sm" onClick={handlePasswordReset}>Reset Password</Button>
              <select className="border border-gray-200 rounded-lg text-sm font-medium px-3 py-1.5 bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" value={selectedStudent.student.student_status} onChange={e => {if(e.target.value) handleStatusChange(e.target.value)}}>
                <option value="" disabled>Change Status ▼</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Suspended">Suspended</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Student Info' : 'Add New Student'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Student ID" value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} required disabled={!!editing} />
            <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <Input label="Batch (e.g. 2023)" value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} required />
            <Input label="Session (e.g. 2023-2024)" value={form.session} onChange={e => setForm({...form, session: e.target.value})} required />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Level</label>
              <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Term</label>
              <select value={form.term} onChange={e => setForm({...form, term: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {[1,2].map(t => <option key={t} value={t}>Term {t}</option>)}
              </select>
            </div>

            <Input label="Guardian Name" value={form.guardian_name || ''} onChange={e => setForm({...form, guardian_name: e.target.value})} />
            <Input label="Guardian Phone" value={form.guardian_phone || ''} onChange={e => setForm({...form, guardian_phone: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" type="button" onClick={() => { setModal(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit">{editing ? 'Update Student' : 'Create Student'}</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Advance Modal */}
      <Modal isOpen={bulkModal} onClose={() => setBulkModal(false)} title="🎓 Promote Students">
        <form onSubmit={handleBulkAdvance} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Session to Promote</label>
              <select value={bulkForm.session} onChange={e => setBulkForm({...bulkForm, session: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Choose a session...</option>
                {allSessions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {selectedSessionInfo ? (
            <>
              <div className="bg-brand-50 p-5 rounded-xl border border-brand-100 flex items-center gap-4">
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Current</p>
                  <p className="text-lg font-display font-bold text-gray-900">L{selectedSessionInfo.current_level} T{selectedSessionInfo.current_term}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <ChevronRight className="h-5 w-5 text-brand-600" />
                </div>
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Next</p>
                  <p className="text-lg font-display font-bold text-brand-600">
                    {selectedSessionInfo.graduated ? 'Graduated' : `L${selectedSessionInfo.next_level} T${selectedSessionInfo.next_term}`}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">All active students in this session will be promoted to {selectedSessionInfo.graduated ? 'Graduated status' : `Level ${selectedSessionInfo.next_level} Term ${selectedSessionInfo.next_term}`}.</p>
            </>
          ) : bulkForm.session ? (
            <p className="text-xs text-red-500 text-center py-4 bg-red-50 rounded-lg border border-red-100">No active students found in this session on the current page.</p>
          ) : (
            <p className="text-xs text-gray-500 text-center mt-2">Select a session to see promotion details.</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setBulkModal(false)}>Cancel</Button>
            <Button type="submit" disabled={!bulkForm.session || !selectedSessionInfo} className="bg-brand-600 hover:bg-brand-700 px-8">
              Promote Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={credentialsModal}
        onClose={() => setCredentialsModal(false)}
        credentials={credentialsData}
      />
    </div>
  );
}
