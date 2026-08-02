/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist (mevzuat PDF metin çıkarma) Node.js tarafında 'canvas'
    // paketini isteğe bağlı olarak kullanır. Biz PDF'i yalnızca TARAYICIDA
    // ve sadece metin çıkarmak için okuyoruz — görüntü işleme yok, dolayısıyla
    // canvas gerekmiyor. Kurulu olmadığı için webpack'e "yok say" deniyor.
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

module.exports = nextConfig;
