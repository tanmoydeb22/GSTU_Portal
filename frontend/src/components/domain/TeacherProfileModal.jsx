import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getTeacherPublicProfile } from '../../api/student.api';
import { X, User, Mail, Phone, MapPin, Clock, BookOpen, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function TeacherProfileModal({ teacherCode, isOpen, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && teacherCode) {
      setLoading(true);
      getTeacherPublicProfile(teacherCode)
        .then(r => setProfile(r.data.data))
        .catch(err => {
          toast.error('Failed to load teacher profile');
          onClose();
        })
        .finally(() => setLoading(false));
    } else {
      setProfile(null);
    }
  }, [isOpen, teacherCode]);

  if (!isOpen && !profile) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-gray-500 animate-pulse">Loading profile...</p>
              </div>
            ) : profile ? (
              <>
                {/* Header Section */}
                <div className="relative bg-brand-50 p-5 sm:p-6 shrink-0 overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white text-gray-800 rounded-full transition-colors z-50 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex shrink-0 items-center justify-center">
                      {profile.photo_url ? (
                        <img src={`${API_URL}${profile.photo_url}`} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-brand-700">
                          {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="text-center sm:text-left flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">{profile.name}</h2>
                      <p className="text-brand-700 font-bold text-[13px] mb-3">
                        {profile.designation} • Dept of {profile.dept_name}
                      </p>
                      
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-600">
                        <div className="flex items-start gap-1.5 bg-white/60 px-2 py-1 rounded-md max-w-full">
                          <Mail className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                          <span className="break-all">{profile.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-md">
                          <Phone className="w-3.5 h-3.5 text-brand-600" />
                          <span>{profile.phone || <span className="italic text-gray-400">Not provided</span>}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-white">
                  
                  {/* Office Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                        <MapPin className="w-4 h-4 text-brand-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Office Room</p>
                        <p className="text-[13px] font-semibold text-gray-900">{profile.office_room || 'TBA'}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                        <Clock className="w-4 h-4 text-brand-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Office Hours</p>
                        <p className="text-[13px] font-semibold text-gray-900">{profile.office_hours || 'TBA'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Biography */}
                  <div>
                    <h3 className="font-bold text-gray-900 text-[13px] flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-brand-600" /> Biography
                    </h3>
                    <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4">
                      <p className="text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {profile.bio || <span className="italic text-gray-400">No biography provided yet.</span>}
                      </p>
                    </div>
                  </div>

                  {/* Research Interests */}
                  <div>
                    <h3 className="font-bold text-gray-900 text-[13px] flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-brand-600" /> Research Interests
                    </h3>
                    <div className="bg-brand-50/30 border border-brand-100/50 rounded-2xl p-4">
                      <p className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed font-medium">
                        {profile.research_interests || <span className="italic text-gray-400">No research interests listed.</span>}
                      </p>
                    </div>
                  </div>

                </div>
              </>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
