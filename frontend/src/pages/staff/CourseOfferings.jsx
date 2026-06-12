import { useState, useEffect } from 'react';
import { getOfferings, createOffering, updateOffering, deleteOffering, getSemesters, getCourses, getTeachers } from '../../api/staff.api';
import DataTable from '../../components/ui/DataTable'; import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button'; import Badge from '../../components/ui/Badge'; import { Plus, Edit2, Trash2, Clock, MapPin, Calendar } from 'lucide-react'; import toast from 'react-hot-toast';

const DAYS = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
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

export default function CourseOfferings() {
  const [offerings, setOfferings] = useState([]); const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false); const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]); const [teachers, setTeachers] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [activeGroupKey, setActiveGroupKey] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ course_id:'', semester_id:'', teacher_id:'' });
  const [schedules, setSchedules] = useState([]);

  const load = () => { getOfferings({}).then(r => setOfferings(r.data.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); };
  useEffect(() => { load(); getSemesters().then(r => setSemesters(r.data.data)); getCourses({ all: 'true', includeViva: 'true' }).then(r => setCourses(r.data.data)); }, []);
  
  // Group by session first, then by level/term within each session
  const groupedOfferings = offerings.reduce((acc, curr) => {
    const session = curr.session || 'Unknown Session';
    const level = curr.semester_level || curr.offered_level || 'Unknown';
    const term = curr.semester_term || curr.offered_term || 'Unknown';
    const key = `${session} - Level ${level} Term ${term}`;
    if (!acc[key]) {
      acc[key] = { session, level, term, is_active: curr.is_running === 1, courses: [] };
    }
    acc[key].courses.push(curr);
    return acc;
  }, {});

  // Build session-level grouping
  const sessionGroups = Object.values(groupedOfferings).reduce((acc, group) => {
    if (!acc[group.session]) {
      acc[group.session] = { session: group.session, hasActive: false, totalCourses: 0, levelTerms: [] };
    }
    if (group.is_active) acc[group.session].hasActive = true;
    acc[group.session].totalCourses += group.courses.length;
    acc[group.session].levelTerms.push(group);
    return acc;
  }, {});

  // Sort sessions descending
  const sortedSessions = Object.values(sessionGroups).sort((a, b) => b.session.localeCompare(a.session));

  // Get level/term groups for the active session
  const activeSessionData = activeSession ? sessionGroups[activeSession] : null;
  const activeLevelTerms = activeSessionData ? activeSessionData.levelTerms.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.term - b.term;
  }) : [];
  
  const selectedSemester = semesters.find(s => s.semester_id.toString() === form.semester_id.toString());
  const filteredCourses = selectedSemester 
    ? courses.filter(c => c.offered_level === selectedSemester.level && c.offered_term === selectedSemester.term)
    : [];

  useEffect(() => { 
    if (form.course_id) {
      getTeachers({ course_id: form.course_id }).then(r => setTeachers(r.data.data.teachers));
    } else {
      setTeachers([]);
    }
  }, [form.course_id]);

  // Schedule helpers
  const addScheduleRow = () => {
    if (schedules.length >= 6) return toast.error('Maximum 6 days allowed');
    setSchedules([...schedules, { day_of_week: '', start_time: '', end_time: '', room_no: '' }]);
  };

  const updateScheduleRow = (idx, field, value) => {
    const updated = [...schedules];
    updated[idx][field] = value;
    setSchedules(updated);
  };

  const removeScheduleRow = (idx) => {
    setSchedules(schedules.filter((_, i) => i !== idx));
  };

  const formatTimeDisplay = (t) => {
    if (!t) return '';
    return t.substring(0, 5); // "10:00:00" → "10:00"
  };

  const columns = [
    { header: 'Course', accessorKey: 'course_code', cell: ({row}) => <div><span className="font-mono font-medium">{row.original.course_code}</span><p className="text-xs text-gray-500">{row.original.course_name}</p></div> },
    { header: 'Credit', accessorKey: 'credit' },
    { header: 'Type', accessorKey: 'course_type', cell: ({getValue}) => <Badge>{getValue()}</Badge> },
    { 
      header: 'Teacher', 
      accessorKey: 'teacher_name', 
      cell: ({getValue, row}) => {
        if (/viva|project|thesis/i.test(row.original.course_name)) return <span className="text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded">All Teacher</span>;
        return getValue() || <span className="text-gray-400">TBA</span>;
      }
    },
    { 
      header: 'Schedule', 
      id: 'schedule',
      cell: ({row}) => {
        const sched = row.original.schedules || [];
        if (!sched.length) return <span className="text-gray-400 text-xs">No schedule</span>;
        return (
          <div className="flex flex-col gap-1">
            {sched.map((s, i) => (
              <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap inline-block max-w-max ${DAY_COLORS[s.day_of_week] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {DAY_ABBR[s.day_of_week]} {formatTimeDisplay(s.start_time)}-{formatTimeDisplay(s.end_time)} • {s.room_no}
              </span>
            ))}
          </div>
        );
      }
    },
    { header: 'Enrolled', accessorKey: 'enrolled_count' },
    { 
      header: 'Actions', 
      id: 'actions',
      cell: ({row}) => (
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setEditing(row.original);
              setForm({
                course_id: row.original.course_id,
                semester_id: row.original.semester_id,
                teacher_id: row.original.teacher_id || '',
              });
              setSchedules((row.original.schedules || []).map(s => ({
                day_of_week: s.day_of_week,
                start_time: formatTimeDisplay(s.start_time),
                end_time: formatTimeDisplay(s.end_time),
                room_no: s.room_no || ''
              })));
              setModal(true);
            }}
            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.original.offering_id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  const validateSchedules = () => {
    const usedDays = new Set();
    for (const s of schedules) {
      if (!s.day_of_week) { toast.error('Please select a day for all schedule rows'); return false; }
      if (!s.start_time || !s.end_time) { toast.error('Please fill start and end times'); return false; }
      if (s.start_time >= s.end_time) { toast.error(`End time must be after start time for ${DAY_ABBR[s.day_of_week]}`); return false; }
      if (!s.room_no) { toast.error('Please enter a room number'); return false; }
      if (usedDays.has(s.day_of_week)) { toast.error(`Duplicate day: ${s.day_of_week}`); return false; }
      usedDays.add(s.day_of_week);
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (schedules.length > 0 && !validateSchedules()) return;
    try { 
      if (editing) {
        await updateOffering(editing.offering_id, {
          teacher_id: form.teacher_id,
          schedules: schedules
        });
        toast.success('Updated');
      } else {
        await createOffering({ ...form, schedules });
        toast.success('Created'); 
      }
      setModal(false); 
      setEditing(null);
      setSchedules([]);
      load(); 
    }
    catch (err) { toast.error(err.response?.data?.error||'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this offering?')) return;
    try {
      await deleteOffering(id);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-gray-900">Course Offering</h1>
        <Button onClick={() => { 
          setEditing(null); 
          let defaultSemesterId = '';
          if (activeGroupKey && groupedOfferings[activeGroupKey]) {
            const group = groupedOfferings[activeGroupKey];
            const matchingSem = semesters.find(s => s.academic_year === group.session && s.level === group.level && s.term === group.term);
            if (matchingSem) defaultSemesterId = matchingSem.semester_id;
          }
          setForm({ course_id:'', semester_id: defaultSemesterId, teacher_id:'' }); 
          setSchedules([]);
          setModal(true); 
        }} className="w-full sm:w-auto justify-center">
          <Plus className="h-4 w-4 mr-2" /> Add Offering
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : activeGroupKey ? (
        /* Level 3: Course Table */
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setActiveGroupKey(null)} className="px-3">
                &larr; Back
              </Button>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Session {groupedOfferings[activeGroupKey].session}</div>
                <h2 className="text-xl font-black text-gray-800 leading-tight">Level {groupedOfferings[activeGroupKey].level} Term {groupedOfferings[activeGroupKey].term} Courses</h2>
              </div>
            </div>
            
            <div className="px-4 py-2 bg-brand-50 text-brand-700 text-sm font-bold rounded-xl border border-brand-100 shadow-sm shrink-0">
              {groupedOfferings[activeGroupKey].courses.length} Courses Total
            </div>
          </div>
          <DataTable columns={columns} data={groupedOfferings[activeGroupKey]?.courses || []} />
        </div>
      ) : activeSession ? (
        /* Level 2: Level/Term cards within a session */
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setActiveSession(null)} className="px-3">
              &larr; Back to Sessions
            </Button>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Session</div>
              <h2 className="text-xl font-black text-gray-800 leading-tight">{activeSession}</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {activeLevelTerms.map(group => {
              const key = `${group.session} - Level ${group.level} Term ${group.term}`;
              return (
                <div 
                  key={key} 
                  onClick={() => setActiveGroupKey(key)}
                  className="rounded-3xl p-8 border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center group relative overflow-hidden bg-white border-gray-100 hover:border-brand-200"
                >
                  {group.is_active ? (
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      Running
                    </div>
                  ) : null}

                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-50 transition-colors pointer-events-none bg-brand-50 group-hover:bg-brand-100" />
                  
                  <div className="w-16 h-16 rounded-2xl shadow-inner flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 relative z-10 bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  
                  <div className="relative z-10 w-full">
                    <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tight">Level {group.level} Term {group.term}</h3>
                    <div className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold rounded-full border shadow-sm transition-colors duration-300 bg-brand-50 text-brand-700 border-brand-100 group-hover:bg-brand-600 group-hover:text-white">
                      {group.courses.length} Courses Offered
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Level 1: Session cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedSessions.map(sGroup => (
            <div 
              key={sGroup.session} 
              onClick={() => setActiveSession(sGroup.session)}
              className="rounded-3xl p-8 border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center group relative overflow-hidden bg-white border-gray-100 hover:border-brand-200"
            >
              {sGroup.hasActive ? (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Running
                </div>
              ) : null}

              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-50 transition-colors pointer-events-none bg-brand-50 group-hover:bg-brand-100" />
              
              <div className="w-20 h-20 rounded-2xl shadow-inner flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 relative z-10 bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <div className="relative z-10 w-full">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Academic Session</div>
                <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">{sGroup.session}</h3>
                
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs text-gray-500 font-medium">{sGroup.levelTerms.length} Semesters</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500 font-medium">{sGroup.totalCourses} Courses</span>
                </div>
              </div>
            </div>
          ))}
          {sortedSessions.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl">
              No active course offerings found. Add an offering to get started.
            </div>
          )}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => { setModal(false); setEditing(null); setSchedules([]); }} title={editing ? "Edit Course Offering" : "Add Course Offering"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Semester</label>
            <select 
              value={form.semester_id} 
              onChange={e => setForm({...form, semester_id: e.target.value, course_id: ''})} 
              required 
              disabled={!!editing}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Select Semester</option>
              {semesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.academic_year} (Level {s.level} Term {s.term})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Course {selectedSemester ? <span className="text-brand-600 font-bold ml-1">(Filtered for L{selectedSemester.level}T{selectedSemester.term})</span> : ''}
            </label>
            <select 
              value={form.course_id} 
              onChange={e => setForm({...form, course_id: e.target.value, teacher_id: ''})} 
              required 
              disabled={!form.semester_id || !!editing}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">{form.semester_id ? 'Select Course' : 'Please select a semester first'}</option>
              {filteredCourses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
            </select>
            {form.semester_id && filteredCourses.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No courses found for this Level/Term. Add them in the Courses section first.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teacher</label>
            {form.course_id && courses.find(c => c.course_id.toString() === form.course_id.toString()) && /viva|project|thesis/i.test(courses.find(c => c.course_id.toString() === form.course_id.toString()).course_name) ? (
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600">
                All Teacher
              </div>
            ) : (
              <select 
                value={form.teacher_id} 
                onChange={e => setForm({...form, teacher_id: e.target.value})} 
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">TBA</option>
                {teachers.map(t => <option key={t.teacher_id} value={t.teacher_id}>{t.name} ({t.teacher_code})</option>)}
              </select>
            )}
          </div>

          {/* Schedule Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-500" /> Class Schedule
              </label>
              <button 
                type="button" 
                onClick={addScheduleRow}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:bg-brand-50 px-2 py-1 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Day
              </button>
            </div>

            {schedules.length === 0 && (
              <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-xs text-gray-400 mb-2">No schedule added yet</p>
                <button 
                  type="button" 
                  onClick={addScheduleRow}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100 transition-colors"
                >
                  <Plus className="w-3 h-3 inline mr-1" /> Add First Day
                </button>
              </div>
            )}

            <div className="space-y-2">
              {schedules.map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <select
                    value={s.day_of_week}
                    onChange={e => updateScheduleRow(i, 'day_of_week', e.target.value)}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[100px]"
                  >
                    <option value="">Day</option>
                    {DAYS.map(d => (
                      <option key={d} value={d} disabled={schedules.some((x, j) => j !== i && x.day_of_week === d)}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={s.start_time}
                    onChange={e => updateScheduleRow(i, 'start_time', e.target.value)}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 w-[100px]"
                  />
                  <span className="text-gray-400 text-xs font-bold">to</span>
                  <input
                    type="time"
                    value={s.end_time}
                    onChange={e => updateScheduleRow(i, 'end_time', e.target.value)}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 w-[100px]"
                  />
                  <input
                    type="text"
                    value={s.room_no}
                    onChange={e => updateScheduleRow(i, 'room_no', e.target.value)}
                    placeholder="Room"
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 flex-1 min-w-[60px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeScheduleRow(i)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setModal(false); setEditing(null); setSchedules([]); }}>Cancel</Button>
            <Button type="submit" disabled={!form.course_id}>{editing ? 'Update Offering' : 'Create Offering'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
