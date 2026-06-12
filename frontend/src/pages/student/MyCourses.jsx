import { useState, useEffect, useMemo } from 'react';
import { getMyCoursesApi } from '../../api/student.api';
import toast from 'react-hot-toast';
import { BookOpen, Search, Filter, Calendar as CalendarIcon, LayoutGrid, Clock, MapPin, User, Mail, ChevronDown } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import TeacherProfileModal from '../../components/domain/TeacherProfileModal';

const DAY_ABBR = { Saturday:'Sat', Sunday:'Sun', Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri' };
const DAY_COLORS = {
  Saturday: 'bg-green-50 text-green-700 border-green-200',
  Sunday:   'bg-amber-50 text-amber-700 border-amber-200',
  Monday:   'bg-blue-50 text-blue-700 border-blue-200',
  Tuesday:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Wednesday:'bg-purple-50 text-purple-700 border-purple-200',
  Thursday: 'bg-orange-50 text-orange-700 border-orange-200',
  Friday:   'bg-red-50 text-red-700 border-red-200',
};
const COURSE_COLORS = [
  'bg-blue-50 border-blue-200 text-blue-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-purple-50 border-purple-200 text-purple-800',
  'bg-orange-50 border-orange-200 text-orange-800',
  'bg-pink-50 border-pink-200 text-pink-800',
  'bg-teal-50 border-teal-200 text-teal-800',
  'bg-indigo-50 border-indigo-200 text-indigo-800',
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-cyan-50 border-cyan-200 text-cyan-800',
  'bg-rose-50 border-rose-200 text-rose-800',
  'bg-lime-50 border-lime-200 text-lime-800',
];

const fmtTime = (t) => t ? t.substring(0, 5) : '';

export default function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters and View State
  const [semesterFilter, setSemesterFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('code');
  const [viewMode, setViewMode] = useState('cards');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  useEffect(() => {
    setLoading(true);
    getMyCoursesApi(semesterFilter)
      .then(r => setCourses(r.data.data))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  }, [semesterFilter]);

  // Derived state
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchType = typeFilter === 'All' || c.course_type === typeFilter;
      const matchSearch = c.course_code.toLowerCase().includes(search.toLowerCase()) || c.course_name.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'code') return a.course_code.localeCompare(b.course_code);
      if (sortBy === 'credits') return b.credit - a.credit;
      if (sortBy === 'time') {
        const aFirst = (a.schedules || [])[0]?.start_time || '';
        const bFirst = (b.schedules || [])[0]?.start_time || '';
        return aFirst.localeCompare(bFirst);
      }
      return 0;
    });
  }, [courses, typeFilter, search, sortBy]);

  const totalCredits = filteredCourses.reduce((sum, c) => sum + parseFloat(c.credit), 0);

  const groupedCourses = useMemo(() => {
    const groups = {};
    filteredCourses.forEach(c => {
      const key = `Level ${c.level} Term ${c.term} (${c.academic_year})`;
      if (!groups[key]) groups[key] = { level: c.level, term: c.term, year: c.academic_year, courses: [], key };
      groups[key].courses.push(c);
    });
    
    return Object.values(groups).sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      if (b.term !== a.term) return b.term - a.term;
      return b.year.localeCompare(a.year);
    });
  }, [filteredCourses]);

  useEffect(() => {
    if (groupedCourses.length === 1) {
      setExpandedGroups({ [groupedCourses[0].key]: true });
    } else if (groupedCourses.length > 0) {
      setExpandedGroups({ [groupedCourses[0].key]: true });
    } else {
      setExpandedGroups({});
    }
  }, [groupedCourses]);

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Schedule grid from schedules array
  const scheduleData = useMemo(() => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const fullDayToAbbr = { Saturday:'Sat', Sunday:'Sun', Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri' };
    const timeSlots = new Set();
    const map = {};

    // Build a color map keyed by course_code
    const courseColorMap = {};
    let colorIdx = 0;
    filteredCourses.forEach(c => {
      if (!courseColorMap[c.course_code]) {
        courseColorMap[c.course_code] = COURSE_COLORS[colorIdx % COURSE_COLORS.length];
        colorIdx++;
      }
    });

    filteredCourses.forEach(c => {
      const scheds = c.schedules || [];
      scheds.forEach(s => {
        const timeRange = `${fmtTime(s.start_time)} - ${fmtTime(s.end_time)}`;
        timeSlots.add(timeRange);
        const dayAbbr = fullDayToAbbr[s.day_of_week];
        if (dayAbbr) {
          if (!map[timeRange]) map[timeRange] = {};
          map[timeRange][dayAbbr] = { ...c, room_no: s.room_no, _color: courseColorMap[c.course_code] };
        }
      });
    });

    return { days, slots: Array.from(timeSlots).sort(), map };
  }, [filteredCourses]);

  const renderScheduleBadges = (scheds) => {
    if (!scheds || scheds.length === 0) return <span className="italic text-gray-400 text-xs">TBA</span>;

    // Check if all rooms and times are the same → compact display
    const allSameRoom = scheds.every(s => s.room_no === scheds[0].room_no);
    const allSameTime = scheds.every(s => s.start_time === scheds[0].start_time && s.end_time === scheds[0].end_time);

    if (allSameRoom && allSameTime && scheds.length > 1) {
      const dayList = scheds.map(s => DAY_ABBR[s.day_of_week]).join('/');
      return (
        <div className="flex items-start gap-1.5 text-xs text-gray-600">
          <CalendarIcon className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-gray-900">{dayList}</span>
            <span className="ml-1.5">{fmtTime(scheds[0].start_time)}-{fmtTime(scheds[0].end_time)}</span>
            <span className="ml-1.5 text-gray-500">• {scheds[0].room_no}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {scheds.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DAY_COLORS[s.day_of_week] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
              {DAY_ABBR[s.day_of_week]}
            </span>
            <span className="text-xs text-gray-700">{fmtTime(s.start_time)}-{fmtTime(s.end_time)}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-600 flex items-center gap-0.5">
              <MapPin className="w-3 h-3 text-gray-400" /> {s.room_no}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header & Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-gray-900 leading-tight">My Courses</h1>
              <p className="text-xs text-gray-500 mt-0.5">Manage and view your enrolled classes</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200 w-fit">
              <button 
                onClick={() => setSemesterFilter('active')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${semesterFilter === 'active' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
              >
                Current Semester
              </button>
              <button 
                onClick={() => setSemesterFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${semesterFilter === 'all' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
              >
                All History
              </button>
            </div>

            <div className="flex bg-gray-50 rounded-lg border border-gray-200 p-1">
              <button 
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'}`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('schedule')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'schedule' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'}`}
                title="Schedule View"
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search courses..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
            
            <div className="flex bg-gray-50 rounded-lg border border-gray-200 p-1 shrink-0 w-full sm:w-auto overflow-x-auto">
              {['All', 'Theory', 'Lab', 'Project'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${typeFilter === t ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-auto shrink-0">
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="w-full md:w-auto py-2 pl-3 pr-8 bg-gray-50 border-gray-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 appearance-none cursor-pointer"
            >
              <option value="code">Sort by Code</option>
              <option value="credits">Sort by Credits</option>
              <option value="time">Sort by Time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center px-2">
        <span className="text-sm font-medium text-gray-500">Showing {filteredCourses.length} courses</span>
        <span className="text-sm font-bold text-gray-900 bg-green-50 px-3 py-1 rounded-full text-green-700 border border-green-200 shadow-sm">Total: {totalCredits} Credits</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"/></div>
      ) : filteredCourses.length === 0 ? (
        <EmptyState 
          icon={BookOpen}
          title="No courses found"
          description="You haven't enrolled in any courses for this selection yet, or no courses match your filter."
        />
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          {groupedCourses.map(group => {
            const isExpanded = expandedGroups[group.key];
            return (
              <div key={group.key} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <button 
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-bold text-gray-900">{group.key}</h2>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">{group.courses.length} courses enrolled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {group.courses.reduce((sum, c) => sum + parseFloat(c.credit), 0)} <span className="text-xs font-medium text-gray-500">Credits</span>
                      </p>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-6 border-t border-gray-100 bg-gray-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {group.courses.map(course => {
                        const isBoardEvaluation = !['Theory', 'Lab'].includes(course.course_type) || 
                          /viva|project|thesis/i.test(course.course_name);
                          
                        return (
                        <div key={course.enrollment_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-brand-200 transition-all duration-300 group">
                          <div className="p-4 relative">
                            <div className="flex justify-between items-start mb-3">
                              <Badge variant="brand" className="font-mono text-[10px] px-2 py-0.5">{course.course_code}</Badge>
                              {course.status === 'Registered' ? (
                                 <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">Ongoing</span>
                              ) : (
                                 <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">{course.status}</span>
                              )}
                            </div>
                            
                            <h3 className="font-bold text-gray-900 text-base mb-3 line-clamp-2 leading-tight group-hover:text-brand-700 transition-colors" title={course.course_name}>{course.course_name}</h3>
                            
                            <div className="space-y-2 mb-4">
                              {!isBoardEvaluation ? (
                                <>
                                  <div className="flex items-start gap-2 text-xs text-gray-600">
                                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                    <span className="font-medium text-gray-900 break-words leading-relaxed">
                                      {course.teacher_name ? (
                                        <button 
                                          onClick={() => course.teacher_code && setSelectedTeacher(course.teacher_code)}
                                          className="hover:text-brand-600 hover:underline underline-offset-4 transition-colors font-bold text-left focus:outline-none"
                                        >
                                          {course.teacher_name} {course.teacher_code ? `(${course.teacher_code})` : ''}
                                        </button>
                                      ) : <span className="italic text-gray-400">TBA</span>}
                                    </span>
                                  </div>
                                  {/* Schedule section */}
                                  <div className="mt-2 pt-2 border-t border-gray-50">
                                    {renderScheduleBadges(course.schedules)}
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1.5 rounded-lg border border-orange-100 flex items-center justify-center gap-2">
                                  <span>Final Exam Evaluation</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base font-black text-gray-900">{course.credit}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Credits</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                course.course_type === 'Theory' ? 'bg-blue-50 text-blue-700' :
                                course.course_type === 'Lab' ? 'bg-purple-50 text-purple-700' :
                                'bg-orange-50 text-orange-700'
                              }`}>
                                {course.course_type}
                              </span>
                            </div>
                          </div>
                          {course.teacher_email && !isBoardEvaluation && (
                            <div className="bg-gray-50/50 px-4 py-2.5 border-t border-gray-100 flex items-start gap-2 text-[10px] text-gray-500">
                              <Mail className="w-3 h-3 shrink-0 mt-0.5" />
                              <a href={`mailto:${course.teacher_email}`} className="hover:text-brand-600 transition-colors break-all leading-relaxed">{course.teacher_email}</a>
                            </div>
                          )}
                        </div>
                      )})}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Weekly Schedule View */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {scheduleData.slots.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No scheduled times available for these courses.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-900 w-48">Time</th>
                    {scheduleData.days.map(d => <th key={d} className="px-6 py-4 font-bold text-gray-900 text-center">{d}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scheduleData.slots.map((time, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-500 whitespace-nowrap bg-gray-50/30">{time}</td>
                      {scheduleData.days.map(d => {
                        const cellCourse = scheduleData.map[time]?.[d];
                        return (
                          <td key={d} className="px-4 py-3">
                            {cellCourse ? (
                              <div className={`rounded-lg border p-2.5 hover:shadow-sm transition-shadow group cursor-default relative ${cellCourse._color || 'bg-brand-50 border-brand-100'}`}>
                                <p className="font-bold text-xs mb-0.5">{cellCourse.course_code}</p>
                                <p className="text-[10px] font-medium opacity-70 flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" /> {cellCourse.room_no}
                                </p>
                                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-xl pointer-events-none transition-opacity z-10">
                                  <p className="font-bold mb-1">{cellCourse.course_name}</p>
                                  <p className="text-gray-300">{cellCourse.teacher_name}</p>
                                </div>
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <TeacherProfileModal 
        teacherCode={selectedTeacher} 
        isOpen={!!selectedTeacher} 
        onClose={() => setSelectedTeacher(null)} 
      />
    </div>
  );
}
