import React from 'react';

export const DashboardSkeleton = () => (
  <div className="space-y-6 w-full animate-fade-in">
    {/* Hero Card */}
    <div className="skeleton h-40 md:h-32 w-full rounded-3xl" />
    
    {/* Active Semester / Status */}
    <div className="skeleton h-20 w-full rounded-xl" />
    
    {/* Grid Content */}
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="skeleton h-[400px] w-full rounded-xl" />
      <div className="skeleton h-[400px] w-full rounded-xl" />
    </div>
  </div>
);

export const CourseCardSkeleton = () => (
  <div className="border border-gray-100 bg-white rounded-xl p-5 space-y-4 shadow-sm w-full animate-fade-in">
    <div className="flex justify-between items-start gap-4">
      <div className="space-y-2 flex-1">
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
      </div>
      <div className="skeleton h-8 w-16 rounded-full shrink-0" />
    </div>
    <div className="space-y-2 pt-2 border-t border-gray-50">
      <div className="skeleton h-3 w-1/3 rounded" />
      <div className="skeleton h-3 w-1/4 rounded" />
    </div>
    <div className="flex justify-end pt-2">
      <div className="skeleton h-9 w-24 rounded-lg" />
    </div>
  </div>
);

export const TranscriptSkeleton = () => (
  <div className="space-y-8 w-full animate-fade-in">
    {/* Header */}
    <div className="skeleton h-16 w-full rounded-xl" />
    
    {/* Semesters */}
    <div className="space-y-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
          {/* Semester Header */}
          <div className="skeleton h-14 w-full rounded-none" />
          {/* Table Rows */}
          <div className="p-0">
            <table className="w-full">
              <tbody>
                {[...Array(4)].map((_, j) => (
                  <tr key={j} className="border-t border-gray-50">
                    <td className="px-6 py-4 w-1/4"><div className="skeleton h-4 w-full rounded" /></td>
                    <td className="px-6 py-4 w-1/2"><div className="skeleton h-4 w-full rounded" /></td>
                    <td className="px-6 py-4 w-1/4"><div className="skeleton h-4 w-full rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const PaymentSkeleton = () => (
  <div className="space-y-6 w-full animate-fade-in">
    <div className="skeleton h-32 w-full rounded-xl" />
    <div className="grid md:grid-cols-2 gap-6">
      <div className="skeleton h-[300px] w-full rounded-xl" />
      <div className="skeleton h-[300px] w-full rounded-xl" />
    </div>
  </div>
);

export const NotificationSkeleton = () => (
  <div className="flex gap-4 p-4 border-b border-gray-50 w-full animate-fade-in">
    <div className="skeleton h-10 w-10 rounded-full shrink-0" />
    <div className="space-y-2 flex-1">
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="space-y-6 max-w-5xl mx-auto w-full animate-fade-in">
    {/* Cover & Avatar */}
    <div className="relative mb-20">
      <div className="skeleton h-48 w-full rounded-2xl" />
      <div className="absolute -bottom-16 left-8">
        <div className="skeleton h-32 w-32 rounded-full border-4 border-white bg-white shadow-sm" />
      </div>
    </div>
    
    {/* Name & Title */}
    <div className="space-y-3 px-8">
      <div className="skeleton h-8 w-1/3 rounded" />
      <div className="skeleton h-4 w-1/4 rounded" />
    </div>
    
    {/* Content Grid */}
    <div className="grid md:grid-cols-3 gap-6 px-8 mt-8">
      <div className="skeleton h-[400px] w-full rounded-xl md:col-span-1" />
      <div className="skeleton h-[400px] w-full rounded-xl md:col-span-2" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ rows = 5, cols = 4 }) => (
  <>
    {[...Array(rows)].map((_, i) => (
      <tr key={i} className="animate-fade-in">
        {[...Array(cols)].map((_, j) => (
          <td key={j} className="px-6 py-4">
            <div className="skeleton h-4 w-full rounded" />
          </td>
        ))}
      </tr>
    ))}
  </>
);
