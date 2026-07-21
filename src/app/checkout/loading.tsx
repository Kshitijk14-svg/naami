export default function CheckoutLoading() {
  return (
    <main
      className="w-full min-h-screen flex items-center justify-center pt-[var(--site-header-h)]"
      style={{ backgroundColor: "#FFF9EF" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-[3px] h-10 bg-[#5B1C1C] opacity-60 animate-pulse" />
        <p className="font-sans font-bold uppercase tracking-[0.28em]" style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}>
          Loading Checkout…
        </p>
      </div>
    </main>
  );
}
