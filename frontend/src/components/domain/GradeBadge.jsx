const gradeColors = {
  'A+': 'bg-emerald-100 text-emerald-800 font-bold',
  'A': 'bg-emerald-100 text-emerald-700',
  'A-': 'bg-green-100 text-green-700',
  'B+': 'bg-lime-100 text-lime-700',
  'B': 'bg-yellow-100 text-yellow-700',
  'B-': 'bg-yellow-100 text-yellow-600',
  'C+': 'bg-orange-100 text-orange-700',
  'C': 'bg-orange-100 text-orange-600',
  'D': 'bg-red-100 text-red-600',
  'F': 'bg-red-200 text-red-800 font-bold',
};

export default function GradeBadge({ grade }) {
  if (!grade) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Pending</span>;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gradeColors[grade] || 'bg-gray-100 text-gray-600'}`}>
      {grade}
    </span>
  );
}
