import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../services/firebase'; // Firebase config dosyanızın yolu
import { useAuth } from '../context/AuthContext';
import BlogCard from '../components/BlogCard';
import { toast } from 'react-toastify';
import { followUser, unfollowUser, checkFollowingStatus } from '../services/followService'; // YENİ IMPORT

const UserProfile = () => {
  const { userId } = useParams(); // URL'den userId'yi al
  const { currentUser } = useAuth(); // Mevcut kullanıcıyı al (takip vs. için)
  const [profileUser, setProfileUser] = useState(null);
  const [userBlogs, setUserBlogs] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false); // YENİ STATE
  const [isFollowLoading, setIsFollowLoading] = useState(false); // YENİ STATE (Buton için yükleme durumu)
  const [userStats, setUserStats] = useState({ // <<<<< YENİ STATE EKLENDİ
    postCount: 0,
    followerCount: 0,
    followingCount: 0
  });
  const [loadingStats, setLoadingStats] = useState(true); // <<<<< İstatistikler için yükleme durumu

  // Takip durumunu kontrol etme fonksiyonu
  const checkFollow = useCallback(async () => {
    if (currentUser && profileUser && currentUser.uid !== profileUser.id) {
      setIsFollowLoading(true);
      try {
        const status = await checkFollowingStatus(currentUser.uid, profileUser.id);
        setIsFollowing(status);
      } catch (err) {
        console.error("Takip durumu kontrol edilemedi:", err);
        // Hata durumunda kullanıcıya bildirim gösterilebilir ama state'i değiştirmemek daha iyi olabilir
      } finally {
        setIsFollowLoading(false);
      }
    }
  }, [currentUser, profileUser]);

  useEffect(() => {
    // Kullanıcı ID'si değiştiğinde tüm veriyi yeniden yükle
    if (!userId) {
      setError('Geçersiz Kullanıcı ID.');
      setLoadingProfile(false);
      setLoadingBlogs(false);
      setLoadingStats(false);
      return;
    }

    // State'leri sıfırla
    setLoadingProfile(true);
    setLoadingBlogs(true);
    setLoadingStats(true);
    setError(null);
    setProfileUser(null);
    setUserBlogs([]);
    setUserStats({ postCount: 0, followerCount: 0, followingCount: 0 });
    setIsFollowing(false);

    const fetchUserProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setProfileUser({ id: userDocSnap.id, ...userDocSnap.data() });
        } else {
          setError('Kullanıcı bulunamadı.');
          toast.error('Kullanıcı bulunamadı.');
        }
      } catch (err) {
        console.error("Kullanıcı profili alınırken hata:", err);
        setError('Profil yüklenirken bir hata oluştu.');
        toast.error('Profil yüklenirken bir hata oluştu.');
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchUserBlogsAndStats = async () => {
      try {
        // Bloglar
        setLoadingBlogs(true);
        const blogsQuery = query(
          collection(db, 'blogs'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const blogsSnapshot = await getDocs(blogsQuery);
        const blogs = blogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserBlogs(blogs);
        setLoadingBlogs(false);

        // İstatistikler
        setLoadingStats(true);
        const postCount = blogs.length; // Bloglar zaten çekildiği için tekrar sorguya gerek yok

        const followersColRef = collection(db, 'users', userId, 'followers');
        const followersSnapshot = await getCountFromServer(followersColRef);
        const followerCount = followersSnapshot.data().count;

        const followingColRef = collection(db, 'users', userId, 'following');
        const followingSnapshot = await getCountFromServer(followingColRef);
        const followingCount = followingSnapshot.data().count;

        setUserStats({ postCount, followerCount, followingCount });
        
      } catch (err) {
        console.error("Kullanıcının blogları veya istatistikleri alınırken hata:", err);
        // Bloglar veya istatistikler yüklenemese bile profil görünmeye devam etsin
      } finally {
         setLoadingBlogs(false); // Her durumda blog yüklemesi bitti
         setLoadingStats(false); // Her durumda istatistik yüklemesi bitti
      }
    };

    fetchUserProfile();
    fetchUserBlogsAndStats(); // Blogları ve istatistikleri birlikte çeken fonksiyonu çağır

  }, [userId]);

  // profileUser yüklendikten sonra takip durumunu kontrol et
  useEffect(() => {
    if (profileUser && currentUser) {
      checkFollow();
    }
  }, [profileUser, currentUser, checkFollow]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser || currentUser.uid === profileUser.id) {
      toast.info('Bu işlem için giriş yapmalısınız veya geçerli bir kullanıcı profili görüntülemelisiniz.');
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.uid, profileUser.id);
        setIsFollowing(false);
        // İstatistikleri güncelle (optimistik veya yeniden çekme)
        setUserStats(prev => ({...prev, followerCount: prev.followerCount - 1}));
        toast.success(`${profileUser.displayName || 'Kullanıcı'} takipten çıkarıldı.`);
      } else {
        await followUser(currentUser.uid, profileUser.id);
        setIsFollowing(true);
        // İstatistikleri güncelle (optimistik veya yeniden çekme)
        setUserStats(prev => ({...prev, followerCount: prev.followerCount + 1}));
        toast.success(`${profileUser.displayName || 'Kullanıcı'} takip edildi.`);
      }
    } catch (err) {
      toast.error(err.message || 'İşlem sırasında bir hata oluştu.');
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (loadingProfile) {
    return <div className="flex justify-center items-center h-screen">Profil Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 mt-10 p-4 bg-red-100 rounded-lg">{error}</div>;
  }

  if (!profileUser) {
    // Hata state'i zaten ayarlandığı için burası teorik olarak gereksiz ama bir fallback
    return <div className="text-center text-red-500 mt-10 p-4 bg-red-100 rounded-lg">Kullanıcı bulunamadı.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Üst Profil Kartı */}
      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 mb-8">
        <div className="flex justify-end mb-2">
          {/* Üç nokta menüsü (isteğe bağlı, kendi profilinde farklı olabilir) */}
          {/* <button className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button> */} 
        </div>
        <div className="flex flex-col items-center">
          {profileUser.photoURL ? (
            <img 
              src={profileUser.photoURL} 
              alt={profileUser.displayName || profileUser.username}
              className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200 shadow-md mb-4"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-4xl font-semibold border-4 border-indigo-200 shadow-md mb-4">
              {(profileUser.displayName || profileUser.username || 'K').substring(0, 1).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-800">
            {profileUser.displayName || profileUser.username}
          </h1>
          {/* Takip Et/Bırak Butonu */} 
          {currentUser && currentUser.uid !== profileUser.id && (
            <button 
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
              className={`mt-4 px-6 py-2 rounded-lg transition duration-200 font-semibold text-sm 
                          ${isFollowing 
                            ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
                          disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isFollowLoading ? 'İşleniyor...' : (isFollowing ? 'Takibi Bırak' : 'Takip Et')}
            </button>
          )}
        </div>
        {/* İstatistikler (GÜNCELLENDİ) */}
        <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-gray-200 text-center">
          {loadingStats ? (
            <div className="col-span-4 text-center text-gray-500 py-4">İstatistikler yükleniyor...</div>
          ) : (
            <>
              <div><p className="text-xl font-bold text-gray-700">{userStats.postCount}</p><p className="text-xs text-gray-500">Gönderi</p></div>
              <div><p className="text-xl font-bold text-gray-700">0</p><p className="text-xs text-gray-500">Beğeni</p></div> {/* Beğeni için ayrı mantık gerekebilir */}
              <div><p className="text-xl font-bold text-gray-700">{userStats.followerCount}</p><p className="text-xs text-gray-500">Takipçi</p></div>
              <div><p className="text-xl font-bold text-gray-700">{userStats.followingCount}</p><p className="text-xs text-gray-500">Takip</p></div>
            </>
          )}
        </div>
        {/* Kullanıcı Detayları */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          {profileUser.username && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <span className="font-semibold w-28">Kullanıcı Adı:</span>
              <span>{profileUser.username}</span>
              {/* Düzenleme ikonu kendi profilinde gösterilebilir */}
              {/* {currentUser && currentUser.uid === profileUser.id && <button className="ml-2 text-indigo-500"><svg .../></button>} */}
            </div>
          )}
          {profileUser.email && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-semibold w-28">E-posta:</span>
              <span>{profileUser.email}</span>
            </div>
          )}
           {/* Biyografi vs. eklenebilir */}
        </div>
      </div>

      {/* Alt Gönderiler Kartı */}
      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Gönderiler
        </h2>
        {loadingBlogs ? (
          <p className="text-gray-500">Bloglar yükleniyor...</p>
        ) : userBlogs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {userBlogs.map(blog => (
              <BlogCard key={blog.id} {...blog} currentUser={currentUser} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Bu kullanıcının henüz paylaştığı bir blog yok.</p>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 