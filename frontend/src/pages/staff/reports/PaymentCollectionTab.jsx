import { useState, useEffect } from 'react';
import { getPaymentsReport, exportPaymentsCSV, getSemesters } from '../../../api/staff.api';
import Button from '../../../components/ui/Button';
import { Filter, Download, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentCollectionTab() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [data, setData] = useState({ payments: [], summary: { expected: 0, collected: 0, pending: 0 } });
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
    getPaymentsReport({ semester_id: selectedSemester, status: statusFilter })
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load payment report'))
      .finally(() => setLoading(false));
  }, [selectedSemester, statusFilter]);

  const handleExport = async () => {
    try {
      toast.loading('Generating CSV...', { id: 'csv' });
      const res = await exportPaymentsCSV({ semester_id: selectedSemester, status: statusFilter });
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payment_Report_${selectedSemester}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV Downloaded!', { id: 'csv' });
    } catch (err) {
      toast.error('Export failed', { id: 'csv' });
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
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
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border-gray-200 rounded-lg focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <Button onClick={handleExport} disabled={!selectedSemester || data.payments.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Expected</p>
                <p className="text-3xl font-display font-bold text-gray-900">{formatMoney(data.summary.expected)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Total Collected</p>
                <p className="text-3xl font-display font-bold text-emerald-700">{formatMoney(data.summary.collected)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">Pending Balance</p>
                <p className="text-3xl font-display font-bold text-red-700">{formatMoney(data.summary.pending)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-bold">Student</th>
                    <th className="px-6 py-4 font-bold text-right">Base Fee</th>
                    <th className="px-6 py-4 font-bold text-right">Extra Fee</th>
                    <th className="px-6 py-4 font-bold text-right">Total</th>
                    <th className="px-6 py-4 font-bold text-center">Status</th>
                    <th className="px-6 py-4 font-bold">Paid At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.payments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">No payment records found.</td>
                    </tr>
                  ) : (
                    data.payments.map(p => {
                      const extraFee = (parseFloat(p.extra_fixed) || 0) + (parseFloat(p.extra_credit_cost) || 0);
                      
                      return (
                        <tr key={p.payment_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900 font-mono">{p.student_id}</p>
                            <p className="text-xs text-gray-500">{p.name}</p>
                            <p className="text-[10px] text-brand-600 font-bold mt-1">Batch {p.batch}</p>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">{formatMoney(p.base_amount)}</td>
                          <td className="px-6 py-4 text-right text-gray-600">{formatMoney(extraFee)}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">{formatMoney(p.total_amount)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                              p.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
