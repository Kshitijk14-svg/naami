export default function JournalPostLoading() {
  return (
    <main className="w-full min-h-screen pt-20" style={{ backgroundColor: "#F4F0E6" }}>
      <div className="w-full animate-pulse bg-[#EDE8DC]" style={{ height: "clamp(280px, 50vh, 520px)" }} />
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-14">
        <div className="h-3 w-20 bg-[#8B1A1A] opacity-20 animate-pulse rounded mb-8" />
        <div className="h-12 w-3/4 bg-black opacity-5 animate-pulse rounded mb-4" />
        <div className="h-12 w-1/2 bg-black opacity-5 animate-pulse rounded" />
      </div>
    </main>
  );
}
