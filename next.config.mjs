/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'export',  // 👈 これを追加（静的ファイルとして出力する設定）
  images: {
    unoptimized: true, // 👈 CloudflareではNext.jsの画像最適化が使えないためオフにする
  },
};

export default nextConfig;
