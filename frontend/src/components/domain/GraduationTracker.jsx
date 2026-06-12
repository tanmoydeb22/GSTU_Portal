import { useState, useEffect } from 'react';
import { getGraduationStatus } from '../../api/student.api';
import { CheckCircle2, Circle, GraduationCap, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GraduationTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGraduationStatus()
      .then(res => setData(res.data.data))
      .catch(() => toast.error('Failed to load graduation status'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-64 animate-pulse bg-white rounded-xl border border-gray-100 p-6" />;
  }

  if (!data) return null;

  const { 
    cgpa, 
    is_cgpa_eligible, 
    level_progress, 
    failed_courses, 
    graduation_eligible, 
    estimated_graduation,
    completed_semesters_count,
    total_semesters_required
  } = data;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative mt-8">
      {/* Confetti Animation if Eligible */}
      {graduation_eligible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                fontSize: `${1 + Math.random()}rem`,
              }}
            >
              🎉
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Graduation Progress</h2>
            <p className="text-gray-300 text-sm">Track your journey to the finish line</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-0.5">Expected</p>
          <p className="text-white font-mono font-bold">{estimated_graduation}</p>
        </div>
      </div>

      <div className="p-6 space-y-8 relative z-10">
        
        {/* Top Grid: Semesters & CGPA */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Semesters Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Semesters Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completed_semesters_count} <span className="text-sm text-gray-400 font-normal">/ {total_semesters_required}</span>
                </p>
              </div>
              <p className="text-xl font-bold text-brand-600">{Math.round((completed_semesters_count / total_semesters_required) * 100)}%</p>
            </div>
            
            {/* Animated Progress Bar */}
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-brand-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: '0%', animation: 'fillBar 1s ease-out forwards', '--target-width': `${(completed_semesters_count / total_semesters_required) * 100}%` }}
              />
            </div>
          </div>

          {/* CGPA Status */}
          <div className="space-y-3 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">CGPA Status</p>
            <div className="flex items-center gap-4">
              <p className="text-2xl font-bold text-gray-900">
                {cgpa} <span className="text-sm text-gray-400 font-normal">/ 4.00</span>
              </p>
              {is_cgpa_eligible ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Eligible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  <XCircle className="h-3.5 w-3.5" /> Below 2.00
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">Minimum CGPA 2.00 required for graduation.</p>
          </div>
        </div>

        {/* Timeline Stepper */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-5">Semester Pipeline</h3>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-100 -translate-y-1/2 z-0" />
            
            <div className="flex justify-between relative z-10 overflow-x-auto custom-scrollbar pb-4 -mb-4">
              {level_progress.map((sem, i) => {
                const isCompleted = sem.is_complete;
                const isCurrent = sem.status === 'current';
                
                return (
                  <div key={`${sem.level}-${sem.term}`} className="flex flex-col items-center min-w-[60px]">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-[3px] bg-white transition-colors duration-300
                      ${isCompleted ? 'border-green-500 text-green-500' : 
                        isCurrent ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)] text-blue-500' : 
                        'border-gray-200 text-gray-300'}`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : 
                       isCurrent ? <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" /> : 
                       <Clock className="h-4 w-4" />}
                    </div>
                    <p className={`text-xs font-bold mt-2 ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                      L{sem.level}T{sem.term}
                    </p>
                  </div>
                );
              })}
              {/* Final Graduation Node */}
              <div className="flex flex-col items-center min-w-[60px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-[3px] bg-white transition-colors duration-300
                  ${graduation_eligible ? 'border-yellow-400 bg-yellow-50 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-gray-200'}`}
                >
                  <GraduationCap className={`h-4 w-4 ${graduation_eligible ? 'text-yellow-600' : 'text-gray-300'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Failed Courses Alert */}
        {failed_courses.length > 0 && (
          <div className="bg-red-50 rounded-xl border border-red-100 p-4">
            <div className="flex gap-3 text-red-800">
              <XCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Pending F Grades</p>
                <p className="text-xs mt-1">You must retake the following courses to be eligible for graduation:</p>
                <ul className="mt-2 space-y-1">
                  {failed_courses.map(c => (
                    <li key={c.course_code} className="text-xs font-mono">
                      • {c.course_code} - {c.course_name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {graduation_eligible && (
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
            <p className="font-bold text-green-800">🎉 Congratulations!</p>
            <p className="text-sm text-green-700 mt-1">You have met all academic requirements for graduation.</p>
          </div>
        )}

      </div>
    </div>
  );
}
