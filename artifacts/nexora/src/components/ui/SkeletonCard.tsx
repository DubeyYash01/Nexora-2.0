export default function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "#12121A", border: "1px solid #2A2A3E" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg shimmer flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 rounded shimmer w-3/4" />
          <div className="h-3 rounded shimmer w-1/2" />
        </div>
      </div>
      <div className="h-3 rounded shimmer w-full" />
      <div className="h-3 rounded shimmer w-5/6" />
      <div className="flex gap-2 mt-2">
        <div className="h-6 rounded-full shimmer w-16" />
        <div className="h-6 rounded-full shimmer w-20" />
      </div>
      <style>{`
        .shimmer {
          background: linear-gradient(90deg, #1A1A2E 25%, #2A2A3E 50%, #1A1A2E 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
