import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions, getCourses, getBatchCourseGrades, saveGradeManual, getGradingStudents, getSemesters } from '../../api/staff.api';
import GradeBadge from '../../components/domain/GradeBadge';
import Button from '../../components/ui/Button';
import { Save, ArrowLeft, BookOpen, Users, Lock, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const gpToLetter = (gp) => { 
  const val = parseFloat(gp);
  if (isNaN(val) || val < 0 || val > 4) return null;
  if (val === 4.0) return 'A+'; 
  if (val >= 3.75) return 'A'; 
  if (val >= 3.5) return 'A-'; 
  if (val >= 3.25) return 'B+'; 
  if (val >= 3.0) return 'B'; 
  if (val >= 2.75) return 'B-'; 
  if (val >= 2.5) return 'C+'; 
  if (val >= 2.25) return 'C'; 
  if (val >= 2.0) return 'D'; 
  return 'F'; 
};

const TERMS = [
  { level: 1, term: 1, label: 'L1 T1' },
  { level: 1, term: 2, label: 'L1 T2' },
  { level: 2, term: 1, label: 'L2 T1' },
  { level: 2, term: 2, label: 'L2 T2' },
  { level: 3, term: 1, label: 'L3 T1' },
  { level: 3, term: 2, label: 'L3 T2' },
  { level: 4, term: 1, label: 'L4 T1' },
  { level: 4, term: 2, label: 'L4 T2' },
];

export default function GradeEntry() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSession, setSelectedSession] = useState(sessionStorage.getItem('staffGradeSession') || null);
  const [sessionMaxPosition, setSessionMaxPosition] = useState({ level: 4, term: 2 }); // For locking future terms
  
  const [selectedTerm, setSelectedTerm] = useState(null); // { level, term }
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getSessions(), getSemesters()])
      .then(([r1, r2]) => {
        setSessions(r1.data.data);
        setSemesters(r2.data.data);
      })
      .catch(() => toast.error('Failed to load initial data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    
    setLoading(true);
    getGradingStudents(selectedSession)
      .then(r => {
        const students = r.data.data;
        if (students.length > 0) {
          let maxL = 1; let maxT = 1;
          students.forEach(s => {
            if (s.level > maxL) { maxL = s.level; maxT = s.term; }
            else if (s.level === maxL && s.term > maxT) { maxT = s.term; }
          });
          setSessionMaxPosition({ level: maxL, term: maxT });
        }
      })
      .catch(() => console.error("Could not fetch students for limits"))
      .finally(() => setLoading(false));
  }, [selectedSession]);

  const handleSelectSession = (session) => {
    setSelectedSession(session);
    sessionStorage.setItem('staffGradeSession', session);
    setSelectedTerm(null);
  };

  const handleSelectTerm = (t) => {
    setSelectedTerm(t);
    const activeSemester = semesters.find(s => s.academic_year === selectedSession && s.level === t.level && s.term === t.term);
    
    if (activeSemester) {
      navigate(`/staff/grades/${activeSemester.semester_id}/results`);
    } else {
      toast.error('Semester not initialized for this term yet');
      setSelectedTerm(null);
    }
  };

  // STEP 1: Select Session
  if (!selectedSession) {
    return (
      <div className="space-y-6 animate-fade-in pb-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Grade Entry</h1>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sessions.map(s => (
              <button 
                key={s}
                onClick={() => handleSelectSession(s)}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-brand-300 hover:shadow-md hover:ring-2 hover:ring-brand-500/20 transition-all text-center flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Session</h3>
                <p className="text-sm text-brand-600 font-mono font-bold">{s}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // STEP 2: Select Level/Term
  if (!selectedTerm) {
    return (
      <div className="space-y-6 animate-fade-in pb-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div>
          <button 
            onClick={() => {
              setSelectedSession(null);
              sessionStorage.removeItem('staffGradeSession');
            }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors font-medium mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sessions
          </button>
          <h1 className="text-2xl font-display font-bold text-gray-900">Session: {selectedSession}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TERMS.map(t => {
              const isLocked = t.level > sessionMaxPosition.level || (t.level === sessionMaxPosition.level && t.term > sessionMaxPosition.term);
              
              return (
                <button 
                  key={t.label}
                  onClick={() => !isLocked && handleSelectTerm(t)}
                  disabled={isLocked}
                  className={`py-6 rounded-2xl border shadow-sm transition-all text-center font-display font-bold text-lg flex flex-col items-center justify-center gap-2
                    ${isLocked 
                      ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' 
                      : 'bg-white border-gray-100 text-gray-700 hover:text-brand-600 hover:border-brand-300 hover:shadow-md group'
                    }
                  `}
                >
                  {isLocked && <Lock className="w-4 h-4 mb-1 text-gray-300" />}
                  <div className={!isLocked ? 'group-hover:scale-110 transition-transform' : ''}>
                    {t.label}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
