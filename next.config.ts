import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The Journal was replaced by Our Journey.
    return [
      { source: "/journal", destination: "/our-journey", permanent: true },
      { source: "/journal/:slug", destination: "/our-journey", permanent: true },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [400, 640, 750, 828, 1080, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 280, 320, 400, 480],
  },
  // pdfkit reads .afm font metrics from its package dir at runtime, and the
  // ffmpeg/ffprobe installers ship platform binaries — keep both out of the
  // server bundle (native require/exec) and trace their data/binary files.
  serverExternalPackages: ["pdfkit", "fluent-ffmpeg", "@ffmpeg-installer/ffmpeg", "@ffprobe-installer/ffprobe"],
  outputFileTracingIncludes: {
    "/api/**": [
      "./node_modules/pdfkit/js/data/**",
      "./node_modules/@ffmpeg-installer/**",
      "./node_modules/@ffprobe-installer/**",
    ],
  },
};

export default nextConfig;
