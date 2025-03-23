import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteCurrentUser } from '../services/auth';
import { toast } from 'react-toastify';

const Profile = () => {
  const { currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleReauthenticateAndDelete = async () => {
    setLoading(true);
    try {
      // Hesabı sil
      await deleteCurrentUser(password);
      
      toast.success('Hesabınız başarıyla silindi!', {
        position: 'top-right',
        autoClose: 3000,
      });
      
      // Kullanıcı silindikten sonra sayfayı yenile ve ana sayfaya yönlendir
      window.location.href = '/';
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setPassword(''); // Şifreyi sıfırla
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
        {/* Başlık */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Profil
        </h1>

        {/* Kullanıcı Bilgileri */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium">Kullanıcı Adı:</span>
            <span className="text-gray-900">
              {currentUser.displayName || 'Belirtilmemiş'}
            </span>
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

      {/* Hesap Silme Modal */}
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