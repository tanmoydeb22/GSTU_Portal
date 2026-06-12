import { useState, useEffect } from 'react';
import { getGradingScale, updateGradingScale, getMarksConfig, updateMarksConfig } from '../../api/admin.api';
import toast from 'react-hot-toast';
import { Save, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('grading'); // grading or marks
  const [loading, setLoading] = useState(true);

  const [gradingScale, setGradingScale] = useState([]);
  const [marksConfig, setMarksConfig] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resGrading, resMarks] = await Promise.all([
        getGradingScale(),
        getMarksConfig()
      ]);
      setGradingScale(resGrading.data.data);
      setMarksConfig(resMarks.data.data);
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // --- Grading Scale Logic ---
  const handleGradingChange = (index, field, value) => {
    const updated = [...gradingScale];
    updated[index][field] = value;
    setGradingScale(updated);
  };

  const addGradingRow = () => {
    setGradingScale([...gradingScale, { grade_letter: '', grade_point: 0, min_marks: 0, max_marks: 0 }]);
  };

  const removeGradingRow = (index) => {
    const updated = [...gradingScale];
    updated.splice(index, 1);
    setGradingScale(updated);
  };

  const saveGradingScale = async () => {
    // Basic validation
    let valid = true;
    for (let i = 0; i < gradingScale.length; i++) {
      const g = gradingScale[i];
      if (!g.grade_letter || g.grade_point === '' || g.min_marks === '' || g.max_marks === '') {
        valid = false;
        break;
      }
    }
    if (!valid) return toast.error('All fields must be filled');

    try {
      await updateGradingScale(gradingScale);
      toast.success('Grading scale saved successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save grading scale');
    }
  };

  // --- Marks Config Logic ---
  const handleMarksChange = (index, field, value) => {
    const updated = [...marksConfig];
    updated[index][field] = value;
    setMarksConfig(updated);
  };

  const saveMarksConfig = async () => {
    try {
      await updateMarksConfig(marksConfig);
      toast.success('Marks configuration saved successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks configuration');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500">Configure global grading rules and marks distribution.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('grading')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'grading' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Grading Scale
        </button>
        <button
          onClick={() => setActiveTab('marks')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'marks' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Marks Distribution
        </button>
      </div>

      {activeTab === 'grading' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-900">Grading Scale Config</h2>
              <p className="text-xs text-gray-500">Ensure there are no overlaps or gaps in min/max marks.</p>
            </div>
            <Button onClick={addGradingRow} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Add Row
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-bold">Grade Letter</th>
                  <th className="px-4 py-3 font-bold">Grade Point</th>
                  <th className="px-4 py-3 font-bold">Min Marks</th>
                  <th className="px-4 py-3 font-bold">Max Marks</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gradingScale.map((g, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2">
                      <input type="text" value={g.grade_letter} onChange={e => handleGradingChange(idx, 'grade_letter', e.target.value)} className="w-full px-2 py-1.5 rounded border border-gray-300 font-mono focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={g.grade_point} onChange={e => handleGradingChange(idx, 'grade_point', parseFloat(e.target.value))} className="w-full px-2 py-1.5 rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={g.min_marks} onChange={e => handleGradingChange(idx, 'min_marks', parseFloat(e.target.value))} className="w-full px-2 py-1.5 rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={g.max_marks} onChange={e => handleGradingChange(idx, 'max_marks', parseFloat(e.target.value))} className="w-full px-2 py-1.5 rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => removeGradingRow(idx)} className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <Button onClick={saveGradingScale} className="gap-2 shadow-md">
              <Save className="w-4 h-4" /> Save Grading Scale
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'marks' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900">Course Marks Distribution</h2>
            <p className="text-xs text-gray-500">Configure maximum marks for components based on Course Type. Ensure Total adds up to 100.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-bold">Course Type</th>
                  <th className="px-4 py-3 font-bold">Attendance (Max)</th>
                  <th className="px-4 py-3 font-bold">Assignment (Max)</th>
                  <th className="px-4 py-3 font-bold">Mid Exam (Max)</th>
                  <th className="px-4 py-3 font-bold">Final Exam (Max)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {marksConfig.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {c.course_type}
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={c.attendance_max} onChange={e => handleMarksChange(idx, 'attendance_max', parseFloat(e.target.value))} className="w-24 px-2 py-1.5 rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={c.assignment_max} onChange={e => handleMarksChange(idx, 'assignment_max', parseFloat(e.target.value))} className="w-24 px-2 py-1.5 rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={c.mid_max} onChange={e => handleMarksChange(idx, 'mid_max', parseFloat(e.target.value))} className="w-24 px-2 py-1.5 rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={c.final_max} onChange={e => handleMarksChange(idx, 'final_max', parseFloat(e.target.value))} className="w-24 px-2 py-1.5 rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <Button onClick={saveMarksConfig} className="gap-2 shadow-md">
              <Save className="w-4 h-4" /> Save Marks Config
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
