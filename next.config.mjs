/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "fintrak.online",
          },
        ],
        destination: "https://www.fintrak.online/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
