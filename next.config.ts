import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  allowedDevOrigins: [
    "192.168.1.41", "192.168.1.41:3000", "192.168.1.41:3001",
    "192.168.1.33", "192.168.1.33:3000", "192.168.1.33:3001"
  ],
};

export default withSerwist(nextConfig);
