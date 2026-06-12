import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getDashboardPendingTasks, getDashboardCgpaDistribution, getDashboardPaymentStatus, getDashboardRecentActivity } from '../../api/staff.api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Calendar, Clock, BookOpen, AlertCircle, CreditCard, ChevronRight, Activity, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { DashboardSkeleton } from '../../components/ui/Skeletons';
import toast from 'react-hot-toast';

export default function StaffDashboard() {
  const [data, setData] = useState({
    stats: null,
    tasks: [],
    cgpa: [],
    payments: [],
    activity: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getDashboardPendingTasks(),
      getDashboardCgpaDistribution(),
      getDashboardPaymentStatus(),
      getDashboardRecentActivity(),
      new Promise(resolve => setTimeout(resolve, 500))
    ]).then(([st, ts, cg, pa, ac]) => {
      setData({
        stats: st.data.data,
        tasks: ts.data.data,
        cgpa: cg.data.data,
        payments: pa.data.data,
        activity: ac.data.data
      });
    }).catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const { stats, tasks, cgpa, payments, activity } = data;

  const COLORS = ['#16a34a', '#facc15', '#ef4444']; // Paid, Pending, Unpaid

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-gray-900 tracking-tight">Department Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of department statistics and pending actions.</p>
        </div>
      </div>

      {/* SECTION 1: STAT CARDS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div 
          onClick={() => navigate('/staff/students')}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold font-display text-gray-900">{stats.totalStudents}</p>
          <p className="text-xs font-medium text-gray-500 mt-1">Total Students</p>
        </div>

        <div 
          onClick={() => navigate('/staff/semesters')}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-xl font-bold font-display text-gray-900 truncate">
            {stats.activeSemester ? `L${stats.activeSemester.level}T${stats.activeSemester.term}` : 'None'}
          </p>
          <p className="text-xs font-medium text-gray-500 mt-1">Active Semester</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          {stats.activeSemester && stats.activeSemester.reg_end ? (
            <p className="text-xl font-bold font-display text-gray-900 truncate">
              {Math.max(0, Math.ceil((new Date(stats.activeSemester.reg_end) - new Date()) / (1000*60*60*24)))} days left
            </p>
          ) : (
            <p className="text-xl font-bold font-display text-gray-900 truncate">Closed</p>
          )}
          <p className="text-xs font-medium text-gray-500 mt-1">Registration</p>
        </div>

        <div 
          onClick={() => navigate('/staff/courses')}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold font-display text-gray-900">{stats.pendingGrades}</p>
          <p className="text-xs font-medium text-gray-500 mt-1">Pending Grades</p>
        </div>

        <div 
          onClick={() => navigate('/staff/students')}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold font-display text-gray-900">{stats.unpaidPayments}</p>
          <p className="text-xs font-medium text-gray-500 mt-1">Unpaid Payments</p>
        </div>

        <div 
          onClick={() => navigate('/staff/courses')}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-yellow-200 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold font-display text-gray-900">{stats.tbaCourses}</p>
          <p className="text-xs font-medium text-gray-500 mt-1">TBA Courses</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-8">
        
        {/* SECTION 2: PENDING TASKS LIST */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="bg-brand-50 p-4 border-b border-brand-100 flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-gray-900">⚡ Action Required</h2>
              {tasks.length > 0 && (
                <span className="ml-auto bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{tasks.length}</span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              {tasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <CheckCircle className="w-12 h-12 mb-3 text-gray-200" />
                  <p className="text-sm font-medium">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((t, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 hover:border-brand-200 transition-colors group cursor-pointer" onClick={() => navigate(t.link)}>
                      <div className={`shrink-0 w-2 h-2 rounded-full ${t.severity === 'red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : t.severity === 'yellow' ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'bg-green-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{t.label}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:text-brand-700">
                        {t.action}
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: QUICK CHARTS */}
        <div className="xl:col-span-2 space-y-8">
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* CGPA Distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                CGPA Distribution
              </h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cgpa} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} fontWeight={600} tick={{ fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} fontSize={11} fontWeight={600} tick={{ fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2 border border-gray-100 shadow-lg rounded-lg text-xs font-bold text-gray-900">
                              {payload[0].payload.name}: <span className="text-brand-600">{payload[0].value} students</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-400" />
                Payment Status
              </h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={payments}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {payments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2 border border-gray-100 shadow-lg rounded-lg text-xs font-bold text-gray-900">
                              {payload[0].name}: <span style={{ color: payload[0].payload.fill }}>{payload[0].value}</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-400" />
                Recent Activity
              </h3>
            </div>
            <div className="p-5">
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No recent activity found.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  {activity.map((item, index) => (
                    <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-brand-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        {item.type === 'student' ? <Users className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-slate-900 text-sm">{item.type === 'student' ? 'Student' : 'System'}</div>
                          <time className="font-mono text-xs text-brand-600">{new Date(item.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                        </div>
                        <div className="text-slate-500 text-xs">{item.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
