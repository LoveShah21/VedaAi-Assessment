import React from "react";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse font-sans">
      {/* Banner Skeleton */}
      <div className="h-32 bg-gray-200 rounded-2xl w-full" />
      
      {/* KPI Row Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-28 bg-gray-200 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GroupsSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse font-sans">
      <div className="flex justify-between items-center">
        <div className="space-y-2 w-1/3">
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="h-10 bg-gray-200 rounded-lg w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse font-sans">
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>

      <div className="h-10 bg-gray-200 rounded-lg w-1/2" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse font-sans">
      <div className="h-10 bg-gray-200 rounded-lg w-1/3" />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded-lg" />
          ))}
        </div>
        
        <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded-lg" />
            <div className="h-12 bg-gray-200 rounded-lg" />
            <div className="h-12 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step2SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-10 bg-gray-250 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-250 rounded-lg" />
        </div>
        <div className="h-16 bg-gray-250 rounded-xl" />
      </div>
      <div className="space-y-4 p-4 border border-gray-150 rounded-xl">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="space-y-4">
          <div className="h-8 bg-gray-250 rounded" />
          <div className="h-8 bg-gray-250 rounded" />
          <div className="h-8 bg-gray-250 rounded" />
        </div>
      </div>
    </div>
  );
}
