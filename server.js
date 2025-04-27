const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Güvenlik başlıkları
app.use(helmet());

// CORS ayarları
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com' 
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100 // IP başına maksimum istek sayısı
});
app.use(limiter);

// JSON body parser - daha sıkı limit
app.use(express.json({ 
  limit: '1kb', // 1KB ile sınırla
  strict: true // Sadece JSON kabul et
}));

// Command injection ve XSS koruması
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Tüm tehlikeli karakterleri temizle
        req.body[key] = req.body[key]
          .replace(/[<>]/g, '') // XSS koruması
          .replace(/[$()]/g, '') // Command injection koruması
          .replace(/[|&;]/g, '') // Shell komut karakterleri
          .replace(/[`]/g, '') // Backtick
          .replace(/[{}]/g, '') // PowerShell blok karakterleri
          .replace(/[\[\]]/g, '') // PowerShell array karakterleri
          .replace(/[\\]/g, '') // Backslash
          .replace(/[\/]/g, '') // Forward slash
          .replace(/[^a-zA-Z0-9\s.,!?-]/g, ''); // Sadece güvenli karakterlere izin ver
      }
    });
  }
  next();
});

// Güvenlik başlıkları
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Ana route
app.get('/', (req, res) => {
  res.json({ message: 'API çalışıyor!' });
});

// POST route
app.post('/', (req, res) => {
  try {
    // İstek boyutunu kontrol et
    const requestSize = Buffer.from(JSON.stringify(req.body)).length;
    if (requestSize > 1024) {
      return res.status(413).json({
        error: 'İstek boyutu çok büyük',
        message: 'Maksimum 1KB veri gönderebilirsiniz',
        size: requestSize
      });
    }

    // Veriyi işle
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({
        error: 'Geçersiz veri',
        message: 'data alanı gereklidir'
      });
    }

    // Veri uzunluğunu kontrol et
    if (data.length > 1000) {
      return res.status(413).json({
        error: 'Veri çok uzun',
        message: 'Maksimum 1000 karakter gönderebilirsiniz',
        length: data.length
      });
    }

    // Veri içeriğini kontrol et
    if (data.includes('$') || data.includes('(') || data.includes(')')) {
      return res.status(400).json({
        error: 'Geçersiz karakterler',
        message: 'Veri içinde komut çalıştırma karakterleri bulundu'
      });
    }

    // Komut çalıştırma denemelerini kontrol et
    const dangerousPatterns = [
      /\$\(.*\)/, // PowerShell command substitution
      /head.*-c/, // head command
      /dev\/urandom/, // /dev/urandom
      /base64/, // base64 command
      /[|&;]/, // Shell operators
      /[<>]/, // Redirection
      /[`]/, // Backticks
      /[{}]/, // PowerShell blocks
      /[\[\]]/, // PowerShell arrays
      /[\\\/]/, // Path separators
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(data)) {
        return res.status(400).json({
          error: 'Güvenlik ihlali',
          message: 'Tehlikeli komut tespit edildi'
        });
      }
    }

    res.status(200).json({
      message: 'Veri başarıyla alındı',
      receivedData: data.substring(0, 100) + '...' // İlk 100 karakteri göster
    });
  } catch (error) {
    res.status(500).json({
      error: 'Sunucu hatası',
      message: 'Veri işlenirken bir hata oluştu'
    });
  }
});

app.get('/test', (req, res) => {
    res.status(200).send('Test başarılı!');
  });

// 404 hata yönetimi
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Sayfa bulunamadı',
    path: req.path
  });
});

// Genel hata yönetimi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Sunucu hatası',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Bir hata oluştu'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
}); 