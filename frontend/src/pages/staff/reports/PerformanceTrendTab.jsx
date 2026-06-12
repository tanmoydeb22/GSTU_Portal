import { useState, useEffect } from 'react';
import { getPerformanceTrend } from '../../../api/staff.api';
import { Filter, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function PerformanceTrendTab() {
  const [batchFilter, setBatchFilter] = useState('');
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    setLoading(true);
    getPerformanceTrend({ batch: batchFilter })
      .then(r => {
        setData(r.data.data);
        
        // Extract distinct batches from the first data point to generate lines
        if (r.data.data.length > 0) {
          const keys = Object.keys(r.data.data[0]).filter(k => k !== 'termLabel' && k !== 'level' && k !== 'term');
          setBatches(keys);
        }
      })
      .catch(() => toast.error('Failed to load performance trend'))
      .finally(() => setLoading(false));
  }, [batchFilter]);

  // Generate distinct colors for lines
  const colors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#f43f5e'];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 print:hidden">
        <Filter className="w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Filter by Batch (e.g. 2021)"
          value={batchFilter}
          onChange={e => setBatchFilter(e.target.value)}
          className="text-sm border-gray-200 rounded-lg focus:ring-brand-500 w-64"
        />
        <span className="text-xs text-gray-400 italic">Leave empty to see all batches</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No performance data found.</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[500px]">
          <h3 className="font-bold text-gray-900 mb-6">Batch Performance Trend (Average GPA)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="termLabel" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12 }} 
                padding={{ left: 30, right: 30 }}
              />
              <YAxis 
                domain={[2.0, 4.0]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12 }} 
                tickCount={5}
              />
              <Tooltip 
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value, name) => [value, `Batch ${name}`]}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              
              {batches.map((batch, idx) => (
                <Line 
                  key={batch}
                  type="monotone" 
                  dataKey={batch} 
                  name={batch}
                  stroke={colors[idx % colors.length]} 
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  dot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
