/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";
const backendOrigin =
  process.env.BACKEND_ORIGIN ?? (isProduction ? "https://birge.backend.deo-core.codes" : "http://127.0.0.1:8000");

const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendOrigin}/api/:path*/` }];
  }
};

export default nextConfig;