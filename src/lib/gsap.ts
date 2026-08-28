import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register once for the entire app — importing from this module instead of
// calling registerPlugin() in every component avoids repeated registrations.
gsap.registerPlugin(ScrollTrigger);

if (typeof window !== "undefined") {
  // Mobile browsers collapse the URL bar on scroll, which fires a resize and
  // forces a full ScrollTrigger.refresh() mid-pin -- a classic source of jank.
  // Height-only changes are ignored; width changes still refresh normally.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };
