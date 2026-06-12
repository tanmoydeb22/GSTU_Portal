import { useState, useEffect } from 'react';
import { getEligibleRetakeImprove, enrollRetake, enrollImprove } from '../../api/student.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { RefreshCw, TrendingUp, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RetakeImprove() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getEligibleRetakeImprove()
      .then(res => setData(res.data.data))
      .catch(() => toast.error('Failed to load eligibility data'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRetake = async (courseId, originalEnrollmentId) => {
    try { 
      await enrollRetake({ course_id: courseId, original_enrollment_id: originalEnrollmentId }); 
      toast.success('Successfully registered for Retake!'); 
      load(); 
    } catch (err) { 
      toast.error(err.response?.data?.error || 'Retake registration failed'); 
    }
  };

  const handleImprove = async (courseId, originalEnrollmentId) => {
    try { 
      await enrollImprove({ course_id: courseId, original_enrollment_id: originalEnrollmentId }); 
      toast.success('Successfully registered for Improvement!'); 
      load(); 
    } catch (err) { 
      toast.error(err.response?.data?.error || 'Improvement registration failed'); 
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"/></div>;

  const { retakeable = [], improveable = [] } = data || {};
  
  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-brand-500" />
              Academic Rules
            </h3>
            <ul className="space-y-4 text-sm text-gray-600">
              <li className="flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span><strong>Retake:</strong> You can retake any course where you have an <strong>'F'</strong> grade.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span><strong>Improvement:</strong> You can improve courses from exactly <strong>one year ago</strong> (same term) if your grade is below 3.25.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span><strong>No Credit Limit:</strong> You can register for any eligible retake/improvement courses without credit limits.</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
            <div className="flex gap-3 text-amber-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Wait for Registration</p>
                <p className="text-xs mt-1 leading-relaxed">Retake/Improvement buttons will only appear if the course is being offered in the current active semester.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Retakeable Courses */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-red-500" />
                Retakeable (Failed) Courses
              </h3>
            </div>
            {retakeable.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">No failed courses found in your records.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-gray-400 uppercase tracking-wider text-[10px]">Course</th>
                      <th className="px-6 py-4 text-center font-bold text-gray-400 uppercase tracking-wider text-[10px]">Credit</th>
                      <th className="px-6 py-4 text-center font-bold text-gray-400 uppercase tracking-wider text-[10px]">Period</th>
                      <th className="px-6 py-4 text-right font-bold text-gray-400 uppercase tracking-wider text-[10px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {retakeable.map(c => (
                      <tr key={c.enrollment_id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-mono font-bold text-gray-900">{c.course_code}</p>
                          <p className="text-xs text-gray-500">{c.course_name}</p>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-600">{c.credit}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">L{c.level} T{c.term}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleRetake(c.course_id, c.enrollment_id)}>
                            Enroll Retake
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Improveable Courses */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Improvement Eligibility
              </h3>
            </div>
            {improveable.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">No courses eligible for improvement this term.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-gray-400 uppercase tracking-wider text-[10px]">Course</th>
                      <th className="px-6 py-4 text-center font-bold text-gray-400 uppercase tracking-wider text-[10px]">Current</th>
                      <th className="px-6 py-4 text-center font-bold text-gray-400 uppercase tracking-wider text-[10px]">Credit</th>
                      <th className="px-6 py-4 text-right font-bold text-gray-400 uppercase tracking-wider text-[10px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {improveable.map(c => (
                      <tr key={c.enrollment_id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-mono font-bold text-gray-900">{c.course_code}</p>
                          <p className="text-xs text-gray-500">{c.course_name}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="brand">{c.grade_letter}</Badge>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-600">{c.credit}</td>
                        <td className="px-6 py-4 text-right">
                          <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleImprove(c.course_id, c.enrollment_id)}>
                            Enroll Improvement
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
