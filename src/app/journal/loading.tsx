export default function JournalLoading() {
  return (
    <main
      className="w-full min-h-screen pt-20"
      style={{ backgroundColor: "#F4F0E6" }}
    >
      <div className="px-6 md:px-12 py-16">
        <div className="h-3 w-32 bg-[#8B1A1A] opacity-20 animate-pulse rounded mb-6" />
        <div className="h-14 w-3/4 bg-black opacity-5 animate-pulse rounded mb-4" />
        <div className="h-14 w-1/2 bg-black opacity-5 animate-pulse rounded" />
      </div>
      <div className="px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <div className="w-full animate-pulse bg-[#EDE8DC]" style={{ aspectRatio: "4/3" }} />
            <div className="h-3 w-1/3 bg-black opacity-5 animate-pulse mt-5 mb-3" />
            <div className="h-5 w-full bg-black opacity-5 animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
