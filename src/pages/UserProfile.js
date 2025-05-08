import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase'; // Firebase config dosyanızın yolu
import { useAuth } from '../context/AuthContext';
import BlogCard from '../components/BlogCard';
import { toast } from 'react-toastify';

const UserProfile = () => {
  const { userId } = useParams(); // URL'den userId'yi al
  const { currentUser } = useAuth(); // Mevcut kullanıcıyı al (takip vs. için)
  const [profileUser, setProfileUser] = useState(null);
  const [userBlogs, setUserBlogs] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      setLoadingProfile(true);
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

    const fetchUserBlogs = async () => {
      if (!userId) return;
      setLoadingBlogs(true);
      try {
        const blogsQuery = query(
          collection(db, 'blogs'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const blogsSnapshot = await getDocs(blogsQuery);
        setUserBlogs(blogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Kullanıcının blogları alınırken hata:", err);
        toast.error('Kullanıcının blogları yüklenirken bir hata oluştu.');
      } finally {
        setLoadingBlogs(false);
      }
    };

    fetchUserProfile();
    fetchUserBlogs();
  }, [userId]);

  if (loadingProfile) {
    return <div className="flex justify-center items-center h-screen">Profili Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 mt-10">{error}</div>;
  }

  if (!profileUser) {
    // Hata state'i zaten ayarlandığı için burası teorik olarak gereksiz ama bir fallback
    return <div className="text-center text-red-500 mt-10">Kullanıcı bulunamadı.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-xl rounded-lg p-6 md:p-10">
        <div className="flex flex-col items-center md:flex-row md:items-start gap-6 md:gap-10 mb-8">
          {profileUser.photoURL ? (
            <img 
              src={profileUser.photoURL} 
              alt={profileUser.displayName || profileUser.username}
              className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-indigo-500 shadow-md"
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-4xl md:text-5xl font-semibold border-4 border-indigo-500 shadow-md">
              {(profileUser.displayName || profileUser.username || 'K').substring(0, 1).toUpperCase()}
            </div>
          )}
          <div className="text-center md:text-left flex-grow">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              {profileUser.displayName || profileUser.username}
            </h1>
            {profileUser.username && (
              <p className="text-md text-gray-500 mb-1">@{profileUser.username}</p>
            )}
            {profileUser.email && (
              <p className="text-sm text-gray-500 mb-4">{profileUser.email}</p>
            )}
            {/* Takip Et/Bırak butonu eklenebilir */}
            {currentUser && currentUser.uid !== profileUser.id && (
                <button className="mt-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition duration-200">
                    Takip Et {/* Takip etme mantığı eklenecek */}
                </button>
            )}
          </div>
        </div>

        {/* İstatistikler (varsa) */}
        {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-center">
          <div><p className="text-2xl font-bold">{userBlogs.length}</p><p className="text-gray-500">Gönderi</p></div>
          <div><p className="text-2xl font-bold">0</p><p className="text-gray-500">Beğeni</p></div>
          <div><p className="text-2xl font-bold">0</p><p className="text-gray-500">Takipçi</p></div>
          <div><p className="text-2xl font-bold">0</p><p className="text-gray-500">Takip</p></div>
        </div> */} 

        <h2 className="text-2xl font-semibold text-gray-700 mb-6 border-b pb-2">
          {profileUser.displayName || profileUser.username}'in Blogları
        </h2>
        {loadingBlogs ? (
          <p>Bloglar yükleniyor...</p>
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