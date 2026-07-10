import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Served at www.kadoa.com/potus via the kadoa dashboard's reverse proxy
    // (see kadoa-backend apps/dashboard/next.config.mjs). basePath makes the
    // app serve natively under /potus, including its own redirects and assets.
    basePath: "/potus",
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
    async rewrites() {
        return [
            {
                source: '/robots.txt',
                destination: '/robots.txt',
            },
        ];
    },
};

export default nextConfig;
