import { useState, useEffect, useRef } from 'react';
import { getSemesters, getResultReport } from '../../api/staff.api';
import Button from '../../components/ui/Button';
import { Printer, FileText, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import useAuthStore from '../../store/useAuthStore';

export default function ResultReport() {
  const { user } = useAuthStore();
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const componentRef = useRef();

  useEffect(() => {
    getSemesters().then(r => setSemesters(r.data.data)).catch(() => toast.error('Failed to load semesters'));
  }, []);

  const handleGenerate = async () => {
    if (!selectedSem) return toast.error('Please select a semester');
    setLoading(true);
    try {
      const res = await getResultReport({ semester_id: selectedSem });
      setReportData(res.data.data);
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const selectedSemInfo = semesters.find(s => s.semester_id === parseInt(selectedSem));

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Result_Sheet_Level${selectedSemInfo?.level}_Term${selectedSemInfo?.term}`,
  });

  return (
    <div className="space-y-6 animate-fade-in print:animate-none print:opacity-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">Result Report</h1>
          <p className="text-gray-500 text-xs md:text-sm">Generate departmental semester result sheets</p>
        </div>
        <div className="flex gap-3 self-start sm:self-auto">
          {reportData.length > 0 && (
            <Button variant="outline" onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          )}
        </div>
      </div>

      {/* Selector */}
      <div className="bg-white p-4 md:p-6 rounded-xl border no-print">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 md:gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">Select Semester</label>
            <select 
              value={selectedSem} 
              onChange={e => setSelectedSem(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="">Choose a semester...</option>
              {semesters.map(s => (
                <option key={s.semester_id} value={s.semester_id}>
                  {s.academic_year} - Level {s.level} Term {s.term}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleGenerate} loading={loading} className="w-full sm:w-auto justify-center">
            <Search className="h-4 w-4 mr-2" /> Generate Report
          </Button>
        </div>
      </div>

      {/* Report View */}
      {reportData.length > 0 ? (
        <div ref={componentRef} className="bg-white rounded-xl border overflow-hidden shadow-sm printable-report">
          {/* Header for Print */}
          <div className="p-4 md:p-8 print:p-4 text-center border-b space-y-1.5 md:space-y-2 print:space-y-1">
            <h2 className="text-lg md:text-2xl font-display font-bold text-gray-900 uppercase leading-snug">Gopalganj Science and Technology University</h2>
            <h3 className="text-base md:text-lg font-bold text-gray-800 mt-1 uppercase">{user?.dept_name || 'Computer Science and Engineering'}</h3>
            <p className="text-xs md:text-sm text-gray-600">Gopalganj-8100, Bangladesh</p>
            <div className="h-2 md:h-4 print:h-2"></div>
            <h3 className="text-base md:text-xl print:text-lg font-bold text-gray-800">Result Sheet</h3>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs md:text-sm font-medium text-gray-600 mt-1 md:mt-2">
              <p>Session: {selectedSemInfo?.academic_year}</p>
              <p>Level: {selectedSemInfo?.level}</p>
              <p>Term: {selectedSemInfo?.term}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm print:text-[11px] border-collapse border-x border-b border-gray-200">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-2 md:px-4 py-2 md:py-4 print:px-2 print:py-1.5 text-left font-bold text-gray-700 border-r w-24 md:w-32 min-w-[100px]">Student ID</th>
                  <th className="px-2 md:px-4 py-2 md:py-4 print:px-2 print:py-1.5 text-left font-bold text-gray-700 border-r min-w-[120px]">Name</th>
                  <th className="px-2 md:px-4 py-2 md:py-4 print:px-2 print:py-1.5 text-center font-bold text-gray-700 border-r w-20 md:w-24 min-w-[80px] leading-tight">Credit<br/>Offered</th>
                  <th className="px-2 md:px-4 py-2 md:py-4 print:px-2 print:py-1.5 text-center font-bold text-gray-700 border-r w-20 md:w-24 min-w-[80px] leading-tight">Credit<br/>Secured</th>
                  <th className="px-2 md:px-4 py-2 md:py-4 print:px-2 print:py-1.5 text-center font-bold text-gray-700 border-r w-20 md:w-24 min-w-[80px] leading-tight">Point<br/>Secured</th>
                  <th className="px-2 md:px-4 py-2 md:py-4 print:px-2 print:py-1.5 text-center font-bold text-gray-700 border-r w-16 md:w-24 min-w-[60px]">GPA</th>
                  <th className="px-2 md:px-4 py-2 md:py-4 print:px-2 print:py-1.5 text-left font-bold text-gray-700 min-w-[100px]">Incomplete</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-2 md:px-4 py-2 md:py-3 print:px-2 print:py-1 font-mono font-medium border-r">{row.student_id}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3 print:px-2 print:py-1 border-r whitespace-nowrap">{row.name}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3 print:px-2 print:py-1 text-center border-r">{parseFloat(row.credit_offered).toFixed(1)}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3 print:px-2 print:py-1 text-center border-r">{parseFloat(row.credit_secured).toFixed(1)}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3 print:px-2 print:py-1 text-center border-r font-mono">{parseFloat(row.point_secured).toFixed(2)}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3 print:px-2 print:py-1 text-center border-r font-mono font-bold text-brand-700">
                      {parseFloat(row.gpa).toFixed(3)}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 print:px-2 print:py-1 text-[10px] md:text-xs print:text-[10px] text-red-600 font-medium break-words">
                      {row.incomplete_courses || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 md:p-8 lg:p-12 print:p-6 mt-8 md:mt-12 print:mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0 print:flex-row print:gap-0">
            <div className="text-center border-t border-black pt-2 w-32 md:w-48">
              <p className="text-[10px] md:text-xs font-bold uppercase">Prepared By</p>
            </div>
            <div className="text-center border-t border-black pt-2 w-32 md:w-48">
              <p className="text-[10px] md:text-xs font-bold uppercase">Chairman</p>
            </div>
            <div className="text-center border-t border-black pt-2 w-40 md:w-48">
              <p className="text-[10px] md:text-xs font-bold uppercase">Controller of Exams</p>
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="bg-white border-2 border-dashed rounded-2xl p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className="text-gray-900 font-bold">No Report Generated</h3>
              <p className="text-gray-500 text-sm mt-1">Select a semester and click generate to view the departmental result sheet.</p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
