/** @type {import('next').NextConfig} */
const isExport = process.env.LP_EXPORT === '1';
const nextConfig = {
  reactStrictMode: false,
  // `*.dev.ts` route handlers (save the layout to the repo, push it) exist only in `next dev`, never in the static export
  pageExtensions: isExport ? ['tsx', 'ts', 'jsx', 'js'] : ['tsx', 'ts', 'jsx', 'js', 'dev.ts'],
  ...(isExport ? { output: 'export', images: { unoptimized: true } } : {}),
};
export default nextConfig;
