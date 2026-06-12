import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { resetPasswordApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const pw = watch('password', '');

  const checks = [
    { label: '8+ characters', met: pw.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'Number', met: /\d/.test(pw) },
    { label: 'Special character', met: /[!@#$%^&*]/.test(pw) },
  ];

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await resetPasswordApi(params.get('token'), data.password);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-brand-100 p-6 animate-fade-in">
      <h2 className="text-xl font-display font-bold text-gray-900 mb-1">Set New Password</h2>
      <p className="text-sm text-gray-500 mb-5">Create a strong password for your account.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
          <input type="password" {...register('password')} placeholder="Enter new password"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {checks.map(c => (
            <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.met ? 'text-green-600' : 'text-gray-400'}`}>
              {c.met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {c.label}
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
          <input type="password" {...register('confirmPassword')} placeholder="Confirm new password"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">Reset Password</Button>
      </form>
    </div>
  );
}
