import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [400, 640, 750, 828, 1080, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 280, 320, 400, 480],
  },
  // pdfkit reads .afm font metrics from its package dir at runtime — keep it
  // out of the server bundle (native require) and trace its data files.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/pdfkit/js/data/**"],
  },
};

export default nextConfig;
