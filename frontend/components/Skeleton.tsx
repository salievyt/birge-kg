"use client";

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="cards" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="card skeletonCard" key={i}>
          <span className="skeletonLine w30" />
          <span className="skeletonLine title" />
          <span className="skeletonLine" />
          <span className="skeletonLine w70" />
          <span className="skeletonLine w45" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="charts" aria-hidden="true">
      <div className="chartCard skeletonPanel">
        <span className="skeletonLine w40" />
        <span className="skeletonLine chartPlaceholder" />
      </div>
      <div className="chartCard skeletonPanel">
        <span className="skeletonLine w40" />
        <span className="skeletonLine w80" />
        <span className="skeletonLine w65" />
        <span className="skeletonLine w70" />
      </div>
    </div>
  );
}