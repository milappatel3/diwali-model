/** @type {import('next').NextConfig} */
const isExport = process.env.LP_EXPORT === '1';
const nextConfig = {
  reactStrictMode: false,
  ...(isExport ? { output: 'export', images: { unoptimized: true } } : {}),
};
export default nextConfig;
