import { useState, useEffect, useRef } from 'react';
import { getMyPayment, initiatePayment, submitManualPayment } from '../../api/student.api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import useAuthStore from '../../store/useAuthStore';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { PaymentSkeleton } from '../../components/ui/Skeletons';
import { CreditCard, DollarSign, Receipt, AlertCircle, FileText, CheckCircle2, Upload, Phone, ShieldCheck, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Payment() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { user } = useAuthStore();
  const receiptRef = useRef(null);

  // Form states
  const [paymentMethod, setPaymentMethod] = useState(''); // 'cards', 'bkash', 'nagad'
  const [transactionId, setTransactionId] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  const load = () => {
    Promise.all([
      getMyPayment(),
      new Promise(resolve => setTimeout(resolve, 400))
    ])
      .then(([res]) => setData(res.data.data))
      .catch(() => toast.error('Failed to load payment info'))
      .finally(() => setLoading(false));
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current || !data?.payment) return;
    setExporting(true);
    const toastId = toast.loading('Generating Receipt PDF...');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, // higher resolution
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 size width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Receipt_${data.payment.transaction_id}.pdf`);
      toast.success('Receipt downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('Payment completed successfully!');
      // remove query param
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
      toast.error('Payment failed: ' + params.get('error'));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleAutomaticPay = async () => {
    setSubmitting(true);
    try {
      const res = await initiatePayment(data.payment.payment_id);
      window.location.href = res.data.data.checkout_url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment');
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!receiptFile) return toast.error('Please upload your payment receipt');
    if (!transactionId) return toast.error('Please enter the Transaction ID');

    setSubmitting(true);
    const formData = new FormData();
    formData.append('payment_id', data.payment.payment_id);
    formData.append('payment_method', paymentMethod === 'bkash' ? 'bKash' : 'Nagad');
    formData.append('transaction_id', transactionId);
    formData.append('receipt', receiptFile);

    try {
      await submitManualPayment(formData);
      toast.success('Payment submitted for verification!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit payment details');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PaymentSkeleton />;

  if (!data || !data.payment) return (
    <div className="text-center py-16 animate-fade-in">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Receipt className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-display font-bold text-gray-900">No Payment Due</h2>
      <p className="text-gray-500 mt-2">Your payment invoice for this semester has not been generated yet.</p>
    </div>
  );

  const { payment, semester } = data;
  const isPaid = payment.status === 'Paid';
  const isPending = payment.status === 'Pending';
  const isRejected = payment.status === 'Rejected';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-brand-500" />
            Semester Fee Payment
          </h1>
          <p className="text-sm text-gray-500 mt-1">Level {semester.level}, Term {semester.term} ({semester.academic_year})</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Invoice Status</p>
          {isPaid ? <Badge variant="success" className="text-sm px-3 py-1">✓ Paid</Badge> : 
           isPending ? <Badge variant="warning" className="text-sm px-3 py-1">⏳ Waiting for Dept. Approval</Badge> :
           isRejected ? <Badge variant="danger" className="text-sm px-3 py-1">✖ Rejected (Resubmit)</Badge> :
           payment.status === 'Failed' ? <Badge variant="danger" className="text-sm px-3 py-1">✖ Failed</Badge> :
           <Badge variant="secondary" className="text-sm px-3 py-1">Unpaid</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Invoice Breakdown */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-400" />
              <h3 className="font-bold text-gray-900">Fee Breakdown</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                  <p className="font-bold text-gray-900">Base Semester Fee</p>
                  <p className="text-xs text-gray-500">Standard fee for mandatory courses</p>
                </div>
                <span className="font-mono font-bold text-gray-900">৳{Math.round(payment.base_amount)}</span>
              </div>
              
              {parseFloat(payment.extra_fixed) > 0 && (
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900">Extra Courses (Fixed)</p>
                    <p className="text-xs text-gray-500">Per course registration fee</p>
                  </div>
                  <span className="font-mono font-bold text-gray-900">৳{Math.round(payment.extra_fixed)}</span>
                </div>
              )}
              
              {parseFloat(payment.extra_credit_cost) > 0 && (
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900">Extra Courses (Credit)</p>
                    <p className="text-xs text-gray-500">Per credit fee for retake/improvement</p>
                  </div>
                  <span className="font-mono font-bold text-gray-900">৳{Math.round(payment.extra_credit_cost)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <p className="font-bold text-lg text-gray-900 uppercase">Total Amount</p>
                <span className="font-mono font-bold text-2xl text-brand-600">৳{Math.round(payment.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Registered Courses list */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
             <div className="px-5 py-3 border-b bg-gray-50">
               <h3 className="font-bold text-gray-900 text-sm">Included Courses</h3>
             </div>
             <ul className="divide-y divide-gray-100">
               {payment.items?.map(item => (
                 <li key={item.item_id} className="px-5 py-3 flex justify-between items-center text-sm">
                   <div>
                     <span className="font-mono font-bold text-gray-700">{item.course_code}</span>
                     <span className="text-gray-400 mx-2">•</span>
                     <span className="text-gray-500">{item.credit} cr</span>
                   </div>
                   <Badge variant={item.item_type === 'Regular' ? 'brand' : item.item_type === 'Retake' ? 'danger' : 'info'}>
                     {item.item_type}
                   </Badge>
                 </li>
               ))}
             </ul>
          </div>
        </div>

        {/* Action Panel */}
        <div className="md:col-span-1 space-y-4">
          <div className={`rounded-xl border p-5 shadow-sm ${isPaid ? 'bg-green-50 border-green-100' : isPending ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100'}`}>
            {isPaid ? (
              <div className="text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <div>
                  <h3 className="font-bold text-green-900">Payment Successful</h3>
                  <p className="text-xs text-green-700 mt-1">Paid on {new Date(payment.paid_at).toLocaleString()}</p>
                </div>
                <div className="pt-4 border-t border-green-200 mt-4 text-left">
                  <p className="text-xs text-green-800">Method: {payment.payment_method || payment.gateway}</p>
                  <p className="font-mono text-sm font-bold text-green-900 break-all mt-1">TrxID: {payment.transaction_id}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-green-200 text-green-700 hover:bg-green-100 flex justify-center items-center"
                  onClick={handleDownloadPdf}
                  disabled={exporting}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" /> Download Receipt (PDF)
                    </>
                  )}
                </Button>
              </div>
            ) : isPending ? (
              <div className="text-center space-y-3">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                <div>
                  <h3 className="font-bold text-amber-900">Verification Pending</h3>
                  <p className="text-xs text-amber-700 mt-1">Your payment details have been submitted. Waiting for the department staff to verify and approve.</p>
                </div>
                <div className="pt-4 border-t border-amber-200 mt-4 text-left">
                  <p className="text-xs text-amber-800">Method: {payment.payment_method}</p>
                  <p className="font-mono text-sm font-bold text-amber-900 break-all mt-1">TrxID: {payment.transaction_id}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {isRejected && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm text-red-800 mb-4">
                    <strong>Payment Rejected:</strong> The department could not verify your previous payment submission. Please check your transaction ID/receipt and try again.
                  </div>
                )}
                
                <h3 className="font-bold text-gray-900">Select Payment Method</h3>
                
                <div className="space-y-2">
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'cards' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="method" value="cards" checked={paymentMethod === 'cards'} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-3 text-brand-600 focus:ring-brand-500" />
                    <CreditCard className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="font-medium text-sm text-gray-900">Visa / Mastercard</span>
                  </label>
                  
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'bkash' ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="method" value="bkash" checked={paymentMethod === 'bkash'} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-3 text-pink-500 focus:ring-pink-500" />
                    <img src="/bkash_logo.png" alt="bKash" className="h-6 w-auto mr-3" />
                    <span className="font-medium text-sm text-gray-900">bKash (Manual)</span>
                  </label>
                  
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'nagad' ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="method" value="nagad" checked={paymentMethod === 'nagad'} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-3 text-orange-500 focus:ring-orange-500" />
                    <img src="/nagad_logo.png" alt="Nagad" className="h-6 w-auto mr-3" />
                    <span className="font-medium text-sm text-gray-900">Nagad (Manual)</span>
                  </label>
                </div>

                {paymentMethod === 'cards' && (
                  <div className="animate-fade-in space-y-4 pt-4 border-t">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2">
                      <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
                      <p className="text-xs text-blue-800">Secure automated payment via SSLCommerz gateway.</p>
                    </div>
                    <Button className="w-full justify-center py-3" onClick={handleAutomaticPay} disabled={submitting}>
                      <DollarSign className="h-4 w-4 mr-2" /> Proceed to Gateway
                    </Button>
                  </div>
                )}

                {(paymentMethod === 'bkash' || paymentMethod === 'nagad') && (
                  <form onSubmit={handleManualSubmit} className="animate-fade-in space-y-4 pt-4 border-t">
                    <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
                      <h4 className="font-bold text-sm text-gray-900">Payment Instructions</h4>
                      <p className="text-xs text-gray-600">Please send exactly <strong>৳{Math.round(payment.total_amount)}</strong> to the university bank account using the {paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} app's "Transfer Money" or "Bank Transfer" feature.</p>
                      
                      <div className="bg-white p-3 rounded border text-sm shadow-sm">
                        <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Bank Details</p>
                        <p><strong>Bank:</strong> Agrani Bank PLC.</p>
                        <p><strong>A/C Name:</strong> GSTU Dept Fund</p>
                        <p className="font-mono mt-1 text-brand-600 font-bold bg-brand-50 p-1 rounded inline-block">A/C: 0200003152569</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Receipt Screenshot</label>
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-6 h-6 mb-2 text-gray-500" />
                              <p className="text-xs text-gray-500">{receiptFile ? receiptFile.name : 'Click to upload image'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={e => setReceiptFile(e.target.files[0])} />
                          </label>
                        </div>
                      </div>

                      <Input 
                        label="Transaction ID (TrxID)" 
                        placeholder="e.g. 9ABCDEF123" 
                        value={transactionId} 
                        onChange={e => setTransactionId(e.target.value)} 
                        required 
                      />
                    </div>

                    <Button type="submit" className="w-full justify-center py-3" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Payment Details'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HIDDEN EXPORT TEMPLATE FOR PDF CAPTURE */}
      <div className="fixed -left-[9999px] top-0 bg-white" ref={receiptRef}>
        {payment && (
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
                    <p><span className="text-gray-500 w-32 inline-block">Student Name:</span> <span className="font-bold">{user?.name || payment.student_name || 'Student'}</span></p>
                    <p><span className="text-gray-500 w-32 inline-block">Student ID:</span> <span className="font-bold">{user?.student_id || user?.userId || payment.student_id}</span></p>
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
                      <p className="text-sm text-gray-500">Level {semester?.level || payment.level}, Term {semester?.term || payment.term} ({semester?.academic_year || payment.academic_year})</p>
                    </td>
                    <td className="py-6 px-6 text-right font-mono font-bold text-gray-900 text-xl">৳{Math.round(payment.total_amount)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-brand-50/50">
                    <td className="py-4 px-6 text-right font-bold text-gray-900 text-lg">Total Paid:</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-brand-700 text-2xl underline decoration-double underline-offset-8">৳{Math.round(payment.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-2 gap-10 mb-16">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Transaction Info</p>
                  <div className="text-sm space-y-2 bg-gray-50 p-5 rounded-xl border border-gray-100 font-mono">
                    <p><span className="text-gray-400">Method:</span> {payment.payment_method || payment.gateway}</p>
                    <p><span className="text-gray-400">Trx ID:</span> {payment.transaction_id}</p>
                    <p><span className="text-gray-400">Paid At:</span> {new Date(payment.paid_at).toLocaleString()}</p>
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
