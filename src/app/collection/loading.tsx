export default function CollectionLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F0E6" }}>
      {/* Header bar */}
      <div className="h-28 px-8 md:px-12 flex items-end pb-6">
        <div className="animate-pulse rounded-none h-8 w-48" style={{ backgroundColor: "#EDE8DC" }} />
      </div>

      {/* Filter pills */}
      <div className="px-8 md:px-12 flex gap-3 pb-8">
        {[72, 56, 80, 96].map((w, i) => (
          <div
            key={i}
            className="animate-pulse rounded-none h-8"
            style={{ backgroundColor: "#EDE8DC", width: w }}
          />
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 px-8 md:px-12 pb-20">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div
              className="animate-pulse rounded-none w-full aspect-[3/4]"
              style={{ backgroundColor: "#EDE8DC" }}
            />
            <div className="mt-3 space-y-2">
              <div className="animate-pulse rounded-none h-3 w-3/4" style={{ backgroundColor: "#EDE8DC" }} />
              <div className="animate-pulse rounded-none h-3 w-1/2" style={{ backgroundColor: "#EDE8DC" }} />
              <div className="animate-pulse rounded-none h-4 w-1/3" style={{ backgroundColor: "#EDE8DC" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
