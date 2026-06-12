import { useState, useEffect } from 'react';
import { getStudentDashboard } from '../../api/student.api';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend, Area } from 'recharts';
import Badge from '../../components/ui/Badge';
import GradeBadge from '../../components/domain/GradeBadge';
import SemesterCountdown from '../../components/domain/SemesterCountdown';
import GraduationTracker from '../../components/domain/GraduationTracker';
import { DashboardSkeleton } from '../../components/ui/Skeletons';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { X, BookOpen, LineChart } from 'lucide-react';
import PageWrapper from '../../components/ui/PageWrapper';
import EmptyState from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';

const AnimatedBar = (props) => {
  const { fill, x, y, width, height, index } = props;
  return (
    <motion.path
      initial={{ d: `M${x},${y + height} a6,6 0 0,1 6,-6 h${width - 12} a6,6 0 0,1 6,6 v0 h-${width} Z` }}
      animate={{ d: `M${x},${y + 6} a6,6 0 0,1 6,-6 h${width - 12} a6,6 0 0,1 6,6 v${height - 6} h-${width} Z` }}
      transition={{ duration: 0.6, delay: index * 0.1, type: "spring", bounce: 0.3 }}
      fill={fill}
    />
  );
};

export default function StudentDashboard() {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [hideBanner, setHideBanner] = useState(() => localStorage.getItem('hideGuardianBanner') === 'true');
  useEffect(() => { 
    Promise.all([
      getStudentDashboard(),
      new Promise(resolve => setTimeout(resolve, 400))
    ])
      .then(([r]) => {
        setData(r.data.data);
      })
      .catch(() => toast.error('Failed'))
      .finally(() => setLoading(false)); 
  }, []);
  
  if (loading) return <DashboardSkeleton />;
  if (!data) return null;
  const { student, activeSemester, currentCourses, gpaHistory, isRegistered, isPaid, lastLogin } = data;

  const chartData = gpaHistory.map(g => ({
    ...g, 
    label: `L${g.level}T${g.term}`,
    fullName: `${g.academic_year} (Level ${g.level}, Term ${g.term})`,
    curve_gpa: g.term_gpa // This will be used for the smooth line
  }));

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <PageWrapper className="space-y-6 animate-fade-in">
      {/* Hero Card */}
      <div className="dashboard-header bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold tracking-wider uppercase">
              <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
              {getGreeting()}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-gray-900 mt-1 tracking-tight flex items-center gap-2">
              {student.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="px-2.5 py-0.5 rounded-lg bg-brand-100/70 text-brand-700 text-xs font-bold border border-brand-200 shadow-sm">
                ID: {student.student_id}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 shadow-sm">
                {student.dept_code} Department
              </span>
            </div>
            {lastLogin && (
              <p className="text-[10px] text-gray-400 mt-2 font-medium">
                Last login: {new Date(lastLogin.last_active).toLocaleString()} from {lastLogin.ip_address}
              </p>
            )}
          </div>
          
          <div className="stats-cards grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-6 md:mt-0 w-full lg:w-auto">
            <div className="col-span-2 lg:col-span-1 bg-purple-100/75 rounded-2xl p-4 border border-purple-200 shadow-sm transition-all hover:bg-purple-100">
              <p className="text-purple-700 font-extrabold text-[10px] uppercase tracking-widest mb-1">Level / Term</p>
              <p className="text-2xl md:text-3xl font-bold font-display text-gray-900">L{student.level}T{student.term}</p>
            </div>
            <div className="bg-brand-100/75 rounded-2xl p-4 border border-brand-200 shadow-sm transition-all hover:bg-brand-100">
              <p className="text-brand-700 font-extrabold text-[10px] uppercase tracking-widest mb-1">CGPA</p>
              <p className="text-2xl md:text-3xl font-bold font-display text-gray-900">{student.cgpa||'0.00'}</p>
            </div>
            <div className="bg-blue-100/75 rounded-2xl p-4 border border-blue-200 shadow-sm transition-all hover:bg-blue-100">
              <p className="text-blue-700 font-extrabold text-[10px] uppercase tracking-widest mb-1">Credits</p>
              <p className="text-2xl md:text-3xl font-bold font-display text-gray-900">{student.total_credit_completed||0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Reminder */}
      {!student.guardian_name && !hideBanner && (
        <div className="bg-amber-100/80 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center justify-between mb-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="text-lg leading-none">⚠️</span> Complete your profile — Guardian info missing
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/student/profile')} className="text-sm font-bold text-amber-700 hover:text-amber-900 underline whitespace-nowrap transition-colors">
              Fill Now →
            </button>
            <button onClick={() => { setHideBanner(true); localStorage.setItem('hideGuardianBanner', 'true'); }} className="text-gray-500 hover:text-gray-800 font-bold p-1 leading-none transition-colors" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Semester */}
      {activeSemester && (
        <motion.div layout className="active-semester-card bg-white rounded-xl border border-brand-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div><h3 className="font-semibold text-gray-900">Active Registration: {activeSemester.academic_year}</h3>
            <p className="text-sm text-gray-500">Level {activeSemester.level}, Term {activeSemester.term}</p></div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {isRegistered && (
               <Badge variant="brand" className="py-2 px-4 text-sm bg-green-100 text-green-700 border-green-200">
                 ✓ Registered
               </Badge>
            )}
            <SemesterCountdown regEnd={activeSemester.reg_end}/>
            {!isRegistered && (
               <Button onClick={() => navigate('/student/registration')} className="flex-1 sm:flex-none justify-center">Register Now</Button>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start min-w-0 w-full">
        {/* Today's Class Schedule */}
        {(() => {
          const JS_DAY_MAP = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
          const DAY_ABBR = { Saturday:'Sat', Sunday:'Sun', Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri' };
          const fmtTime = (t) => t ? t.substring(0, 5) : '';
          const fmt12 = (t) => {
            if (!t) return '';
            const [h, m] = t.substring(0, 5).split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
          };

          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();

          let targetDay = JS_DAY_MAP[now.getDay()];
          let dayOffset = 0;
          let activeClasses = [];


          for (let offset = 0; offset < 7; offset++) {
            const checkDay = JS_DAY_MAP[(now.getDay() + offset) % 7];
            const classesForDay = currentCourses
              .map(c => {
                const targetSchedule = (c.schedules || []).find(s => s.day_of_week === checkDay);
                if (!targetSchedule) return null;
                return { ...c, targetSchedule };
              })
              .filter(Boolean)
              .sort((a, b) => (a.targetSchedule.start_time || '').localeCompare(b.targetSchedule.start_time || ''));

            if (classesForDay.length > 0) {
              if (offset === 0) {
                if (now.getHours() < 18) {
                   targetDay = checkDay;
                   dayOffset = offset;
                   activeClasses = classesForDay;
                   break;
                }
              } else {
                 targetDay = checkDay;
                 dayOffset = offset;
                 activeClasses = classesForDay;
                 break;
              }
            }
          }

          const isToday = dayOffset === 0;
          const isTomorrow = dayOffset === 1;
          const title = isToday ? "Today's Schedule" : isTomorrow ? "Tomorrow's Schedule" : "Upcoming Schedule";

          const isNow = (s) => {
            if (!isToday) return false;
            const [sh, sm] = (s.start_time || '').substring(0, 5).split(':').map(Number);
            const [eh, em] = (s.end_time || '').substring(0, 5).split(':').map(Number);
            return nowMinutes >= (sh * 60 + sm) && nowMinutes < (eh * 60 + em);
          };

          return (
            <div className="bg-white rounded-3xl border border-gray-100 flex flex-col h-[400px] min-w-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden group/card">
              {/* Gradient header */}
              <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-600 px-6 py-5 flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-base tracking-tight">{title}</h3>
                    <p className="text-[11px] text-brand-100 font-medium tracking-wide mt-0.5">{targetDay} • {activeClasses.length} class{activeClasses.length !== 1 ? 'es' : ''}</p>
                  </div>
                </div>
                <span className="text-xs font-black text-brand-700 bg-white shadow-sm px-3.5 py-1.5 rounded-full relative z-10 uppercase tracking-widest">
                  {DAY_ABBR[targetDay]}
                </span>
              </div>

              {activeClasses.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-5">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-3 shadow-sm">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <p className="text-sm font-bold text-gray-700">No Classes Scheduled!</p>
                  <p className="text-xs text-gray-400 mt-1">Enjoy your free time</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[68px] top-2 bottom-2 w-px bg-gray-100" />

                    <div className="space-y-3">
                      {activeClasses.map((c, i) => {
                        const s = c.targetSchedule;
                        const live = isNow(s);
                        const isPast = isToday && (() => {
                          const [eh, em] = (s.end_time || '').substring(0, 5).split(':').map(Number);
                          return nowMinutes >= (eh * 60 + em);
                        })();
                        return (
                          <div 
                            key={c.enrollment_id} 
                            className={`relative flex items-stretch gap-4 rounded-xl border p-3.5 transition-all duration-300 ${
                              live 
                                ? 'bg-gradient-to-r from-brand-50 to-brand-50/30 border-brand-200 shadow-md ring-1 ring-brand-100' 
                                : isPast
                                  ? 'border-gray-100 bg-gray-50/30 opacity-60'
                                  : 'border-gray-100 hover:bg-gray-50/80 hover:border-gray-200 hover:shadow-sm'
                            }`}
                          >
                            {/* Time column */}
                            <div className="flex flex-col items-center justify-center shrink-0 w-16 text-center">
                              <span className={`text-xs font-black tracking-tight ${live ? 'text-brand-700' : isPast ? 'text-gray-400' : 'text-gray-700'}`}>{fmt12(s.start_time)}</span>
                              <div className={`relative w-2 h-2 rounded-full my-2 ${live ? 'bg-brand-500 shadow-[0_0_8px_rgba(22,163,74,0.6)]' : isPast ? 'bg-gray-300' : 'bg-gray-300'}`}>
                                {live && <span className="absolute inset-0 rounded-full bg-brand-400 animate-ping opacity-50" />}
                              </div>
                              <span className={`text-[10px] font-bold ${live ? 'text-brand-500/70' : 'text-gray-400'}`}>{fmt12(s.end_time)}</span>
                            </div>

                            {/* Accent bar */}
                            <div className={`w-1 rounded-full self-stretch shrink-0 ${
                              live ? 'bg-gradient-to-b from-brand-500 to-brand-400' : isPast ? 'bg-gray-200' : 'bg-gray-200'
                            }`} />

                            {/* Course info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-mono text-sm font-bold ${live ? 'text-brand-700' : 'text-gray-800'}`}>{c.course_code}</span>
                                {live && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500 text-white text-[8px] font-bold uppercase tracking-wider shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    Live
                                  </span>
                                )}
                                {isPast && !live && (
                                  <span className="text-[9px] font-bold text-gray-400 uppercase">Done</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate leading-snug">{c.course_name}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className={`text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded-md ${live ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  {s.room_no}
                                </span>
                                {c.teacher_name && (
                                  <span className="text-[10px] text-gray-400 font-medium truncate">
                                    {c.teacher_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* GPA Trend */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 lg:p-6 shadow-sm h-[320px] lg:h-[400px] flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="font-bold text-gray-900">Academic Performance</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GPA</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-[2px] bg-brand-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Curve</span>
              </div>
            </div>
          </div>
          
          {gpaHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState 
                icon={LineChart} 
                title="No Data Yet" 
                description="Your academic journey starts here. Complete a semester to see your trend!" 
                compact 
              />
            </div>
          ) : (
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCurve" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#16a34a" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={10} 
                    fontWeight={600}
                    tick={{ fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 4]} 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={11} 
                    fontWeight={700}
                    tick={{ fill: '#64748b' }}
                    ticks={[0, 1, 2, 3, 4]}
                    width={35}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white/80 backdrop-blur-md border border-white/40 shadow-xl rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{d.fullName}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-bold text-brand-600">{d.term_gpa}</span>
                              <div className="h-5 w-[1px] bg-gray-200" />
                              <span className="text-xs font-semibold text-gray-500">{d.term_credits} Credits</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="curve_gpa" 
                    stroke="none" 
                    fillOpacity={1} 
                    fill="url(#colorCurve)" 
                  />
                  <Bar 
                    dataKey="term_gpa" 
                    shape={<AnimatedBar />}
                    barSize={40}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.term_gpa >= 3.5 ? '#16a34a' : entry.term_gpa >= 3.0 ? '#22c55e' : '#4ade80'} />
                    ))}
                  </Bar>
                  <Line 
                    type="monotone" 
                    dataKey="curve_gpa" 
                    stroke="#16a34a" 
                    strokeWidth={3}
                    dot={false}
                    filter="url(#glow)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Graduation Progress Tracker */}
      <GraduationTracker />
    </PageWrapper>
  );
}
