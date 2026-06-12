import { useState, useEffect } from 'react';
import { getPayments, verifyPayment } from '../../api/staff.api';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { DollarSign, CheckCircle2, AlertCircle, TrendingUp, Eye, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Payments() {
  const [data, setData] = useState({ payments: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const load = () => {
    getPayments()
      .then(res => setData(res.data.data))
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false));
  };
  
  useEffect(load, []);

  const handleVerify = async (paymentId, status) => {
    if (!window.confirm(`Are you sure you want to mark this payment as ${status}?`)) return;
    
    setProcessingId(paymentId);
    try {
      await verifyPayment(paymentId, { status });
      toast.success(`Payment marked as ${status}`);
      setViewReceipt(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setProcessingId(null);
    }
  };

  const columns = [
    { header: 'Student', accessorKey: 'student_id', cell: ({getValue}) => <span className="font-mono text-xs font-bold">{getValue()}</span> },
    { header: 'Semester', cell: ({row}) => `L${row.original.student_level} T${row.original.student_term} (${row.original.academic_year})` },
    { header: 'Total', accessorKey: 'total_amount', cell: ({getValue}) => <span className="font-bold">৳{getValue()}</span> },
    { header: 'Method', cell: ({row}) => row.original.payment_method || row.original.gateway || '—' },
    { header: 'TrxID', accessorKey: 'transaction_id', cell: ({getValue}) => <span className="font-mono text-xs">{getValue() || '—'}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({getValue, row}) => {
      const v = getValue();
      const isManual = !!row.original.payment_method;
      if (v === 'Paid') return <Badge variant="success">Paid</Badge>;
      if (v === 'Pending') return <Badge variant="warning">{isManual ? 'Pending Verification' : 'In Progress'}</Badge>;
      if (v === 'Rejected') return <Badge variant="danger">Rejected</Badge>;
      if (v === 'Failed') return <Badge variant="danger">Failed</Badge>;
      return <Badge variant="secondary">Unpaid</Badge>;
    }},
    { header: 'Action', cell: ({row}) => {
        // Only allow manual review for manual payment submissions
        if (row.original.status === 'Pending' && row.original.payment_method) {
          return (
            <Button size="xs" onClick={() => setViewReceipt(row.original)} className="bg-brand-600 hover:bg-brand-700 text-white">
              <Eye className="h-4 w-4 mr-1" /> Review
            </Button>
          );
        }
        return '—';
    }}
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">Payment Reports & Verification</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-brand-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 rounded-lg text-brand-600"><DollarSign className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Collected</p>
              <h3 className="text-2xl font-bold font-mono text-gray-900">৳{data.stats?.total_collected || 0}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-600"><TrendingUp className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Expected Total</p>
              <h3 className="text-2xl font-bold font-mono text-gray-900">৳{data.stats?.total_expected || 0}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-green-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg text-green-600"><CheckCircle2 className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Paid Invoices</p>
              <h3 className="text-2xl font-bold font-mono text-gray-900">{data.stats?.paid_count || 0}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><AlertCircle className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Verification</p>
              <h3 className="text-2xl font-bold font-mono text-gray-900">
                {data.payments?.filter(p => p.status === 'Pending').length || 0}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <DataTable columns={columns} data={data.payments || []} />
        </div>
      )}

      {/* Verification Modal */}
      <Modal isOpen={!!viewReceipt} onClose={() => setViewReceipt(null)} title="Verify Manual Payment" size="lg">
        {viewReceipt && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Student Info</p>
                <p className="font-bold text-gray-900">{viewReceipt.student_name}</p>
                <p className="text-sm font-mono text-gray-600">{viewReceipt.student_id}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Payment Info</p>
                <p className="font-bold text-brand-600 text-lg">৳{viewReceipt.total_amount}</p>
                <p className="text-sm text-gray-600">Method: <strong>{viewReceipt.payment_method}</strong></p>
                <p className="text-sm font-mono mt-1 text-gray-800 bg-white border inline-block px-1 rounded">TrxID: {viewReceipt.transaction_id}</p>
              </div>
            </div>

            {viewReceipt.receipt_image_url ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex justify-center max-h-[50vh] overflow-y-auto p-2">
                <img 
                  src={`http://localhost:3000${viewReceipt.receipt_image_url}`} 
                  alt="Receipt Document" 
                  className="max-w-full h-auto rounded shadow-sm"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Found'; }}
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 p-8 text-center text-gray-500">
                <p>No receipt image uploaded. This is likely an automatic gateway payment.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 justify-center py-3 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleVerify(viewReceipt.payment_id, 'Rejected')}
                disabled={!!processingId}
              >
                <X className="w-5 h-5 mr-2" /> Reject Payment
              </Button>
              <Button 
                className="flex-1 justify-center py-3 bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white"
                onClick={() => handleVerify(viewReceipt.payment_id, 'Paid')}
                disabled={!!processingId}
              >
                <Check className="w-5 h-5 mr-2" /> Confirm & Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
