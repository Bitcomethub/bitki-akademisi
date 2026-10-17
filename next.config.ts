import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // next/image varsayılanı yalnızca WebP. AVIF önce denenir; tarayıcı
    // desteklemiyorsa (Accept başlığında yoksa) Next otomatik olarak WebP'ye
    // düşer — yani bu ayar bir kayıp değil, yalnızca daha küçük dosya şansı.
    // Kazanç bu sitede somut: kapak fotoğrafları fal.ai'den JPEG geliyor ve
    // hero görsel LCP adayı; aynı görselin daha küçük bir kodlaması doğrudan
    // LCP'ye yazar.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
