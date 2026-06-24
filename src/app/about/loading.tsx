export default function AboutLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F0E6" }}>
      {/* Hero section */}
      <div className="pt-36 pb-16 px-8 md:px-12">
        <div className="animate-pulse rounded-none h-2 w-24 mb-8" style={{ backgroundColor: "#EDE8DC" }} />
        <div className="space-y-3">
          <div className="animate-pulse rounded-none h-16 w-full" style={{ backgroundColor: "#EDE8DC" }} />
          <div className="animate-pulse rounded-none h-16 w-3/4" style={{ backgroundColor: "#EDE8DC" }} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "rgba(17,17,17,0.06)" }} />

      {/* Brand story split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 py-20 px-8 md:px-12">
        {/* Left image */}
        <div className="md:col-span-5">
          <div
            className="animate-pulse rounded-none w-full aspect-[4/5]"
            style={{ backgroundColor: "#EDE8DC" }}
          />
        </div>

        {/* Right text */}
        <div className="md:col-span-6 md:col-start-7 flex flex-col gap-5 justify-center">
          <div className="animate-pulse rounded-none h-2 w-24" style={{ backgroundColor: "#EDE8DC" }} />
          <div className="space-y-3">
            <div className="animate-pulse rounded-none h-5 w-full" style={{ backgroundColor: "#EDE8DC" }} />
            <div className="animate-pulse rounded-none h-5 w-full" style={{ backgroundColor: "#EDE8DC" }} />
            <div className="animate-pulse rounded-none h-5 w-4/5" style={{ backgroundColor: "#EDE8DC" }} />
          </div>
          <div className="space-y-3 mt-4">
            <div className="animate-pulse rounded-none h-5 w-full" style={{ backgroundColor: "#EDE8DC" }} />
            <div className="animate-pulse rounded-none h-5 w-full" style={{ backgroundColor: "#EDE8DC" }} />
            <div className="animate-pulse rounded-none h-5 w-2/3" style={{ backgroundColor: "#EDE8DC" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
