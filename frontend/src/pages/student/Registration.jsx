import { useState, useEffect } from 'react';
import { getAvailableCourses, enrollCourse } from '../../api/student.api';
import SemesterCountdown from '../../components/domain/SemesterCountdown';
import Button from '../../components/ui/Button';
import { CourseCardSkeleton } from '../../components/ui/Skeletons';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import PageWrapper from '../../components/ui/PageWrapper';
import { motion } from 'framer-motion';

const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 }
};

export default function Registration() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    getAvailableCourses()
      .then((res) => {
        setData(res.data.data);
      })
      .catch(() => toast.error('Failed to load registration data'))
      .finally(() => setLoading(false));
  };
  
  useEffect(load, []);

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      // The backend /enroll logic now automatically enrolls the student in ALL courses for the active semester
      // It doesn't need offering_id anymore. We'll just pass a dummy to trigger it.
      await enrollCourse(0); 
      toast.success('Registration Confirmed Successfully!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <PageWrapper className="space-y-4">
      <CourseCardSkeleton /><CourseCardSkeleton /><CourseCardSkeleton />
    </PageWrapper>
  );

  if (!data?.isRegistrationOpen) return (
    <PageWrapper className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm mt-10 max-w-2xl mx-auto">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">📭</span>
      </div>
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">No Active Registration</h2>
      <p className="text-gray-500 max-w-sm mx-auto">
        There is no open registration period for your department right now. Please check back later or contact your department office.
      </p>
    </PageWrapper>
  );

  const { semester, courses, isRegistered } = data;
  const isDeadlinePast = new Date() > new Date(semester.reg_end);
  const totalCredits = courses.reduce((sum, c) => sum + parseFloat(c.credit), 0);

  if (isRegistered) return (
    <PageWrapper className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-8 shadow-sm text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-emerald-900 mb-2">
          You are registered for Level {semester.level} Term {semester.term}
        </h2>
        <p className="text-emerald-700 mb-8 font-medium">
          Academic Year: {semester.academic_year}
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="bg-white px-6 py-4 rounded-xl border border-emerald-200 shadow-sm flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Courses</p>
              <p className="text-2xl font-black text-gray-900">{courses.length}</p>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Credits</p>
              <p className="text-2xl font-black text-brand-600">{totalCredits.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link to="/student/my-courses">
            <Button size="lg" className="shadow-lg">View My Courses</Button>
          </Link>
        </div>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper className="space-y-8 animate-fade-in pb-24 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-brand-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -z-10 opacity-50 translate-x-1/2 -translate-y-1/2"></div>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            Registration Open
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-gray-900">Level {semester.level} — Term {semester.term}</h1>
          <p className="text-sm text-gray-600 font-medium mt-1">Academic Year: {semester.academic_year}</p>
        </div>
        <div className="shrink-0 bg-gray-50 rounded-xl p-4 border border-gray-100">
          {!isDeadlinePast && <SemesterCountdown regEnd={semester.reg_end}/>}
        </div>
      </div>

      {/* Courses Section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Your courses this semester</h3>
            <p className="text-sm text-gray-500 mt-1">All courses are mandatory and will be auto-enrolled.</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Credits</p>
            <p className="text-xl font-black text-brand-600">{totalCredits.toFixed(1)}</p>
          </div>
        </div>
        
        <div className="divide-y divide-gray-50">
          {courses.map(c => (
            <motion.div variants={itemVariants} key={c.offering_id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <Lock className="w-4 h-4 text-brand-500 opacity-50" />
                </div>
                <div>
                  <p className="font-mono font-bold text-gray-900">{c.course_code}</p>
                  <p className="text-sm text-gray-600 font-medium">{c.course_name}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">{c.course_type}</span>
                    {c.teacher_name && <span>👨‍🏫 {c.teacher_name}</span>}
                  </div>
                </div>
              </div>
              <div className="sm:text-right shrink-0">
                <p className="text-sm font-bold text-gray-900 bg-brand-50 text-brand-700 px-3 py-1 rounded-full inline-block">
                  {c.credit} cr
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="bg-amber-50 p-6 border-t border-amber-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Important Information</p>
              <p className="text-sm text-amber-800 mt-1">
                By confirming, you will be registered for all {courses.length} courses listed above. This action cannot be undone. You cannot drop mandatory courses once registered.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] z-40 flex items-center justify-between lg:pl-64 animate-slide-up">
        <div className="flex flex-col ml-4">
          <span className="text-sm font-bold text-gray-900">{courses.length} mandatory courses</span>
          <span className="text-xs text-gray-500">{totalCredits.toFixed(1)} total credits</span>
        </div>
        <Button 
          size="lg" 
          className="mr-4 shadow-lg shadow-brand-500/20" 
          loading={isSubmitting} 
          onClick={handleConfirmSubmit}
          disabled={isDeadlinePast}
        >
          {isDeadlinePast ? 'Registration Closed' : 'Confirm Registration'}
        </Button>
      </div>
    </PageWrapper>
  );
}
