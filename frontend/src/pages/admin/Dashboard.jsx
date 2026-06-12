import { useState, useEffect } from 'react';
import { Building2, Users, GraduationCap, Calendar, AlertCircle, FileText, Zap, KeyRound, PlusCircle, ArrowRight } from 'lucide-react';
import { getAdminDashboard } from '../../api/admin.api';
import { DashboardSkeleton } from '../../components/ui/Skeletons';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return null;

  const { stats } = data;
  const missingAccessWarning = stats.depts_without_access > 0;

  const topStats = [
    { label: 'Total Students', value: stats.total_students, icon: GraduationCap, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Total Teachers', value: stats.total_teachers, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Departments', value: stats.total_departments, icon: Building2, color: 'text-fuchsia-600 bg-fuchsia-50' },
    { label: 'Active Semesters', value: stats.depts_with_active_semester, icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Action Required', value: stats.depts_without_access, icon: AlertCircle, color: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 pb-20 pt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">System Overview</h1>
        <p className="text-gray-500 mt-1">University-wide metrics and administrative controls.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {topStats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-colors duration-300 ${s.color}`}>
              <s.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold font-display text-gray-900 leading-none mb-1">{s.value}</p>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action / Warning Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        
        {/* Dept Access Warning Card */}
        <div className={`col-span-1 rounded-3xl p-8 border shadow-sm relative overflow-hidden flex flex-col justify-center ${
          missingAccessWarning ? 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200' : 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200'
        }`}>
          <div className="relative z-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm bg-white ${
              missingAccessWarning ? 'text-rose-500' : 'text-emerald-500'
            }`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className={`text-4xl font-display font-black leading-none mb-3 ${
              missingAccessWarning ? 'text-rose-900' : 'text-emerald-900'
            }`}>
              {stats.depts_without_access} <span className="text-xl text-opacity-60 font-normal">/ {stats.total_departments}</span>
            </h3>
            <p className={`text-sm font-medium mb-6 ${missingAccessWarning ? 'text-rose-700' : 'text-emerald-700'}`}>
              departments lack staff accounts. <br/> They cannot access the portal.
            </p>
            <Link 
              to="/admin/staff" 
              className={`inline-flex items-center text-sm font-bold transition-colors px-5 py-2.5 rounded-xl border bg-white shadow-sm hover:shadow ${
                missingAccessWarning ? 'border-rose-200 text-rose-700 hover:text-rose-800' : 'border-emerald-200 text-emerald-700 hover:text-emerald-800'
              }`}
            >
              Resolve Access <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link to="/admin/staff" className="flex flex-col items-center justify-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-cyan-50 hover:text-cyan-700 border border-transparent hover:border-cyan-200 transition-all text-gray-600 group">
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-cyan-300 transition-colors">
                <PlusCircle className="w-6 h-6 text-gray-400 group-hover:text-cyan-500" />
              </div>
              <span className="text-xs font-bold text-center tracking-wide">GRANT ACCESS</span>
            </Link>
            
            <Link to="/admin/staff" className="flex flex-col items-center justify-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-amber-50 hover:text-amber-700 border border-transparent hover:border-amber-200 transition-all text-gray-600 group">
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-amber-300 transition-colors">
                <KeyRound className="w-6 h-6 text-gray-400 group-hover:text-amber-500" />
              </div>
              <span className="text-xs font-bold text-center tracking-wide">RESET PASSWORDS</span>
            </Link>

            <Link to="/admin/departments" className="flex flex-col items-center justify-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-transparent hover:border-emerald-200 transition-all text-gray-600 group">
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-emerald-300 transition-colors">
                <FileText className="w-6 h-6 text-gray-400 group-hover:text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-center tracking-wide">VIEW RESULTS</span>
            </Link>

            <Link to="/admin/users" className="flex flex-col items-center justify-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-200 transition-all text-gray-600 group">
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-indigo-300 transition-colors">
                <Users className="w-6 h-6 text-gray-400 group-hover:text-indigo-500" />
              </div>
              <span className="text-xs font-bold text-center tracking-wide">MANAGE USERS</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
