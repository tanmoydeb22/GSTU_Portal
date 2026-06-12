import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { getTeacherProfile, updateTeacherProfile, uploadTeacherPhoto } from '../../api/teacher.api';
import { User, Phone, Mail, Building, MapPin, Clock, Edit2, Save, X, BookOpen, FileText, Camera, Shield } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import SecurityTab from '../../components/domain/SecurityTab';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function TeacherProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { updateUser } = useAuthStore();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    setLoading(true);
    getTeacherProfile()
      .then(r => {
        setProfile(r.data.data);
        setFormData({
          phone: r.data.data.phone || '',
          bio: r.data.data.bio || '',
          research_interests: r.data.data.research_interests || '',
          office_room: r.data.data.office_room || '',
          office_hours: r.data.data.office_hours || ''
        });
      })
      .catch(e => {
        console.error(e);
        toast.error('Failed to load profile');
      })
      .finally(() => setLoading(false));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTeacherProfile(formData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      loadProfile();
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
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
      const res = await uploadTeacherPhoto(formData);
      setProfile({ ...profile, photo_url: res.data.data.photo_url });
      updateUser({ photo_url: res.data.data.photo_url });
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  }

  const { teaching_history } = profile;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      
      {/* ── TOP HEADER SECTION ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8 relative overflow-hidden">
        
        {/* Subtle decorative background blur */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <div className="absolute top-6 right-6 z-20">
          {isEditing ? (
            <div className="flex gap-2 bg-white/90 backdrop-blur rounded-xl p-1 shadow-sm">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg transition flex items-center gap-2">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
          )}
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          
          {/* Avatar Area */}
          <div className="relative group shrink-0">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-brand-100 to-emerald-50 flex items-center justify-center ring-4 ring-brand-50">
              {profile.photo_url ? (
                <img src={`${API_URL}${profile.photo_url}`} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl sm:text-5xl font-bold text-brand-700 flex items-center justify-center w-full h-full bg-brand-50">
                  {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
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
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left mt-2">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{profile.name}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs sm:text-sm font-mono font-bold rounded-lg border border-gray-200">
                  {profile.teacher_code}
                </span>
                <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs sm:text-sm font-bold rounded-lg border border-brand-200">
                  {profile.dept_code}
                </span>
              </div>
            </div>
            
            <div className="text-sm font-semibold text-brand-600 mb-4 tracking-wide flex items-center justify-center md:justify-start gap-2">
              <Building className="w-4 h-4 text-brand-500" />
              {profile.designation} • Department of {profile.dept_name}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1">
              <span className="px-3 py-1.5 bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Active Faculty
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Contact & Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-brand-600" /> Contact Info
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span className="break-all">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                {isEditing ? (
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="flex-1 py-1 px-2 border-gray-200 rounded focus:ring-brand-500" />
                ) : (
                  <span>{profile.phone || '—'}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                {isEditing ? (
                  <input type="text" placeholder="Office Room" value={formData.office_room} onChange={e => setFormData({...formData, office_room: e.target.value})} className="flex-1 py-1 px-2 border-gray-200 rounded focus:ring-brand-500" />
                ) : (
                  <span>{profile.office_room ? `Room ${profile.office_room}` : '—'}</span>
                )}
              </div>
              <div className="flex items-start gap-3 text-gray-600">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                {isEditing ? (
                  <input type="text" placeholder="Office Hours (e.g. Sat 2-4pm)" value={formData.office_hours} onChange={e => setFormData({...formData, office_hours: e.target.value})} className="flex-1 py-1 px-2 border-gray-200 rounded focus:ring-brand-500" />
                ) : (
                  <span>{profile.office_hours || '—'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Bio, Research, History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-brand-600" /> Biography & Research
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Short Bio</p>
                {isEditing ? (
                  <textarea rows={3} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 p-3" placeholder="Write a short bio..." />
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{profile.bio || <span className="text-gray-400 italic">No biography provided.</span>}</p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Research Interests</p>
                {isEditing ? (
                  <textarea rows={3} value={formData.research_interests} onChange={e => setFormData({...formData, research_interests: e.target.value})} className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 p-3" placeholder="E.g. Machine Learning, NLP..." />
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{profile.research_interests || <span className="text-gray-400 italic">No research interests provided.</span>}</p>
                )}
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Security Section */}
      <div className="mt-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-brand-600" /> Account Security
        </h3>
        <SecurityTab />
      </div>
    </div>
  );
}
