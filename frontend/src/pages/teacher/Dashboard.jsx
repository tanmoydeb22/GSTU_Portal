import { useState, useEffect } from 'react';
import { getTeacherDashboard } from '../../api/teacher.api';
import { BookOpen, Users, ClipboardCheck, SendHorizonal, Clock, MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TeacherDashboard() {
  const [data, setData] = useState({ stats: {}, activeCourses: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeacherDashboard()
      .then(r => setData(r.data.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const parseSchedule = (courses) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const fmtTime = (t) => {
      if (!t) return '';
      const [hour, minute] = t.split(':');
      const h = parseInt(hour, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedHour = h % 12 || 12;
      return `${formattedHour}.${minute} ${ampm}`;
    };
    const schedule = [];
    
    courses.forEach(c => {
      const scheds = c.schedules || [];
      scheds.forEach(s => {
        const dayIndex = days.indexOf(s.day_of_week);
        if (dayIndex !== -1) {
          schedule.push({
            day: s.day_of_week,
            dayIndex,
            time: `${fmtTime(s.start_time)} - ${fmtTime(s.end_time)}`,
            course: c.course_code,
            dept: c.dept_code,
            level: c.level,
            term: c.term,
            room: s.room_no
          });
        }
      });
    });
    
    return schedule.sort((a, b) => a.dayIndex - b.dayIndex);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  }

  const { stats, activeCourses } = data;
  const schedule = parseSchedule(activeCourses);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back! Here's your overview for the current semester.</p>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Active Courses */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Active Courses</p>
            <p className="text-4xl font-display font-bold text-gray-900">{stats.active_courses ?? 0}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
            <BookOpen className="w-7 h-7" />
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Students</p>
            <p className="text-4xl font-display font-bold text-gray-900">{stats.total_students ?? 0}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-7 h-7" />
          </div>
        </div>

        {/* Pending Grades */}
        <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between ${stats.pending_grades > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Pending Grades</p>
            <div className="flex items-center gap-3">
              <p className={`text-4xl font-display font-bold ${stats.pending_grades > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                {stats.pending_grades ?? 0}
              </p>
              {stats.pending_grades > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider">Action Needed</span>
              )}
            </div>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stats.pending_grades > 0 ? 'bg-amber-200 text-amber-700' : 'bg-gray-50 text-gray-400'}`}>
            <ClipboardCheck className="w-7 h-7" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" /> This Week's Classes
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {schedule.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">No scheduled classes found.</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {schedule.map((item, i) => (
                  <li key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-bold text-gray-900">{item.day}</div>
                      <div>
                        <p className="font-bold text-brand-600 font-mono leading-none">{item.course}</p>
                        {item.dept && (
                          <p className="text-xs text-gray-500 font-medium mt-1">
                            {item.dept} • L{item.level}T{item.term}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" /> {item.time}
                      </div>
                      <div className="flex items-center gap-1.5 w-32">
                        <MapPin className="w-4 h-4 text-gray-400" /> Room {item.room || 'TBA'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-brand-600" /> Pending Actions
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full max-h-[400px]">
            {activeCourses.filter(c => c.ungraded_count > 0).length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center h-full opacity-60">
                <ClipboardCheck className="w-12 h-12 text-gray-400 mb-3" />
                <p className="font-bold text-gray-600">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1">No pending grades at the moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 overflow-y-auto custom-scrollbar flex-1">
                {activeCourses.filter(c => c.ungraded_count > 0).map(c => (
                  <div key={c.offering_id} className="p-5 hover:bg-gray-50 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-900">{c.course_code}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Grades Due</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-gray-400" /> {c.ungraded_count} students
                      </div>
                      <span className="text-gray-300">•</span>
                      <span>L{c.level}T{c.term}</span>
                    </div>
                    <Link 
                      to={`/teacher/courses/${c.offering_id}`}
                      className="inline-flex items-center justify-center gap-2 w-full py-2 bg-gray-50 hover:bg-brand-50 text-brand-700 border border-gray-200 hover:border-brand-200 rounded-xl text-sm font-bold transition-colors"
                    >
                      Enter Grades <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
