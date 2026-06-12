import { useState, useEffect } from 'react';
import { getDepartments, createDepartment } from '../../api/admin.api';
import { Building2, Plus, Search } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ dept_code: '', dept_name: '' });

  const load = () => {
    getDepartments()
      .then(r => {
        const sorted = r.data.data.sort((a,b) => a.dept_id - b.dept_id);
        setDepartments(sorted);
        setFilteredDepartments(sorted);
      })
      .catch(() => toast.error('Failed to load departments'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Filter functionality
  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredDepartments(
      departments.filter(d => 
        d.dept_code.toLowerCase().includes(q) || 
        d.dept_name.toLowerCase().includes(q)
      )
    );
  }, [search, departments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createDepartment(form);
      toast.success('Department created successfully');
      setModal(false);
      setForm({ dept_code: '', dept_name: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create department');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-600" />
            Departments ({filteredDepartments.length})
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage academic departments across the university.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search departments..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
            />
          </div>
          <Button onClick={() => { setForm({ dept_code: '', dept_name: '' }); setModal(true); }} className="justify-center">
            <Plus className="h-4 w-4 mr-2" /> Add Department
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
        ) : filteredDepartments.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No departments found matching your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-32">Students</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-32">Teachers</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDepartments.map((d) => (
                  <tr key={d.dept_id} className="hover:bg-brand-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-brand-50 text-brand-700 font-bold text-xs border border-brand-100">
                        {d.dept_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{d.dept_name}</td>
                    <td className="px-6 py-4 text-center font-mono text-gray-600">{d.student_count}</td>
                    <td className="px-6 py-4 text-center font-mono text-gray-600">{d.teacher_count}</td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/admin/departments/${d.dept_id}`}
                        className="inline-flex items-center justify-center px-4 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 hover:text-brand-600 transition-colors shadow-sm"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Department">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Department Code" 
            value={form.dept_code} 
            onChange={e => setForm({ ...form, dept_code: e.target.value })} 
            placeholder="e.g. CSE" 
            required 
          />
          <Input 
            label="Department Name" 
            value={form.dept_name} 
            onChange={e => setForm({ ...form, dept_name: e.target.value })} 
            placeholder="e.g. Computer Science and Engineering" 
            required 
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Create Department</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
