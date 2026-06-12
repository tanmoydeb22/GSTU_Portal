const badgeVariants = {
  default: 'bg-gray-50 text-gray-600 border-gray-200/60',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
  danger: 'bg-red-50 text-red-600 border-red-200/60',
  info: 'bg-blue-50 text-blue-600 border-blue-200/60',
  brand: 'bg-brand-50 text-brand-700 border-brand-200/60',
};

export default function Badge({ variant = 'default', children, className = '', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${badgeVariants[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${
        variant === 'success' ? 'bg-emerald-500' :
        variant === 'danger' ? 'bg-red-500' :
        variant === 'warning' ? 'bg-amber-500' :
        variant === 'info' ? 'bg-blue-500' :
        variant === 'brand' ? 'bg-brand-500' : 'bg-gray-400'
      }`} />}
      {children}
    </span>
  );
}
