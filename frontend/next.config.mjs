/** @type {import('next').NextConfig} */
const backendOrigin = process.env.BACKEND_ORIGIN ?? "https://birge.backend.deo-core.codes";

const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const upstream = [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*/` },
      { source: "/admin/:path*", destination: `${backendOrigin}/admin/:path*/` },
      { source: "/static/:path*", destination: `${backendOrigin}/static/:path*/` },
      { source: "/media/:path*", destination: `${backendOrigin}/media/:path*/` },
    ];
    return upstream;
  }
};

export default nextConfig;