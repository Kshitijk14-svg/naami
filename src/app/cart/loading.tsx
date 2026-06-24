export default function CartLoading() {
  return (
    <main
      className="w-full min-h-screen flex items-center justify-center pt-20"
      style={{ backgroundColor: "#F4F0E6" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-[3px] h-10 bg-[#8B1A1A] opacity-60 animate-pulse" />
        <p className="font-sans font-bold uppercase tracking-[0.28em]" style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}>
          Loading Cart…
        </p>
      </div>
    </main>
  );
}
