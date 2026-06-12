import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublishedSemesters } from '../../api/student.api';
import toast from 'react-hot-toast';
import { FileBarChart, CheckCircle, Lock } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function ResultBoardSelection() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedSemesters()
      .then(res => setSemesters(res.data.data))
      .catch(() => toast.error('Failed to load published semesters'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  const termNames = ['First', 'Second', 'Third', 'Fourth'];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto px-4 pb-20">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
          <FileBarChart className="w-7 h-7 text-brand-600" />
          Public Result Board
        </h1>
        <p className="text-gray-600 font-medium mt-1">
          View official result sheets for published semesters.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <h3 className="font-bold text-gray-900">📋 Published Results</h3>
        </div>
        
        {semesters.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <Lock className="w-12 h-12 text-gray-300 mb-3" />
            <p>No results have been published for your department yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {semesters.map((s) => (
              <div key={s.semester_id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">
                      L{s.level} T{s.term} — {s.academic_year}
                    </h4>
                    <p className="text-sm text-gray-500 font-medium">
                      {termNames[s.level - 1] || `Level ${s.level}`} Year, Semester-{s.term}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Published on {new Date(s.result_published_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <Link to={`/student/results/individual/${s.semester_id}`}>
                  <Button variant="outline" className="w-full sm:w-auto border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100">
                    View Result
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
