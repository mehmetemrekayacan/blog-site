// Resim optimizasyonu için yardımcı fonksiyonlar
export const optimizeImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resmi WebP formatına dönüştür
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // WebP formatında ve %80 kalitede kaydet
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Resim dönüştürülemedi'));
            }
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Resim yüklenemedi'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
};

// Resim boyutunu kontrol et ve optimize et
export const checkAndOptimizeImage = async (file, maxSizeMB = 1) => {
  if (file.size > maxSizeMB * 1024 * 1024) {
    const optimizedBlob = await optimizeImage(file);
    return optimizedBlob;
  }
  return file;
}; 