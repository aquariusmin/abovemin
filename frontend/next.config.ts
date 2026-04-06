import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['yahoo-finance2'],
  images: {
    remotePatterns: [
      new URL('https://res.cloudinary.com/dmljaqqzc/**'),
    ],
  },
};

export default nextConfig;
