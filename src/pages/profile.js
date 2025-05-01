import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteCurrentUser, updateUserProfile } from '../services/auth';
import { toast } from 'react-toastify';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, query, where, getDocs, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import BlogCard from '../components/BlogCard';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [userStats, setUserStats] = useState({
    postCount: 0,
    likeCount: 0,
    followerCount: 0,
    followingCount: 0
  });
  const [userBlogs, setUserBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // Blog sayısını al
        const blogsQuery = query(
          collection(db, 'blogs'),
          where('userId', '==', currentUser.uid)
        );
        const blogsSnapshot = await getDocs(blogsQuery);
        const postCount = blogsSnapshot.size;

        // Beğeni sayısını al
        const likesQuery = query(
          collection(db, 'likes'),
          where('userId', '==', currentUser.uid)
        );
        const likesSnapshot = await getDocs(likesQuery);
        const likeCount = likesSnapshot.size;

        // Takipçi sayısını al
        const followersQuery = query(
          collection(db, 'followers'),
          where('userId', '==', currentUser.uid)
        );
        const followersSnapshot = await getDocs(followersQuery);
        const followerCount = followersSnapshot.size;

        // Takip edilen sayısını al
        const followingQuery = query(
          collection(db, 'following'),
          where('userId', '==', currentUser.uid)
        );
        const followingSnapshot = await getDocs(followingQuery);
        const followingCount = followingSnapshot.size;

        setUserStats({
          postCount,
          likeCount,
          followerCount,
          followingCount
        });
      } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
      }
    };

    const fetchUserBlogs = async () => {
      try {
        setLoadingBlogs(true);
        const blogsQuery = query(
          collection(db, 'blogs'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const blogsSnapshot = await getDocs(blogsQuery);
        const blogs = blogsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserBlogs(blogs);
      } catch (error) {
        console.error('Bloglar yüklenirken hata:', error);
        toast.error('Bloglar yüklenirken bir hata oluştu.');
      } finally {
        setLoadingBlogs(false);
      }
    };

    const checkFollowingStatus = async () => {
      if (currentUser) {
        const followingQuery = query(
          collection(db, 'following'),
          where('userId', '==', currentUser.uid),
          where('followingId', '==', currentUser.uid)
        );
        const followingSnapshot = await getDocs(followingQuery);
        setIsFollowing(!followingSnapshot.empty);
      }
    };

    if (currentUser) {
      fetchUserStats();
      fetchUserBlogs();
      checkFollowingStatus();
    }
  }, [currentUser]);

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
      
      // Eski profil fotoğrafını sil
      if (currentUser.photoURL) {
        try {
          // URL'den dosya yolunu çıkar
          const photoURL = new URL(currentUser.photoURL);
          const pathSegments = photoURL.pathname.split('/');
          const filePath = pathSegments.slice(pathSegments.indexOf('o') + 1).join('/');
          
          // URL decode işlemi
          const decodedPath = decodeURIComponent(filePath);
          
          // Dosyayı sil
          const oldPhotoRef = ref(storage, decodedPath);
          await deleteObject(oldPhotoRef);
        } catch (error) {
          // Eğer dosya zaten silinmişse veya bulunamazsa hata verme
          if (error.code !== 'storage/object-not-found') {
            console.error('Eski profil fotoğrafı silinirken hata:', error);
          }
        }
      }
      
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

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        // Takibi bırak
        const followingQuery = query(
          collection(db, 'following'),
          where('userId', '==', currentUser.uid),
          where('followingId', '==', currentUser.uid)
        );
        const followingSnapshot = await getDocs(followingQuery);
        followingSnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });

        // Takipçi listesinden kaldır
        const followersQuery = query(
          collection(db, 'followers'),
          where('userId', '==', currentUser.uid),
          where('followerId', '==', currentUser.uid)
        );
        const followersSnapshot = await getDocs(followersQuery);
        followersSnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });

        setIsFollowing(false);
        toast.success('Takip bırakıldı');
      } else {
        // Takip et
        await addDoc(collection(db, 'following'), {
          userId: currentUser.uid,
          followingId: currentUser.uid,
          createdAt: new Date()
        });

        // Takipçi listesine ekle
        await addDoc(collection(db, 'followers'), {
          userId: currentUser.uid,
          followerId: currentUser.uid,
          createdAt: new Date()
        });

        setIsFollowing(true);
        toast.success('Takip edildi');
      }
    } catch (error) {
      console.error('Takip işlemi sırasında hata:', error);
      toast.error('Bir hata oluştu');
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
      <div className="max-w-4xl mx-auto">
        {/* Profil Bilgileri */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Profil
            </h1>
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
              {showSettingsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Ayarlar
                  </Link>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Hesabı Sil
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profil Fotoğrafı ve Takip Butonu */}
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
            <button
              onClick={handleFollow}
              className={`mt-4 px-4 py-2 rounded-md ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
              } transition-colors duration-200`}
            >
              {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
            </button>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{userStats.postCount}</div>
              <div className="text-sm text-gray-600">Gönderi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{userStats.likeCount}</div>
              <div className="text-sm text-gray-600">Beğeni</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{userStats.followerCount}</div>
              <div className="text-sm text-gray-600">Takipçi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{userStats.followingCount}</div>
              <div className="text-sm text-gray-600">Takip</div>
            </div>
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
          </div>
        </div>

        {/* Kullanıcının Blog Gönderileri */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Gönderiler</h2>
          {loadingBlogs ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : userBlogs.length > 0 ? (
            <div className="grid gap-6">
              {userBlogs.map(blog => (
                <BlogCard
                  key={blog.id}
                  id={blog.id}
                  title={blog.title}
                  content={blog.content}
                  author={blog.author}
                  date={blog.createdAt?.toDate().toLocaleDateString()}
                  imageUrl={blog.imageUrl}
                  tags={blog.tags}
                  userId={blog.userId}
                  currentUser={currentUser}
                  likeCount={blog.likeCount || 0}
                  likedBy={blog.likedBy || []}
                  authorPhotoURL={blog.authorPhotoURL}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Henüz gönderi paylaşılmamış.
            </p>
          )}
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