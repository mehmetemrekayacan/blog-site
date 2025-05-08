/**
 * Verilen string içerisindeki Türkçe karakterleri (İ, I, ı, ü, ö, ş, ç, ğ)
 * Latin alfabesindeki benzerlerine dönüştürür ve tüm metni küçük harfe çevirir.
 * Arama ve sıralama işlemlerinde tutarlılık sağlamak için kullanılır.
 * @param {string} str - Normalize edilecek string.
 * @returns {string} Normalize edilmiş string.
 */
export const normalizeTurkishChars = (str) => {
  if (!str || typeof str !== 'string') return '';
  let s = str;
  s = s.replace(/İ/g, 'i').replace(/I/g, 'i'); // Büyük I ve noktalı İ için önce küçük i
  s = s.toLowerCase(); // Sonra her şeyi küçük harfe çevir
  s = s.replace(/[ı]/g, 'i'); // Noktasız ı -> i
  s = s.replace(/ü/g, 'u');
  s = s.replace(/ö/g, 'o');
  s = s.replace(/ş/g, 's');
  s = s.replace(/ç/g, 'c');
  s = s.replace(/ğ/g, 'g');
  return s;
}; 