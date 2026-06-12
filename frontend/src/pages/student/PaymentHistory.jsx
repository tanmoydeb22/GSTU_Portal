import { useState, useEffect, useRef } from 'react';
import { getPaymentHistory } from '../../api/student.api';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import { History, Eye, Download, Printer, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import useAuthStore from '../../store/useAuthStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function PaymentHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [printingReceipt, setPrintingReceipt] = useState(null);
  const { user } = useAuthStore();
  const receiptRef = useRef(null);

  const load = () => {
    getPaymentHistory()
      .then(res => setHistory(res.data.data))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDownloadPdf = async () => {
    if (!receiptRef.current || !printingReceipt) return;
    
    setExporting(true);
    // Give time for the hidden DOM to be fully rendered
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 750 // Fixed width for consistent PDF output
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * (pageWidth - 20)) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, pageWidth - 20, imgHeight);
      pdf.save(`Receipt_${printingReceipt.transaction_id}.pdf`);
      toast.success('Receipt downloaded successfully!');
      setPrintingReceipt(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { header: 'Semester', cell: ({row}) => `L${row.original.level} T${row.original.term}` },
    { header: 'Invoice Date', accessorKey: 'created_at', cell: ({getValue}) => new Date(getValue()).toLocaleDateString() },
    { header: 'Amount', accessorKey: 'total_amount', cell: ({getValue}) => <span className="font-mono font-bold">৳{Math.round(getValue())}</span> },
    { header: 'Method', cell: ({row}) => row.original.payment_method || row.original.gateway || '—' },
    { header: 'Transaction ID', accessorKey: 'transaction_id', cell: ({getValue}) => <span className="font-mono text-xs">{getValue() || '—'}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({getValue}) => {
      const v = getValue();
      if (v === 'Paid') return <Badge variant="success">Paid</Badge>;
      if (v === 'Pending') return <Badge variant="warning">⏳ Waiting for Dept. Approval</Badge>;
      if (v === 'Rejected') return <Badge variant="danger">Rejected</Badge>;
      if (v === 'Failed') return <Badge variant="danger">Failed</Badge>;
      return <Badge variant="secondary">Unpaid</Badge>;
    }},
    { header: 'Paid At', accessorKey: 'paid_at', cell: ({getValue}) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' },
    { header: 'Receipt', cell: ({row}) => {
        const isPaid = row.original.status === 'Paid';
        if (isPaid) {
          return (
            <Button variant="ghost" size="xs" onClick={() => setPrintingReceipt(row.original)} className="text-brand-600 hover:text-brand-700">
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
          );
        }
        return row.original.receipt_image_url ? (
          <Button variant="ghost" size="xs" onClick={() => setViewReceipt(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
        ) : '—';
    }}
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-brand-100 text-brand-600 rounded-xl"><History className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Payment History</h1>
          <p className="text-sm text-gray-500">Record of all your semester fee payments</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"/></div>
      ) : (
        <div className="bg-white border border-brand-100 rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-lg p-2 lg:p-6">
          <DataTable columns={columns} data={history} />
        </div>
      )}

      <Modal isOpen={!!viewReceipt} onClose={() => setViewReceipt(null)} title="Payment Receipt" size="md">
        {viewReceipt && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg border text-sm">
              <p><strong>Method:</strong> {viewReceipt.payment_method}</p>
              <p><strong>Transaction ID:</strong> <span className="font-mono text-brand-600">{viewReceipt.transaction_id}</span></p>
            </div>
            <div className="border rounded-lg overflow-hidden bg-gray-100 flex justify-center max-h-[60vh] overflow-y-auto">
              <img 
                src={`http://localhost:3000${viewReceipt.receipt_image_url}`} 
                alt="Receipt" 
                className="max-w-full h-auto"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/400x500?text=Image+Not+Found'; }}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setViewReceipt(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Real Printable Receipt Modal */}
      <Modal isOpen={!!printingReceipt} onClose={() => setPrintingReceipt(null)} title="Official Payment Receipt" size="lg" centerTitle={true}>
        {printingReceipt && (
          <div className="space-y-6">
            <div className="p-8 bg-white border shadow-sm rounded-lg text-gray-800">
              {/* Preview Header */}
              <div className="text-center border-b-2 border-brand-600 pb-4 mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900 uppercase">Gopalganj Science and Technology University</h2>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Office of the Registrar</p>
                <p className="text-xs text-gray-400 mt-1">Gopalganj, Bangladesh</p>
              </div>

              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-lg font-bold text-brand-700 mb-2 underline decoration-brand-200 underline-offset-4">PAYMENT RECEIPT</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500 w-24 inline-block">Student Name:</span> <span className="font-bold">{user?.name}</span></p>
                    <p><span className="text-gray-500 w-24 inline-block">Student ID:</span> <span className="font-bold">{user?.student_id || user?.userId}</span></p>
                    <p><span className="text-gray-500 w-24 inline-block">Department:</span> <span className="font-bold">{user?.dept_name || 'Computer Science & Engineering'}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-brand-50 p-3 rounded-lg border border-brand-100 inline-block text-left">
                    <div className="flex items-center text-green-600 font-bold">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> PAID
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-sm border-collapse mb-8">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="py-3 px-4 text-left font-bold text-gray-700">Description</th>
                    <th className="py-3 px-4 text-right font-bold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4">
                      <p className="font-bold">Semester Registration Fee</p>
                      <p className="text-xs text-gray-500">Level {printingReceipt.level}, Term {printingReceipt.term} ({printingReceipt.academic_year})</p>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-gray-900">৳{Math.round(printingReceipt.total_amount)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-brand-50/50">
                    <td className="py-3 px-4 text-right font-bold text-gray-900">Total Paid:</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-brand-700 text-lg underline decoration-double underline-offset-4">৳{Math.round(printingReceipt.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction Info</p>
                  <div className="text-xs space-y-1 bg-gray-50 p-3 rounded border border-gray-100 font-mono">
                    <p><span className="text-gray-400">Method:</span> {printingReceipt.payment_method || printingReceipt.gateway}</p>
                    <p><span className="text-gray-400">Trx ID:</span> {printingReceipt.transaction_id}</p>
                    <p><span className="text-gray-400">Paid At:</span> {new Date(printingReceipt.paid_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-col justify-end items-center">
                  <div className="w-40 border-t border-gray-300 pt-1 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Authorized Signature</p>
                    <p className="text-[8px] text-gray-300 italic mt-0.5">Electronically verified by GSTU Portal</p>
                  </div>
                </div>
              </div>

              <div className="text-center border-t border-gray-100 pt-4">
                <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em]">This is a computer generated document and does not require a physical signature.</p>
              </div>
            </div>

            <div className="flex justify-end items-center bg-gray-50 p-4 rounded-xl border">
               <div className="flex gap-3">
                 <Button variant="ghost" onClick={() => setPrintingReceipt(null)}>Cancel</Button>
                 <Button onClick={handleDownloadPdf} loading={exporting} className="bg-brand-600 hover:bg-brand-700 text-white px-6">
                   <Download className="h-4 w-4 mr-2" /> Save as PDF
                 </Button>
               </div>
            </div>
          </div>
        )}
      </Modal>

      {/* HIDDEN EXPORT TEMPLATE FOR PDF CAPTURE */}
      <div className="fixed -left-[9999px] top-0 bg-white" ref={receiptRef}>
        {printingReceipt && (
          <div className="w-[750px] p-10 bg-white text-gray-800">
             <div className="text-center border-b-2 border-brand-600 pb-4 mb-6">
                <h2 className="text-3xl font-bold text-gray-900 uppercase">Gopalganj Science and Technology University</h2>
                <p className="text-lg font-bold text-gray-500 uppercase tracking-widest">Office of the Registrar</p>
                <p className="text-sm text-gray-400 mt-1">Gopalganj, Bangladesh</p>
              </div>

              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-brand-700 mb-4 underline decoration-brand-200 underline-offset-4">PAYMENT RECEIPT</h3>
                  <div className="space-y-2 text-base">
                    <p><span className="text-gray-500 w-32 inline-block">Student Name:</span> <span className="font-bold">{user?.name}</span></p>
                    <p><span className="text-gray-500 w-32 inline-block">Student ID:</span> <span className="font-bold">{user?.student_id || user?.userId}</span></p>
                    <p><span className="text-gray-500 w-32 inline-block">Department:</span> <span className="font-bold">{user?.dept_name || 'Computer Science & Engineering'}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ 
                    backgroundColor: '#dcfce7', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: '3px solid #4ade80', 
                    display: 'inline-block',
                    minWidth: '120px'
                  }}>
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#166534', 
                      fontWeight: 'bold', 
                      textTransform: 'uppercase', 
                      margin: '0 0 5px 0',
                      textAlign: 'center'
                    }}>Payment Status</p>
                    <p style={{ 
                      color: '#15803d', 
                      fontWeight: 'bold', 
                      fontSize: '32px',
                      margin: '0',
                      textAlign: 'center',
                      lineHeight: '1'
                    }}>PAID</p>
                  </div>
                </div>
              </div>

              <table className="w-full text-base border-collapse mb-10">
                <thead>
                  <tr className="bg-gray-50 border-y-2 border-gray-200">
                    <th className="py-4 px-6 text-left font-bold text-gray-700">Description</th>
                    <th className="py-4 px-6 text-right font-bold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-6 px-6">
                      <p className="font-bold text-lg">Semester Registration Fee</p>
                      <p className="text-sm text-gray-500">Level {printingReceipt.level}, Term {printingReceipt.term} ({printingReceipt.academic_year})</p>
                    </td>
                    <td className="py-6 px-6 text-right font-mono font-bold text-gray-900 text-xl">৳{Math.round(printingReceipt.total_amount)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-brand-50/50">
                    <td className="py-4 px-6 text-right font-bold text-gray-900 text-lg">Total Paid:</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-brand-700 text-2xl underline decoration-double underline-offset-8">৳{Math.round(printingReceipt.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-2 gap-10 mb-16">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Transaction Info</p>
                  <div className="text-sm space-y-2 bg-gray-50 p-5 rounded-xl border border-gray-100 font-mono">
                    <p><span className="text-gray-400">Method:</span> {printingReceipt.payment_method || printingReceipt.gateway}</p>
                    <p><span className="text-gray-400">Trx ID:</span> {printingReceipt.transaction_id}</p>
                    <p><span className="text-gray-400">Paid At:</span> {new Date(printingReceipt.paid_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-col justify-end items-center">
                  <div className="w-56 border-t-2 border-gray-300 pt-2 text-center">
                    <p className="text-xs text-gray-400 uppercase font-bold">Authorized Signature</p>
                    <p className="text-[10px] text-gray-300 italic mt-1">Electronically verified by GSTU Portal</p>
                  </div>
                </div>
              </div>

              <div className="text-center border-t border-gray-100 pt-6">
                <p className="text-xs text-gray-400 uppercase tracking-[0.2em]">This is a computer generated document and does not require a physical signature.</p>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
