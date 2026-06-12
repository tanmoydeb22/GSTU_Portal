import { forwardRef } from 'react';
import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-sm hover:shadow-brand-glow',
  secondary: 'bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/60',
  danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-sm hover:shadow-red-500/25',
  outline: 'border-2 border-brand-500/30 text-brand-600 hover:bg-brand-50 hover:border-brand-500/50',
  ghost: 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = forwardRef(({ variant = 'primary', size = 'md', className = '', children, disabled, loading, ...props }, ref) => (
  <motion.button
    ref={ref}
    disabled={disabled || loading}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.95 }}
    className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  >
    {loading && (
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )}
    {children}
  </motion.button>
));

Button.displayName = 'Button';
export default Button;
