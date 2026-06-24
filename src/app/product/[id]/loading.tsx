export default function ProductLoading() {
  return (
    <div
      className="min-h-screen flex flex-col md:flex-row gap-12 md:gap-16 px-6 md:px-12 py-12 pt-20 md:pt-28"
      style={{ backgroundColor: "#F4F0E6" }}
    >
      {/* Left column — image */}
      <div className="w-full md:w-1/2 flex-shrink-0">
        <div
          className="relative w-full aspect-[3/4] animate-pulse rounded-none"
          style={{ backgroundColor: "#EDE8DC", borderLeft: "3px solid #8B1A1A" }}
        />
      </div>

      {/* Right column — product details */}
      <div className="w-full md:w-1/2 flex flex-col gap-6 pt-4">
        {/* Label */}
        <div className="animate-pulse rounded-none h-3 w-32" style={{ backgroundColor: "#EDE8DC" }} />

        {/* Heading */}
        <div className="space-y-2">
          <div className="animate-pulse rounded-none h-10 w-full" style={{ backgroundColor: "#EDE8DC" }} />
          <div className="animate-pulse rounded-none h-10 w-2/3" style={{ backgroundColor: "#EDE8DC" }} />
        </div>

        {/* Subtitle */}
        <div className="animate-pulse rounded-none h-4 w-48" style={{ backgroundColor: "#EDE8DC" }} />

        {/* Spec rows */}
        <div className="space-y-4 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-3" style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
              <div className="animate-pulse rounded-none h-3 w-28" style={{ backgroundColor: "#EDE8DC" }} />
              <div className="animate-pulse rounded-none h-3 w-36" style={{ backgroundColor: "#EDE8DC" }} />
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="animate-pulse rounded-none h-10 w-40 mt-2" style={{ backgroundColor: "#EDE8DC" }} />

        {/* CTA button */}
        <div className="animate-pulse rounded-none h-14 w-full" style={{ backgroundColor: "#8B1A1A", opacity: 0.2 }} />
      </div>
    </div>
  );
}
