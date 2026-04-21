import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
  async redirects() {
    return [{ source: "/", destination: "/agent", permanent: false }];
  },
  poweredByHeader: false,
};

export default nextConfig;
