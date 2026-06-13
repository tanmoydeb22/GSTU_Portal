import { useState, useEffect } from 'react';
import { getCourses, createCourse, updateCourse, deleteCourse, getDepartments } from '../../api/staff.api';
import useAuthStore from '../../store/useAuthStore';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Plus, Edit2, Trash2, BookOpen, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  const user = useAuthStore(state => state.user);
  
  const [form, setForm] = useState({ course_code:'', course_name:'', credit:3, offered_level:1, offered_term:1, course_type:'Theory', description:'', dept_id: user?.dept_id || '' });

  const load = () => {
    setLoading(true);
    getCourses({ all: 'true', includeViva: 'true' })
      .then(r => setCourses(r.data.data))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getDepartments().then(r => setDepartments(r.data.data)).catch(console.error);
  }, []);

  const typeColors = { Theory:'brand', Lab:'info', Project:'warning', Thesis:'danger', Viva:'default' };

  // Grouping logic
  const groupedCourses = courses.reduce((acc, course) => {
    const key = `L${course.offered_level}T${course.offered_term}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(course);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateCourse(editing.course_id, form);
        toast.success('Course updated successfully');
      } else {
        await createCourse(form);
        toast.success('Course created successfully');
      }
      setModal(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteCourse(id);
      toast.success('Course deleted');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">Course List</h1>
          <p className="text-gray-500 text-xs md:text-sm">Manage departmental courses organized by level and term</p>
        </div>
        <Button onClick={() => { 
          setEditing(null); 
          setForm({ course_code:'', course_name:'', credit:3, offered_level:1, offered_term:1, course_type:'Theory', description:'', dept_id: user?.dept_id || '' }); 
          setModal(true); 
        }} className="w-full sm:w-auto justify-center">
          <Plus className="h-4 w-4 mr-2" /> Add Course
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-12">
          {[1, 2, 3, 4].map(level => (
            <div key={level} className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                <Layers className="h-5 w-5 text-brand-600" />
                <h2 className="text-xl font-display font-bold text-gray-900">Level {level}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2].map(term => {
                  const key = `L${level}T${term}`;
                  const termCourses = groupedCourses[key] || [];
                  
                  return (
                    <div key={term} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                      <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-brand-500" />
                          Term {term}
                        </h3>
                        <Badge variant="default" className="text-[10px] uppercase">{termCourses.length} Courses</Badge>
                      </div>
                      
                      <div className="p-4 space-y-3 flex-1">
                        {termCourses.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm italic">
                            No courses added yet
                          </div>
                        ) : (
                          termCourses.map(course => (
                            <div key={course.course_id} className="group p-3 rounded-xl border border-gray-50 hover:border-brand-100 hover:bg-brand-50/30 transition-all duration-200 flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                                    {course.course_code}
                                  </span>
                                  <Badge variant={typeColors[course.course_type] || 'default'} className="text-[9px] h-4">
                                    {course.course_type}
                                  </Badge>
                                </div>
                                <p className="text-sm font-semibold text-gray-800 line-clamp-1">{course.course_name}</p>
                                <p className="text-[11px] text-gray-500 font-medium">Credits: {course.credit}</p>
                              </div>
                              
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => { setEditing(course); setForm(course); setModal(true); }}
                                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-white rounded-lg transition-colors"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(course.course_id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Course' : 'Add New Course'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Course Code" value={form.course_code} onChange={e => setForm({...form, course_code: e.target.value})} placeholder="e.g. CSE-1101" required />
            <Input label="Course Name" value={form.course_name} onChange={e => setForm({...form, course_name: e.target.value})} placeholder="e.g. Structured Programming" required />
            <Input label="Credit" type="number" step="0.25" min="0.25" max="10" value={form.credit} onChange={e => setForm({...form, credit: parseFloat(e.target.value)})} required />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
              <select value={form.course_type} onChange={e => setForm({...form, course_type: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {['Theory','Lab','Project','Thesis','Viva'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Level</label>
              <select value={form.offered_level} onChange={e => setForm({...form, offered_level: parseInt(e.target.value)})} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Term</label>
              <select value={form.offered_term} onChange={e => setForm({...form, offered_term: parseInt(e.target.value)})} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {[1,2].map(t => <option key={t} value={t}>Term {t}</option>)}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
            <select value={form.dept_id} onChange={e => setForm({...form, dept_id: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name} ({d.dept_code})</option>)}
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update Course' : 'Create Course'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
