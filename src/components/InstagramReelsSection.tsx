interface ReelCard {
  thumbnailUrl: string;
  authorName: string;
  title: string;
  permalink: string;
}

interface InstagramReelsSectionProps {
  kicker: string;
  title: string;
  reels: ReelCard[];
}

export default function InstagramReelsSection({ kicker, title, reels }: InstagramReelsSectionProps) {
  return (
    <section
      className="px-6 md:px-12 py-24 reveal-fade-up"
      style={{ backgroundColor: "#FFF9EF" }}
    >
      <div className="mb-14">
        <span
          className="font-sans font-bold uppercase tracking-[0.3em] mb-2 block"
          style={{ fontSize: "9px", color: "#5B1C1C" }}
        >
          {kicker}
        </span>
        <h2
          className="font-serif font-light uppercase"
          style={{
            fontSize: "clamp(2rem, 4vw, 3rem)",
            color: "#1A1212",
            lineHeight: 1.1,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 reveal-stagger-container">
        {reels.map((reel) => (
          <a
            key={reel.permalink}
            href={reel.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block overflow-hidden bg-black/5 reveal-stagger-item group"
            style={{ aspectRatio: "9/16" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Instagram CDN thumbnail URLs come from rotating subdomains, unsuitable for next/image remotePatterns */}
            <img
              src={reel.thumbnailUrl}
              alt={reel.title || reel.authorName || "Instagram reel"}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#FFF9EF" style={{ opacity: 0.9 }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            {reel.authorName && (
              <span
                className="absolute bottom-3 left-3 font-sans font-bold uppercase tracking-[0.15em]"
                style={{ fontSize: "9px", color: "#FFF9EF" }}
              >
                @{reel.authorName}
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
