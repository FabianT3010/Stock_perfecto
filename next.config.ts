import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaqueta un servidor autónomo mínimo (.next/standalone) para la imagen Docker.
  output: "standalone",
};

export default nextConfig;
