import React from 'react';

// Reusable skeleton component
export const Skeleton = ({ className = "" }) => (
  <div className={`skeleton ${className}`} />
);

// Dashboard skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6 p-6 animate-pulse">
    {/* Stat cards */}
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <Skeleton className="h-8 w-8 rounded-lg mb-3" />
          <Skeleton className="h-7 w-16 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
    {/* Content */}
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Course card skeleton
export const CourseCardSkeleton = () => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <div className="flex justify-between mb-3">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <Skeleton className="h-4 w-3/4 mb-2" />
    <Skeleton className="h-4 w-1/2 mb-4" />
    <div className="flex gap-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
    </div>
  </div>
);

export default Skeleton;
