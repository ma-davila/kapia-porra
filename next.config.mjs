/** @type {import('next').NextConfig} */
const nextConfig = {
  // Seed data is imported as JSON at runtime in route handlers / server components.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
