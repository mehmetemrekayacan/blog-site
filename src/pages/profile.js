import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteCurrentUser, updateUserProfile } from '../services/auth';
import { toast } from 'react-toastify';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Profile = () => {
  const { currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await updateUserProfile(displayName, currentUser.photoURL);
      setIsEditingName(false);
      toast.success('Profil başarıyla güncellendi!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Dosya boyutu kontrolü (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya boyutu 2MB\'dan küçük olmalıdır.', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen geçerli bir resim dosyası seçin.', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      // Resmi optimize et
      const optimizedImage = await optimizeImage(file);
      
      // Benzersiz dosya adı oluştur
      const timestamp = Date.now();
      const uniqueFileName = `${currentUser.uid}_${timestamp}_${file.name}`;
      
      const storageRef = ref(storage, `profile-photos/${uniqueFileName}`);
      
      // Metadata ekle
      const metadata = {
        contentType: 'image/jpeg', // Her zaman JPEG olarak kaydet
        customMetadata: {
          'userId': currentUser.uid,
          'uploadedAt': timestamp.toString(),
          'optimized': 'true'
        },
        cacheControl: 'public,max-age=31536000' // 1 yıl önbellek
      };
      
      // Dosyayı yükle
      await uploadBytes(storageRef, optimizedImage, metadata);
      
      // Yüklenen dosyanın URL'sini al
      const photoURL = await getDownloadURL(storageRef);
      
      // Kullanıcı profilini güncelle
      await updateUserProfile(currentUser.displayName, photoURL);
      
      toast.success('Profil fotoğrafı başarıyla güncellendi!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setUploadingPhoto(false);
      // Input'u temizle
      event.target.value = '';
    }
  };

  // Resim optimizasyon fonksiyonu
  const optimizeImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; // Maksimum genişlik
          const MAX_HEIGHT = 400; // Maksimum yükseklik
          let width = img.width;
          let height = img.height;

          // Boyutları orantılı olarak ayarla
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // JPEG olarak dönüştür ve kaliteyi ayarla
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.8); // 0.8 kalite oranı
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleReauthenticateAndDelete = async () => {
    setLoading(true);
    try {
      await deleteCurrentUser(password);
      toast.success('Hesabınız başarıyla silindi!', {
        position: 'top-right',
        autoClose: 3000,
      });
      window.location.href = '/';
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setPassword('');
    }
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-t-4 border-blue-500 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 animate-pulse">
            Yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Profil
        </h1>

        {/* Profil Fotoğrafı */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <img
              src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=random`}
              alt="Profil"
              className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 bg-indigo-500 text-white p-2 rounded-full hover:bg-indigo-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          {uploadingPhoto && (
            <p className="mt-2 text-sm text-gray-500">Fotoğraf yükleniyor...</p>
          )}
        </div>

        {/* Kullanıcı Bilgileri */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium">Kullanıcı Adı:</span>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="px-2 py-1 border rounded"
                />
                <button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="text-green-500 hover:text-green-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="text-red-500 hover:text-red-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-900">{currentUser.displayName || 'Belirtilmemiş'}</span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-indigo-500 hover:text-indigo-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium">E-posta:</span>
            <span className="text-gray-900">{currentUser.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium">Kayıt Tarihi:</span>
            <span className="text-gray-900">
              {currentUser.metadata?.creationTime
                ? new Date(currentUser.metadata.creationTime).toLocaleDateString('tr-TR')
                : 'Bilinmiyor'}
            </span>
          </div>
        </div>

        {/* Hesap Silme Butonu */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
          >
            Hesabı Sil
          </button>
        </div>
      </div>

      {/* Silme Onay Modalı */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Hesabı Silmeyi Onayla
            </h2>
            <p className="text-gray-600 mb-6">
              Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <label htmlFor="delete-password" className="block text-sm font-medium text-gray-700 mb-2">
              Şifrenizi Girin
            </label>
            <input
              id="delete-password"
              type="password"
              placeholder="Şifreniz"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm mb-4 focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:bg-gray-200"
            />
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleReauthenticateAndDelete}
                disabled={loading || !password}
                className={`px-4 py-2 text-white rounded-md ${
                  loading || !password
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                } transition-colors duration-200`}
              >
                {loading ? 'Siliniyor...' : 'Hesabı Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;