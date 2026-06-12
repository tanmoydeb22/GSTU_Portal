export default function CreditTracker({ creditSummary }) {
  if (!creditSummary) return null;
  const { fixed_credit, max_credit, extra_allowed, extra_used, extra_remaining } = creditSummary;
  const total_used = parseFloat((fixed_credit + extra_used).toFixed(1));
  const total_allowed = parseFloat((fixed_credit + extra_allowed).toFixed(1));
  const max_limit = max_credit || total_allowed; // fallback

  const usedPct = max_limit > 0 ? (total_used / max_limit) * 100 : 0;
  const fixedPct = max_limit > 0 ? (fixed_credit / max_limit) * 100 : 0;
  const extraPct = max_limit > 0 ? (extra_used / max_limit) * 100 : 0;

  const isApproachingMax = usedPct >= 90;

  return (
    <div className="bg-white rounded-xl">
      <div className="flex justify-between items-end mb-2">
        <div className="text-sm font-bold text-gray-900">
          Credits: <span className="font-mono">{total_used.toFixed(1)} / {max_limit.toFixed(1)}</span> used
        </div>
        <div className="text-sm font-medium text-brand-700">
          Extra slots: <span className="font-mono font-bold">{extra_remaining.toFixed(1)}</span> left
        </div>
      </div>

      <div className="relative h-4 rounded-full bg-gray-100 overflow-hidden mb-2">
        {/* Fixed Portion */}
        <div 
          className="absolute top-0 left-0 h-full bg-brand-500 transition-all duration-500" 
          style={{ width: `${fixedPct}%` }} 
          title={`Mandatory: ${fixed_credit}`} 
        />
        {/* Extra Portion */}
        {extra_used > 0 && (
          <div 
            className={`absolute top-0 h-full transition-all duration-500 ${isApproachingMax ? 'bg-red-500' : 'bg-amber-400'}`} 
            style={{ left: `${fixedPct}%`, width: `${extraPct}%` }} 
            title={`Extra used: ${extra_used}`} 
          />
        )}
        <div className="absolute inset-0 flex items-center justify-end pr-2">
          <span className="text-[10px] font-bold text-gray-600 mix-blend-color-burn">{Math.round(usedPct)}%</span>
        </div>
      </div>

      <div className="flex divide-x divide-gray-200 text-xs font-medium text-gray-500">
        <div className="pr-4">
          Mandatory: <span className="font-mono text-gray-900">{fixed_credit.toFixed(1)}</span>
        </div>
        <div className="pl-4">
          Retake/Improve used: <span className="font-mono text-gray-900">{extra_used.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
