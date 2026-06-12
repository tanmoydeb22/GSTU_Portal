import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Building2, User, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const schema = z.object({
  identifier: z.string().min(1, 'This field is required'),
  password: z.string().min(1, 'Password is required'),
});

const roles = [
  { value: 'admin', label: 'Admin', icon: User, placeholder: 'Email address' },
  { value: 'dept_staff', label: 'Section Officer', icon: Building2, placeholder: 'Dept Code' },
  { value: 'teacher', label: 'Teacher', icon: User, placeholder: 'Teacher ID' },
  { value: 'student', label: 'Student', icon: GraduationCap, placeholder: 'Student ID' },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, role } = useAuthStore();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const currentRole = roles.find((r) => r.value === selectedRole);

  if (isAuthenticated && role) {
    const dashMap = { admin: '/admin/dashboard', dept_staff: '/staff/dashboard', teacher: '/teacher/dashboard', student: '/student/dashboard' };
    return <Navigate to={dashMap[role] || '/login'} replace />;
  }

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      const result = await login(formData.identifier, formData.password, selectedRole);
      toast.success(`Welcome, ${result.user.name}!`);

      if (result.user.must_change_password === 1 || result.user.must_change_password === true) {
        navigate('/change-password');
      } else {
        const dashMap = { admin: '/admin/dashboard', dept_staff: '/staff/dashboard', teacher: '/teacher/dashboard', student: '/student/dashboard' };
        navigate(dashMap[selectedRole]);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/85 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl overflow-hidden animate-fade-in">
      {/* Role Tabs — Segmented Control */}
      <div className="p-1.5 bg-gray-400/10 mx-3 mt-3 mb-0 rounded-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          {roles.map((role) => (
            <button key={role.value} onClick={() => { setSelectedRole(role.value); setValue('identifier', ''); setValue('password', ''); }}
              className={`relative py-2 text-[11px] font-bold rounded-xl transition-all duration-200 ${
                selectedRole === role.value
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
              }`}>
              <role.icon className="h-4 w-4 mx-auto mb-1 opacity-80" />
              {role.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-5 space-y-4">
        <div className="text-center sm:text-left">
          <h2 className="text-xl md:text-2xl font-display font-extrabold text-gray-900 tracking-tight">Sign In</h2>
        </div>

        <Input
          label={selectedRole === 'admin' ? 'Email' : selectedRole === 'dept_staff' ? 'Dept Code' : selectedRole === 'teacher' ? 'Teacher ID' : 'Student ID'}
          placeholder={currentRole.placeholder}
          icon={selectedRole === 'admin' ? Mail : currentRole.icon}
          error={errors.identifier?.message}
          {...register('identifier')}
        />

        <div>
          <label className="block text-[11px] font-bold text-gray-700 mb-1 tracking-wide uppercase">Password</label>
          <div className="relative group">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              className={`w-full rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 ${
                errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
              } pr-10 text-gray-900 placeholder:text-gray-400`}
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.password.message}</p>}
        </div>

        <div className="flex justify-end pt-0.5">
          <a href="/forgot-password" className="text-xs text-brand-600 hover:text-brand-800 font-semibold hover:underline underline-offset-2 transition-colors">
            Forgot Password?
          </a>
        </div>

        <Button type="submit" loading={loading} className="w-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300" size="lg">
          Sign In
        </Button>
      </form>
    </div>
  );
}
