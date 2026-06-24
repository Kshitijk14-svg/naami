export default function HomeLoading() {
  return (
    <div className="relative w-full min-h-screen" style={{ backgroundColor: "#F4F0E6" }}>

      {/* Hero */}
      <section className="pt-28 pb-10 px-6 md:px-12">
        <div
          className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden"
          style={{ borderLeft: "3.5px solid #8B1A1A" }}
        >
          <div className="animate-pulse w-full h-full rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
          <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 space-y-3">
            <div className="animate-pulse h-2 w-32 rounded-none" style={{ backgroundColor: "rgba(139,26,26,0.25)" }} />
            <div className="animate-pulse h-10 w-64 md:w-96 rounded-none" style={{ backgroundColor: "rgba(250,248,245,0.15)" }} />
            <div className="animate-pulse h-2 w-40 rounded-none" style={{ backgroundColor: "rgba(250,248,245,0.1)" }} />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="animate-pulse h-[6px] w-4 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
            <div className="animate-pulse h-[6px] w-6 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
          </div>
          <div className="w-full h-[1.5px]" style={{ backgroundColor: "rgba(17,17,17,0.1)" }} />
        </div>
      </section>

      {/* Collections Showcase */}
      <section className="px-6 md:px-12 py-16">
        <div className="animate-pulse h-[6px] w-28 mb-3 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
        <div className="animate-pulse h-8 w-56 mb-10 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="animate-pulse rounded-none aspect-[3/4]" style={{ backgroundColor: "#EDE8DC" }} />
          <div className="animate-pulse rounded-none aspect-[3/4]" style={{ backgroundColor: "#EDE8DC" }} />
          <div className="animate-pulse rounded-none aspect-[3/4]" style={{ backgroundColor: "#EDE8DC" }} />
        </div>
      </section>

      {/* LoomTimeline */}
      <div className="w-full animate-pulse" style={{ height: "100vh", backgroundColor: "#EDE8DC" }} />

      {/* Stitch separator */}
      <div className="w-full h-8 flex items-center justify-center" style={{ backgroundColor: "#F4F0E6" }}>
        <div className="w-full h-[1.5px]" style={{ backgroundColor: "rgba(139,26,26,0.15)" }} />
      </div>

      {/* New Arrivals Carousel */}
      <section className="py-12 px-6 md:px-12" style={{ backgroundColor: "#F4F0E6" }}>
        <div className="mb-8">
          <div className="animate-pulse h-[6px] w-36 mb-3 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
          <div className="animate-pulse h-9 w-48 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-56 md:w-64">
              <div className="animate-pulse rounded-none mb-3" style={{ aspectRatio: "3/4", backgroundColor: "#EDE8DC" }} />
              <div className="animate-pulse h-3 w-3/4 mb-2 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
              <div className="animate-pulse h-3 w-1/2 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
            </div>
          ))}
        </div>
      </section>

      {/* HotspotBanner */}
      <div className="w-full animate-pulse" style={{ height: "90vh", backgroundColor: "#EDE8DC" }} />

      {/* HotspotCards */}
      <section className="py-12 px-6 md:px-12" style={{ backgroundColor: "#F4F0E6" }}>
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-shrink-0 w-72 md:w-80">
              <div className="animate-pulse rounded-none" style={{ aspectRatio: "3/4", backgroundColor: "#EDE8DC" }} />
            </div>
          ))}
        </div>
      </section>

      {/* Stitch separator */}
      <div className="w-full h-8 flex items-center justify-center" style={{ backgroundColor: "#EDE8DC" }}>
        <div className="w-full h-[1.5px]" style={{ backgroundColor: "rgba(139,26,26,0.15)" }} />
      </div>

      {/* Bestsellers Carousel */}
      <section className="py-12 px-6 md:px-12" style={{ backgroundColor: "#EDE8DC" }}>
        <div className="mb-8">
          <div className="animate-pulse h-[6px] w-36 mb-3 rounded-none" style={{ backgroundColor: "#D8D3C7" }} />
          <div className="animate-pulse h-9 w-48 rounded-none" style={{ backgroundColor: "#D8D3C7" }} />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-56 md:w-64">
              <div className="animate-pulse rounded-none mb-3" style={{ aspectRatio: "3/4", backgroundColor: "#D8D3C7" }} />
              <div className="animate-pulse h-3 w-3/4 mb-2 rounded-none" style={{ backgroundColor: "#D8D3C7" }} />
              <div className="animate-pulse h-3 w-1/2 rounded-none" style={{ backgroundColor: "#D8D3C7" }} />
            </div>
          ))}
        </div>
      </section>

      {/* Manifesto Split */}
      <section
        className="px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8"
        style={{ backgroundColor: "#F4F0E6" }}
      >
        <div className="md:col-span-6">
          <div
            className="animate-pulse rounded-none w-full"
            style={{ aspectRatio: "3/4", backgroundColor: "#EDE8DC", borderLeft: "3px solid #8B1A1A" }}
          />
        </div>
        <div className="md:col-span-5 md:col-start-8 flex flex-col gap-5 justify-center">
          <div className="animate-pulse h-[6px] w-24 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
          <div className="space-y-3">
            <div className="animate-pulse h-7 w-full rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
            <div className="animate-pulse h-7 w-full rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
            <div className="animate-pulse h-7 w-4/5 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
          </div>
          <div className="animate-pulse h-[6px] w-32 mt-2 rounded-none" style={{ backgroundColor: "#EDE8DC" }} />
          <div className="mt-6 h-[1px]" style={{ background: "linear-gradient(to right, #8B1A1A 2px, rgba(17,17,17,0.08) 2px, transparent)" }} />
        </div>
      </section>

      {/* Footer placeholder */}
      <div className="w-full" style={{ minHeight: 160, backgroundColor: "#111111" }} />
    </div>
  );
}
