/** @type {import('next').NextConfig} */
const backendOrigin = process.env.BACKEND_ORIGIN ?? "https://birge.backend.deo-core.codes";

const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const upstream = [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*/` },
      { source: "/static/:path*", destination: `${backendOrigin}/static/:path*` },
      { source: "/media/:path*", destination: `${backendOrigin}/media/:path*` },
    ];
    return upstream;
  },
  async redirects() {
    // Админка живёт на домене бэкенда; при заходе на /admin со стороны фронта
    // перенаправляем туда, чтобы cookies (SESSIONID/CSRF) ставились на бэкенд-домен.
    return [
      { source: "/admin/:path*", destination: `${backendOrigin}/admin/:path*`, permanent: true },
      { source: "/admin", destination: `${backendOrigin}/admin/`, permanent: true },
    ];
  }
};

export default nextConfig;
