import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register once for the entire app — importing from this module instead of
// calling registerPlugin() in every component avoids repeated registrations.
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
