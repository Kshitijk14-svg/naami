export default function OurJourneyLoading() {
  return (
    <main
      className="w-full min-h-screen pt-[var(--site-header-h)]"
      style={{ backgroundColor: "#FFF9EF" }}
    >
      <div className="px-6 md:px-12 py-16">
        <div className="h-3 w-32 bg-[#5B1C1C] opacity-20 animate-pulse rounded mb-6" />
        <div className="h-14 w-2/3 bg-black opacity-5 animate-pulse rounded" />
      </div>
      <div
        className="mx-auto max-w-4xl px-4 py-10 md:px-10 md:py-14 flex flex-col gap-16"
        style={{ backgroundColor: "#FBF3E1", borderRadius: "2px" }}
      >
        {[0, 1, 2].map((n) => (
          <div
            key={n}
            className={`flex flex-col items-center gap-5 md:gap-10 md:flex-row ${n % 2 === 1 ? "md:flex-row-reverse" : ""}`}
          >
            <div
              className="w-[190px] md:w-[240px] shrink-0 animate-pulse border-2 border-black/10 bg-[#FFF9EF] p-4"
            >
              <div className="w-full bg-[#F8F1E5]" style={{ aspectRatio: "3 / 4" }} />
            </div>
            <div className="md:flex-1 w-full">
              <div className="h-2 w-10 bg-[#5B1C1C] opacity-15 animate-pulse mb-3 mx-auto md:mx-0" />
              <div className="h-4 w-full bg-black opacity-5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
