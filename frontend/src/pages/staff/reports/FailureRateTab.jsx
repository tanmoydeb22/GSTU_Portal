import { useState, useEffect } from 'react';
import { getFailureRates, getSemesters } from '../../../api/staff.api';
import { Filter, AlertOctagon } from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

export default function FailureRateTab() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSemesters().then(r => {
      setSemesters(r.data.data);
      if (r.data.data.length > 0) setSelectedSemester(r.data.data[0].semester_id);
    });
  }, []);

  useEffect(() => {
    if (!selectedSemester) return;
    setLoading(true);
    getFailureRates({ semester_id: selectedSemester })
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load failure rates'))
      .finally(() => setLoading(false));
  }, [selectedSemester]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 print:hidden">
        <Filter className="w-4 h-4 text-gray-400" />
        <select 
          value={selectedSemester} 
          onChange={e => setSelectedSemester(e.target.value)}
          className="text-sm border-gray-200 rounded-lg focus:ring-brand-500"
        >
          <option value="">Select Semester...</option>
          {semesters.map(s => (
            <option key={s.semester_id} value={s.semester_id}>
              L{s.level} T{s.term} ({s.academic_year})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 text-gray-400">
          <AlertOctagon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No course data found for the selected semester.</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[400px]">
            <h3 className="font-bold text-gray-900 mb-6">Course Failure Rates (%)</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="course_code" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }} 
                  height={60}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12 }} 
                  unit="%" 
                  domain={[0, 'dataMax + 10']}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value) => [`${value}%`, 'Failure Rate']}
                />
                <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: '30% Critical Limit', fill: '#ef4444', fontSize: 10 }} />
                <Bar dataKey="failure_rate" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.failure_rate > 30 ? '#ef4444' : '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-bold">Course</th>
                    <th className="px-6 py-4 font-bold text-center">Total Enrolled</th>
                    <th className="px-6 py-4 font-bold text-center text-green-600">Passed</th>
                    <th className="px-6 py-4 font-bold text-center text-red-500">Failed</th>
                    <th className="px-6 py-4 font-bold text-right">Failure Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map(c => (
                    <tr key={c.course_code} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 font-mono">{c.course_code}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{c.course_name}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-700">{c.total_students}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-600">{c.passed_students}</td>
                      <td className="px-6 py-4 text-center font-bold text-red-500">{c.failed_students}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.failure_rate > 30 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {c.failure_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
