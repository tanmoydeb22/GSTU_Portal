import { useState, useEffect } from 'react';
import { getTeacherCourses } from '../../api/teacher.api';
import { BookOpen, Users, Clock, MapPin, ChevronRight, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TeacherMyCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    getTeacherCourses()
      .then(r => setCourses(r.data.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  }

  const currentCourses = courses.filter(c => c.is_running === 1);
  const pastCourses = courses.filter(c => c.is_running === 0);

  const displayCourses = activeTab === 'current' ? currentCourses : pastCourses;

  const StatusBadge = ({ status, graded, total }) => {
    if (status === 'Not Started') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600"><AlertCircle className="w-3 h-3" /> Not Started (0/{total})</span>;
    if (status === 'In Progress') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><Edit3 className="w-3 h-3" /> In Progress ({graded}/{total})</span>;
    if (status === 'Submitted') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700"><CheckCircle2 className="w-3 h-3" /> Submitted (Draft)</span>;
    if (status === 'Published') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Published</span>;
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">My Courses</h1>
        <p className="text-sm text-gray-500">Manage your course offerings and submit student grades</p>
      </div>

      <div className="flex space-x-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm overflow-x-auto w-max">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'current' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span>Current Semester</span>
          <span className="bg-brand-100 text-brand-700 py-0.5 px-2 rounded-full text-[10px]">{currentCourses.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'past' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span>Course History</span>
          <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-[10px]">{pastCourses.length}</span>
        </button>
      </div>

      {displayCourses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No courses found for the selected view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCourses.map(c => (
            <div key={c.offering_id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:border-brand-200 hover:shadow-md transition-all group">
              <div className="p-4 border-b border-gray-50 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-brand-600 text-base">{c.course_code}</span>
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">{c.academic_year} • L{c.level} T{c.term}</span>
                </div>
                <h3 className="font-bold text-gray-900 leading-snug mb-3 group-hover:text-brand-600 transition-colors line-clamp-2 text-sm">
                  {c.course_name}
                </h3>
                
                <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                  {(c.schedules && c.schedules.length > 0) ? (
                    c.schedules.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{s.day_of_week?.substring(0,3)}</span>
                        <span>{s.start_time?.substring(0,5)}-{s.end_time?.substring(0,5)}</span>
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{s.room_no}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="italic text-gray-400">Schedule TBA</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400" /> 
                    <span>{c.enrolled_count} students enrolled</span>
                  </div>
                </div>

                <div>
                  <StatusBadge status={c.grade_status} graded={c.graded_count} total={c.enrolled_count} />
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 flex gap-2">
                <Link 
                  to={`/teacher/courses/${c.offering_id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:border-brand-300 hover:text-brand-600 text-gray-700 py-1.5 rounded-md text-xs font-bold transition-colors"
                >
                  View Students
                </Link>
                {activeTab === 'current' && (
                  <Link 
                    to={c.grade_status === 'Published' ? '#' : `/teacher/courses/${c.offering_id}/marks`}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                      c.grade_status === 'Published' 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
                    }`}
                  >
                    Enter Grades <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
