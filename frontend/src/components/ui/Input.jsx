import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, icon: Icon, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">{label}</label>}
    <div className="relative group">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Icon className="h-4 w-4 text-gray-400 transition-colors group-focus-within:text-brand-500" />
        </div>
      )}
      <input
        ref={ref}
        className={`w-full rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 ${
          error ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500' : 'border-gray-200/80 hover:border-gray-300 focus:bg-brand-50/20'
        } ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 text-sm bg-white placeholder:text-gray-400 ${className}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;
