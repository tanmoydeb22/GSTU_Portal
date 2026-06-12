import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSemesterMarksStatus, publishSemesterResult, getExamCommittee, addExamCommitteeMember, removeExamCommitteeMember, downloadOfficialResultPDF } from '../../api/staff.api';
import toast from 'react-hot-toast';
import { ChevronLeft, CheckCircle, Clock, Edit3, Eye, AlertCircle, Users, Trash2, Download, FileText, UserPlus } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function ResultsDashboard() {
  const { semesterId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [committee, setCommittee] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: 'Chairman', member_type: 'committee', sl_no: 1 });

  useEffect(() => {
    loadData();
  }, [semesterId]);

  const loadData = async () => {
    try {
      const [marksRes, commRes] = await Promise.all([
        getSemesterMarksStatus(semesterId),
        getExamCommittee(semesterId)
      ]);
      setData(marksRes.data.data);
      setCommittee(commRes.data.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.name || !newMember.role || !newMember.sl_no) return toast.error('Fill all fields');
    try {
      await addExamCommitteeMember(semesterId, newMember);
      toast.success('Member added');
      setNewMember(prev => ({ ...prev, name: '', sl_no: prev.sl_no + 1 }));
      loadData();
    } catch (err) {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (id) => {
    try {
      await removeExamCommitteeMember(semesterId, id);
      toast.success('Member removed');
      loadData();
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    const toastId = toast.loading('Generating Official PDF...');
    try {
      const res = await downloadOfficialResultPDF(semesterId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Result_PDF.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF Generated successfully!', { id: toastId });
    } catch (err) {
      toast.error('Failed to generate PDF. Make sure there is at least 1 tabulator.', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish results? This action cannot be undone and will notify all students.')) return;
    
    setPublishing(true);
    try {
      await publishSemesterResult(semesterId);
      toast.success('Results published successfully!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20">Data not found.</div>;

  const { progress, offerings } = data;
  const isAllDone = progress.isReady;
  const percentage = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const pendingCount = progress.total - progress.done;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Grade Entry
          </button>
          <h1 className="text-2xl font-display font-bold text-gray-900">Result Publication Dashboard</h1>
          <p className="text-gray-600 font-medium">Manage and review marks entry progress for the semester.</p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <CheckCircle className="w-32 h-32 text-brand-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Overall Progress</h3>
        
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-3xl font-bold text-brand-700">{progress.done}</span>
            <span className="text-gray-500 font-medium"> / {progress.total} Courses Ready</span>
          </div>
          <span className="text-xl font-bold text-gray-900">{percentage}%</span>
        </div>
        
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
        </div>
        
        {pendingCount > 0 ? (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-4 py-3 rounded-xl border border-amber-100 font-medium text-sm">
            <Clock className="w-4 h-4" />
            {pendingCount} courses still pending marks entry. Complete all courses to enable publishing.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-50 px-4 py-4 rounded-xl border border-emerald-100 gap-4">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <CheckCircle className="w-5 h-5" />
              All courses completed! Results are ready to be published.
            </div>
            <Button onClick={handlePublish} disabled={publishing} className="w-full sm:w-auto shrink-0 shadow-md">
              📢 Publish Results
            </Button>
          </div>
        )}
      </div>

      {/* Course List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Course Offerings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-6 py-3 font-bold">Course</th>
                <th className="px-6 py-3 font-bold">Teacher</th>
                <th className="px-6 py-3 font-bold">Status</th>
                <th className="px-6 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offerings.map(o => (
                <tr key={o.offering_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{o.course_code}</div>
                    <div className="text-gray-500 text-xs">{o.course_name} ({o.credit} Cr)</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700">
                    {o.teacher_name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4">
                    {o.marks_status === 'Completed' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-100">
                        <CheckCircle className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : o.marks_status === 'In Progress' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                        <Edit3 className="w-3.5 h-3.5" /> Teacher Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-bold text-xs border border-gray-200">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/staff/marks/${semesterId}/${o.offering_id}`}>
                      {o.marks_status === 'Completed' ? (
                        <Button variant="outline" size="sm" className="gap-2 text-gray-600 border-gray-200">
                          <Eye className="w-4 h-4" /> View
                        </Button>
                      ) : o.marks_status === 'In Progress' ? (
                        <Button variant="outline" size="sm" className="gap-2 text-blue-600 border-blue-200 bg-blue-50">
                          <Edit3 className="w-4 h-4" /> Review
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="gap-2 text-brand-600 border-brand-200 bg-brand-50">
                          <Edit3 className="w-4 h-4" /> Enter Marks
                        </Button>
                      )}
                    </Link>
                  </td>
                </tr>
              ))}
              {offerings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No courses found for this semester.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exam Committee & PDF Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-brand-600"/> Exam Committee</h3>
            <p className="text-xs text-gray-500 mt-1">Configure committee for the official PDF sheet.</p>
          </div>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={downloading || pendingCount > 0 || committee.filter(c => c.member_type === 'tabulator').length === 0}
            className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
          >
            {downloading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            Generate Official Result PDF
          </Button>
        </div>

        <div className="p-6">
          <form onSubmit={handleAddMember} className="flex flex-wrap gap-3 items-end mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Type</label>
              <select value={newMember.member_type} onChange={e => setNewMember({...newMember, member_type: e.target.value, role: e.target.value === 'tabulator' ? 'Tabulator' : 'Member' })} className="border-gray-200 rounded-lg text-sm font-medium">
                <option value="committee">Committee Member</option>
                <option value="tabulator">Tabulator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Role</label>
              <input type="text" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} className="border-gray-200 rounded-lg text-sm" placeholder="Chairman/Member..." />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-gray-700 mb-1">Name</label>
              <input type="text" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="w-full border-gray-200 rounded-lg text-sm" placeholder="Full Name" required />
            </div>
            <div className="w-20">
              <label className="block text-xs font-bold text-gray-700 mb-1">SL No</label>
              <input type="number" min="1" value={newMember.sl_no} onChange={e => setNewMember({...newMember, sl_no: parseInt(e.target.value)})} className="w-full border-gray-200 rounded-lg text-sm" required />
            </div>
            <Button type="submit" className="bg-gray-800 hover:bg-gray-900 text-white mb-[1px]">
              <UserPlus className="w-4 h-4 mr-2" /> Add
            </Button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-sm text-gray-700 border-b pb-2 mb-3">Examination Committee</h4>
              <div className="space-y-2">
                {committee.filter(c => c.member_type === 'committee').map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{c.sl_no}</span>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.role}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveMember(c.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {committee.filter(c => c.member_type === 'committee').length === 0 && <p className="text-sm text-gray-400 italic">No members added.</p>}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-gray-700 border-b pb-2 mb-3">Tabulators</h4>
              <div className="space-y-2">
                {committee.filter(c => c.member_type === 'tabulator').map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{t.sl_no}</span>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.role}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveMember(t.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {committee.filter(c => c.member_type === 'tabulator').length === 0 && <p className="text-sm text-gray-400 italic">At least 1 tabulator required for PDF.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
