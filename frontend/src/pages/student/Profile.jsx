import { useState, useEffect, useRef } from 'react';
import { getStudentProfile, updateStudentProfile, uploadStudentPhoto, getGraduationStatus } from '../../api/student.api';
import Input from '../../components/ui/Input';
import { Camera, Mail, Phone, Building2, Calendar, BookOpen, Shield, Users, CreditCard, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProfileSkeleton } from '../../components/ui/Skeletons';
import SecurityTab from '../../components/domain/SecurityTab';
import axios from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const Field = ({ label, value, editing, editEl }) => (
  <div>
    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
    {editing && editEl ? (
      editEl
    ) : (
      <div className="text-[15px] font-semibold text-gray-900">
        {value || <span className="italic text-gray-400 font-normal">Not provided</span>}
      </div>
    )}
  </div>
);

export default function StudentProfile() {
  const { updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('personal');
  const [profile, setProfile] = useState(null);
  const [gradStatus, setGradStatus] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadProfile = () => {
    Promise.all([getStudentProfile(), getGraduationStatus()])
      .then(([profileRes, gradRes]) => {
        setProfile(profileRes.data.data);
        setGradStatus(gradRes.data.data);
        setForm({
          phone: profileRes.data.data.phone || '',
          address: profileRes.data.data.address || '',
          permanent_address: profileRes.data.data.permanent_address || '',
          guardian_name: profileRes.data.data.guardian_name || '',
          guardian_phone: profileRes.data.data.guardian_phone || '',
          guardian_relation: profileRes.data.data.guardian_relation || '',
          blood_group: profileRes.data.data.blood_group || '',
        });
      }).catch(() => toast.error('Failed to load profile data'));
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSaveInfo = async () => {
    if (form.phone && !/^(?:\+88|88)?(01[3-9]\d{8})$/.test(form.phone))
      return toast.error('Invalid phone number (BD format required)');
    if (form.guardian_phone && !/^(?:\+88|88)?(01[3-9]\d{8})$/.test(form.guardian_phone))
      return toast.error('Invalid guardian phone number');
    
    try {
      await updateStudentProfile(form);
      toast.success('Changes saved successfully');
      setEditing(false);
      setProfile({ ...profile, ...form });
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Photo must be less than 2MB');
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await uploadStudentPhoto(formData);
      setProfile({ ...profile, photo_url: res.data.data.photo_url });
      updateUser({ photo_url: res.data.data.photo_url });
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  if (!profile || !gradStatus) return <ProfileSkeleton />;

  const photoSrc = profile.photo_url ? `${API_URL}${profile.photo_url}` : null;
  const { completed_semesters_count, total_semesters_required, level_progress } = gradStatus;
  const progressPercentage = Math.round((completed_semesters_count / total_semesters_required) * 100);

  const calculateCompletion = () => {
    if (!profile) return 0;
    const fields = ['name', 'email', 'phone', 'blood_group', 'address', 'permanent_address', 'guardian_name', 'guardian_phone', 'date_of_birth'];
    const filled = fields.filter(f => !!profile[f]).length;
    return Math.round((filled / fields.length) * 100);
  };
  const completion = calculateCompletion();

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  };

  const getGpaColor = (gpa) => {
    if (!gpa || isNaN(gpa)) return 'text-gray-400';
    if (gpa >= 3.5) return 'text-emerald-600';
    if (gpa >= 2.5) return 'text-amber-600';
    return 'text-red-500';
  };

  const tabs = [
    { id: 'personal', label: 'Personal', icon: Users },
    { id: 'guardian', label: 'Guardian', icon: Shield },
    { id: 'academic', label: 'Academic', icon: BookOpen },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* ── TOP HEADER SECTION ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6 relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          
          {/* Avatar Area */}
          <div className="relative group shrink-0">
            <div className="w-36 h-36 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center ring-4 ring-emerald-50">
              {photoSrc ? (
                <img 
                  src={photoSrc} 
                  alt={profile.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => { 
                    e.target.style.display = 'none'; 
                    e.target.nextSibling.style.display = 'flex'; 
                  }} 
                />
              ) : null}
              <span className={`text-4xl font-bold text-emerald-700 ${photoSrc ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                {getInitials(profile.name)}
              </span>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer backdrop-blur-sm"
            >
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{isUploading ? 'Uploading...' : 'Update Photo'}</span>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} />
          </div>

          {/* Profile Info */}
          <div className="flex-1 flex flex-col justify-center text-center md:text-left mt-2">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{profile.name}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-mono font-bold rounded-full">
                  {profile.student_id}
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-full border border-emerald-100">
                  {profile.dept_code}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-500" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span>{profile.phone || 'No phone set'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <span>{profile.dept_name}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Active Student
              </span>
              <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 text-gray-700 text-xs font-bold rounded-xl shadow-sm">
                B.Sc. in Engg.
              </span>
              {profile.blood_group && (
                <span className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-xl shadow-sm">
                  Blood Group: {profile.blood_group}
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats Right Side */}
          <div className="hidden lg:flex gap-6 pl-8 border-l border-gray-100">
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Current CGPA</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-emerald-600 tracking-tighter">
                  {parseFloat(profile.cgpa || 0).toFixed(2)}
                </span>
                <span className="text-sm font-medium text-gray-400">/ 4.00</span>
              </div>
              
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ── LEFT SIDEBAR (Progress) ── */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-gray-900">Academic Status</h3>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span className="text-gray-600">Degree Progress</span>
                  <span className="text-emerald-600">{progressPercentage}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 relative overflow-hidden"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12" />
                  </div>
                </div>
              </div>

              {/* Semester Timeline */}
              <div className="pt-2">
                <div className="flex justify-between items-center relative">
                  <div className="absolute top-[17px] left-2 right-2 h-[3px] bg-gray-100 rounded-full"></div>
                  <div className="absolute top-[17px] left-2 h-[3px] bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `calc(${progressPercentage}% - 16px)` }}></div>
                  {[
                    { label: 'L1T1', l: 1, t: 1 },
                    { label: 'L1T2', l: 1, t: 2 },
                    { label: 'L2T1', l: 2, t: 1 },
                    { label: 'L2T2', l: 2, t: 2 },
                    { label: 'L3T1', l: 3, t: 1 },
                    { label: 'L3T2', l: 3, t: 2 },
                    { label: 'L4T1', l: 4, t: 1 },
                    { label: 'L4T2', l: 4, t: 2 }
                  ].map((s, idx) => {
                    const isCompleted = s.l < profile.level || (s.l === profile.level && s.t < profile.term);
                    const isCurrent = s.l === profile.level && s.t === profile.term;
                    return (
                      <div key={s.label} className="flex flex-col items-center bg-white px-1 z-10" title={s.label}>
                        <span className={`text-[9px] font-bold mb-1.5 ${isCompleted ? 'text-emerald-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>{s.label}</span>
                        <div className={`w-3 h-3 rounded-full ${isCompleted ? 'bg-emerald-500 ring-2 ring-emerald-100' : isCurrent ? 'bg-blue-500 ring-4 ring-blue-100' : 'bg-white border-[3px] border-gray-200'}`} />
                        <span className="text-[11px] mt-2 leading-none">{isCompleted ? '✅' : isCurrent ? '🔵' : '⏳'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pt-5 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Level</div>
                  <div className="text-lg font-bold text-gray-900">L{profile.level} T{profile.term}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Session</div>
                  <div className="text-lg font-bold text-gray-900">{profile.session}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT TABS ── */}
        <div className="lg:col-span-8">
          
          {/* Custom Tabs */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 p-1 bg-white rounded-2xl shadow-sm border border-gray-100">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button 
                key={id}
                onClick={() => { setActiveTab(id); setEditing(false); }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                  ${activeTab === id 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'
                  }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === id ? 'text-emerald-600' : 'text-gray-400'}`} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            
            {/* PERSONAL TAB */}
            {activeTab === 'personal' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                  {!editing ? (
                    <button 
                      onClick={() => setEditing(true)} 
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition flex items-center gap-2"
                    >
                      ✏️ Edit Details
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <Field editing={editing} label="Full Name" value={profile.name} />
                  <Field editing={editing} label="Email Address" value={profile.email} />
                  
                  <Field editing={editing} 
                    label="Phone Number" 
                    value={profile.phone}
                    editEl={
                      <Input 
                        value={form.phone} 
                        onChange={e => setForm({ ...form, phone: e.target.value })} 
                        placeholder="01XXXXXXXXX" 
                        className="bg-white"
                      />
                    }
                  />
                  
                  <Field editing={editing} 
                    label="Blood Group" 
                    value={profile.blood_group}
                    editEl={
                      <select 
                        className="w-full rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm p-3 outline-none transition-all bg-white" 
                        value={form.blood_group} 
                        onChange={e => setForm({ ...form, blood_group: e.target.value })}
                      >
                        <option value="">Select blood group...</option>
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    }
                  />
                  
                  <div className="md:col-span-2">
                    <Field editing={editing} 
                      label="Current Address" 
                      value={profile.address}
                      editEl={
                        <textarea 
                          className="w-full rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm p-4 outline-none transition-all bg-white resize-none" 
                          rows="3" 
                          placeholder="Enter your current residential address"
                          value={form.address} 
                          onChange={e => setForm({ ...form, address: e.target.value })} 
                        />
                      }
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Field editing={editing} 
                      label="Permanent Address" 
                      value={profile.permanent_address}
                      editEl={
                        <textarea 
                          className="w-full rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm p-4 outline-none transition-all bg-white resize-none" 
                          rows="3" 
                          placeholder="Enter your permanent home address"
                          value={form.permanent_address} 
                          onChange={e => setForm({ ...form, permanent_address: e.target.value })} 
                        />
                      }
                    />
                  </div>
                </div>

                {editing && (
                  <div className="flex justify-end gap-3 pt-8 mt-8 border-t border-gray-100">
                    <button 
                      onClick={() => setEditing(false)} 
                      className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveInfo} 
                      className="px-6 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* GUARDIAN TAB */}
            {activeTab === 'guardian' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-bold text-gray-900">Guardian Information</h3>
                  {!editing && (
                    <button 
                      onClick={() => setEditing(true)} 
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition flex items-center gap-2"
                    >
                      ✏️ Edit Details
                    </button>
                  )}
                </div>

                {/* Guardian warning reminder */}
                {!editing && (!profile.guardian_name || !profile.guardian_phone || !profile.guardian_relation) && (
                  <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3 text-yellow-800">
                    <span className="text-xl leading-none">⚠️</span>
                    <p className="text-sm font-medium leading-relaxed">
                      Guardian information helps your department contact your family in emergencies. Please fill this information.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <Field editing={editing} 
                    label="Guardian Name" 
                    value={profile.guardian_name}
                    editEl={<Input value={form.guardian_name} onChange={e => setForm({ ...form, guardian_name: e.target.value })} placeholder="Full name of guardian" className="bg-white" />}
                  />
                  
                  <Field editing={editing} 
                    label="Guardian Phone" 
                    value={profile.guardian_phone}
                    editEl={<Input value={form.guardian_phone} onChange={e => setForm({ ...form, guardian_phone: e.target.value })} placeholder="01XXXXXXXXX" className="bg-white" />}
                  />
                  
                  <Field editing={editing} 
                    label="Relationship" 
                    value={profile.guardian_relation}
                    editEl={
                      <select 
                        className="w-full rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm p-3 outline-none transition-all bg-white" 
                        value={form.guardian_relation} 
                        onChange={e => setForm({ ...form, guardian_relation: e.target.value })}
                      >
                        <option value="">Select relationship...</option>
                        {['Father', 'Mother', 'Brother', 'Sister', 'Uncle', 'Aunt', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    }
                  />
                </div>

                {editing && (
                  <div className="flex justify-end gap-3 pt-8 mt-8 border-t border-gray-100">
                    <button 
                      onClick={() => setEditing(false)} 
                      className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveInfo} 
                      className="px-6 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ACADEMIC TAB */}
            {activeTab === 'academic' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Academic Record</h3>

                <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200">
                    <h4 className="font-bold text-gray-800 text-sm">Semester Performance History</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-gray-100">
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Semester</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">GPA Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {level_progress.filter(s => s.status !== 'upcoming').map((sem, i) => (
                          <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-sm">
                                  L{sem.level}
                                </div>
                                <span className="font-semibold text-gray-800">Term {sem.term}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold
                                ${sem.status === 'completed' 
                                  ? 'bg-gray-100 text-gray-600' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {sem.status === 'completed' ? 'Completed' : 'Current Semester'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {sem.gpa ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className={`font-bold text-base ${getGpaColor(sem.gpa)}`}>
                                    {sem.gpa.toFixed(3)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm font-medium bg-gray-50 px-3 py-1 rounded-lg">Awaiting Results</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SecurityTab />
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
