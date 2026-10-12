/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Node-only libraries: load them at runtime instead of bundling.
  serverExternalPackages: ["web-push"],
  experimental: {
    // Keep recently visited screens in memory so switching tabs is instant.
    // Fresh data still arrives via live updates and after every action.
    staleTimes: { dynamic: 60, static: 300 },
    // Room for photos and voice notes passed through server actions.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};
export default nextConfig;
