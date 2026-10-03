/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for Netlify — the app is fully client-rendered (it fetches
  // everything from the API at runtime), so it ships as static files.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
