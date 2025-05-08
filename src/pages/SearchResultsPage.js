import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../services/firebase';
import BlogCard from '../components/BlogCard'; // Blogları göstermek için
import { useAuth } from '../context/AuthContext'; // BlogCard için gerekebilir
import { normalizeTurkishChars } from '../utils/textUtils'; // YENİ IMPORT

// Türkçe karakterleri normalize etme fonksiyonu kaldırıldı
/*
const normalizeTurkishChars = (str) => {
  if (!str) return '';
  let s = str;
  s = s.replace(/İ/g, 'i').replace(/I/g, 'i');
  s = s.toLowerCase();
  s = s.replace(/[ıi]/g, 'i');
  s = s.replace(/ü/g, 'u');
  s = s.replace(/ö/g, 'o');
  s = s.replace(/ş/g, 's');
  s = s.replace(/ç/g, 'c');
  s = s.replace(/ğ/g, 'g');
  return s;
};
*/

const PAGE_SIZE = 9; // Sayfa başına gösterilecek blog sayısı (veya kullanıcı)

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  
  const [blogs, setBlogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMoreBlogs, setLoadingMoreBlogs] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  // Sayfalama state'leri
  const [lastVisibleBlog, setLastVisibleBlog] = useState(null);
  const [lastVisibleUser, setLastVisibleUser] = useState(null);
  const [hasMoreBlogs, setHasMoreBlogs] = useState(true);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);

  // Veri çekme fonksiyonu (useCallback ile optimize edildi)
  const fetchPaginatedResults = useCallback(async (isInitialFetch = true) => {
    // console.log(`fetchPaginatedResults called. isInitialFetch: ${isInitialFetch}, searchTerm: ${searchTerm}`);
    if (!searchTerm.trim()) {
      setBlogs([]);
      setUsers([]);
      setLoadingBlogs(false);
      setLoadingUsers(false);
      return;
    }

    // İlk yükleme state'lerini burada ayarlama
    if (isInitialFetch) {
      // setLoadingBlogs(true); // << BURADAN KALDIRILDI
      // setLoadingUsers(true); // << BURADAN KALDIRILDI
      setError(null);
      setBlogs([]); 
      setUsers([]);
      setLastVisibleBlog(null);
      setLastVisibleUser(null);
      setHasMoreBlogs(true);
      setHasMoreUsers(true);
    }

    const normalizedTerm = normalizeTurkishChars(searchTerm);
    // console.log(`Normalized search term: ${normalizedTerm}`); 

    try {
      // Blogları Çek
      // Koşulu önce kontrol et, sonra loading state'ini ayarla
      const shouldFetchBlogs = hasMoreBlogs && !loadingBlogs && !loadingMoreBlogs && (isInitialFetch || lastVisibleBlog);
      if (shouldFetchBlogs) {
        if (!isInitialFetch) setLoadingMoreBlogs(true);
        else setLoadingBlogs(true); // <<<< Loading state buraya taşındı

        const blogsQueryConstraints = [
          where('title_normalized', '>=', normalizedTerm),
          where('title_normalized', '<=', normalizedTerm + '\uf8ff'),
          orderBy('title_normalized'),
          limit(PAGE_SIZE)
        ];
        if (!isInitialFetch && lastVisibleBlog) {
          blogsQueryConstraints.push(startAfter(lastVisibleBlog));
        }
        const blogsQuery = query(collection(db, 'blogs'), ...blogsQueryConstraints);
        // console.log("Executing Blogs Query with constraints:", blogsQueryConstraints);
        
        const blogsSnapshot = await getDocs(blogsQuery);
        // console.log("Blogs Snapshot received, size:", blogsSnapshot.size); 

        const fetchedBlogs = blogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'blog' }));
        // console.log("Fetched Blogs array:", fetchedBlogs);

        setBlogs(prev => {
            const newBlogs = isInitialFetch ? fetchedBlogs : [...prev, ...fetchedBlogs];
            // console.log("Setting Blogs State:", newBlogs);
            return newBlogs;
        });
        const newLastVisibleBlog = blogsSnapshot.docs[blogsSnapshot.docs.length - 1] || null;
        setLastVisibleBlog(newLastVisibleBlog);
        setHasMoreBlogs(blogsSnapshot.docs.length === PAGE_SIZE);
        
        // Loading state'ini iş bittikten sonra false yap
        if (!isInitialFetch) setLoadingMoreBlogs(false);
        else setLoadingBlogs(false);
      } else if (isInitialFetch) {
          // İlk fetch ama koşul sağlanmadı (zaten yükleniyor veya daha fazla yok)
          setLoadingBlogs(false); // Loading state'ini false yap
      }

      // Kullanıcıları Çek (Benzer Mantık)
      const shouldFetchUsers = hasMoreUsers && !loadingUsers && !loadingMoreUsers && (isInitialFetch || lastVisibleUser);
       if (shouldFetchUsers) {
         if (!isInitialFetch) setLoadingMoreUsers(true);
         else setLoadingUsers(true); // <<<< Loading state buraya taşındı

         const usersQueryConstraints = [
           where('username_normalized', '>=', normalizedTerm),
           where('username_normalized', '<=', normalizedTerm + '\uf8ff'),
           orderBy('username_normalized'),
           limit(PAGE_SIZE)
         ];
         if (!isInitialFetch && lastVisibleUser) {
           usersQueryConstraints.push(startAfter(lastVisibleUser));
         }
        const usersQuery = query(collection(db, 'users'), ...usersQueryConstraints);
        const usersSnapshot = await getDocs(usersQuery);
        const fetchedUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'user' }));
        setUsers(prev => isInitialFetch ? fetchedUsers : [...prev, ...fetchedUsers]);
        const newLastVisibleUser = usersSnapshot.docs[usersSnapshot.docs.length - 1] || null;
        setLastVisibleUser(newLastVisibleUser);
        setHasMoreUsers(usersSnapshot.docs.length === PAGE_SIZE);
        
        // Loading state'ini iş bittikten sonra false yap
         if (!isInitialFetch) setLoadingMoreUsers(false);
         else setLoadingUsers(false);
       } else if (isInitialFetch) {
           // İlk fetch ama koşul sağlanmadı
           setLoadingUsers(false); // Loading state'ini false yap
       }

    } catch (err) {
      console.error("Arama sonuçları alınırken hata:", err);
      setError('Arama sonuçları yüklenirken bir hata oluştu.');
      // Hata durumunda tüm loading state'lerini false yap
      setLoadingBlogs(false);
      setLoadingUsers(false);
      setLoadingMoreBlogs(false);
      setLoadingMoreUsers(false);
    }
  // Bağımlılıkları sadeleştirelim, sadece dışarıdan gelenler ve tetikleyiciler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // Sadece searchTerm'e bağlı olmalı, içerdeki state'lere değil

  useEffect(() => {
    // Bu useEffect artık sadece ilk yüklemeyi tetiklemeli
    fetchPaginatedResults(true); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // Sadece arama terimi değiştiğinde ilk yüklemeyi tetikle

  const handleLoadMoreBlogs = () => {
     // Fonksiyonu çağırmadan önce tekrar kontrol etmeye gerek yok, fetchPaginatedResults zaten kontrol ediyor
     if (hasMoreBlogs && !loadingMoreBlogs) {
        fetchPaginatedResults(false); 
     }
  };

  const handleLoadMoreUsers = () => {
     if (hasMoreUsers && !loadingMoreUsers) {
        fetchPaginatedResults(false); 
     }
  };

  // Yükleme durumunu sadece ilk yükleme için kullanabiliriz
  const isInitialLoading = loadingBlogs || loadingUsers;
  const noResultsFound = !isInitialLoading && !error && blogs.length === 0 && users.length === 0;

  // console.log("Rendering SearchResultsPage. Current Blogs state:", blogs);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Arama Sonuçları: "<span className="text-indigo-600">{searchTerm}</span>"
      </h1>

      {/* İlk yükleme göstergesi */}
      {isInitialLoading && (
        <div className="flex justify-center items-center py-10">
           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {error && (
        <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">
          {error}
        </div>
      )}

      {noResultsFound && (
        <p className="text-center text-gray-500 text-lg">
          Arama kriterlerinize uygun sonuç bulunamadı.
        </p>
      )}

      {!isInitialLoading && !error && (blogs.length > 0 || users.length > 0) && (
        <div className="space-y-8">
          {/* Blog Sonuçları */}
          {blogs.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Bloglar</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map(blog => (
                  <BlogCard key={`blog-${blog.id}`} {...blog} currentUser={currentUser} />
                ))}
              </div>
              {hasMoreBlogs && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleLoadMoreBlogs}
                    disabled={loadingMoreBlogs}
                    className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition duration-200 disabled:opacity-50"
                  >
                    {loadingMoreBlogs ? 'Yükleniyor...' : 'Daha Fazla Blog Göster'}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Kullanıcı Sonuçları */}
          {users.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Kullanıcılar</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {users.map(user => (
                  <Link key={`user-${user.id}`} to={`/user/${user.id}`} className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <div className="flex flex-col items-center text-center">
                      {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.displayName || user.username}
                            className="w-20 h-20 rounded-full object-cover mb-3 bg-gray-200"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-2xl font-semibold mb-3">
                            {(user.displayName || user.username || 'K').substring(0, 1).toUpperCase()}
                          </div>
                        )}
                      <h4 className="font-medium text-gray-900 truncate w-full">{user.displayName || user.username}</h4>
                      {user.username && <p className="text-xs text-gray-500">@{user.username}</p>}
                    </div>
                  </Link>
                ))}
              </div>
              {hasMoreUsers && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleLoadMoreUsers}
                    disabled={loadingMoreUsers}
                    className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition duration-200 disabled:opacity-50"
                  >
                    {loadingMoreUsers ? 'Yükleniyor...' : 'Daha Fazla Kullanıcı Göster'}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage; 