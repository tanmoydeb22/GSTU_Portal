export default function Card({ title, icon: Icon, children, className = '', action, variant = 'default' }) {
  const base = variant === 'glass'
    ? 'glass-card rounded-2xl'
    : 'bg-white rounded-2xl border border-gray-100/80 shadow-card hover:shadow-card-hover';

  return (
    <div className={`${base} transition-all duration-300 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-1.5 rounded-lg bg-brand-50">
                <Icon className="h-4 w-4 text-brand-600" />
              </div>
            )}
            {title && <h3 className="font-display font-semibold text-gray-900 text-[15px]">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
