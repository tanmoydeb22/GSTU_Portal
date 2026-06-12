const statusColors = {
  'Registered': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
  'Dropped': 'bg-red-100 text-red-700',
  'Active': 'bg-green-100 text-green-800',
  'Closed': 'bg-gray-100 text-gray-600',
  'Draft': 'bg-gray-100 text-gray-500',
  'On Leave': 'bg-amber-100 text-amber-800 border border-amber-200/50',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />}
      {status === 'On Leave' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />}
      {status}
    </span>
  );
}
