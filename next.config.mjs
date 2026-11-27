/** @type {import('next').NextConfig} */
const isExport = process.env.LP_EXPORT === '1';
const nextConfig = {
  reactStrictMode: false,
  // *.dev.ts(x) files (the save-to-project-file API) only exist under `npm run dev`, never in the static export
  pageExtensions: isExport ? ['tsx', 'ts', 'jsx', 'js'] : ['tsx', 'ts', 'jsx', 'js', 'dev.ts'],
  ...(isExport ? { output: 'export', images: { unoptimized: true } } : {}),
};
export default nextConfig;
