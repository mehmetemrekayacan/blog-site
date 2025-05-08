import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import BlogCard from '../components/BlogCard'; // Blogları göstermek için
import { useAuth } from '../context/AuthContext'; // BlogCard için gerekebilir

// Türkçe karakterleri normalize etme fonksiyonu (SearchBar.js veya blogService.js'teki ile aynı)
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

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || ''; // URL'den 'q' parametresini al
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth(); // BlogCard için

  useEffect(() => {
    const fetchAllResults = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const normalizedTerm = normalizeTurkishChars(searchTerm);

      try {
        // Bloglar için sorgu (normalize edilmiş başlıkta)
        const blogsQuery = query(
          collection(db, 'blogs'),
          where('title_normalized', '>=', normalizedTerm),
          where('title_normalized', '<=', normalizedTerm + '\uf8ff'),
          orderBy('title_normalized') // Sonuçları sırala
          // Limit ŞİMDİLİK kaldırıldı, tüm sonuçlar getiriliyor. Çok fazla sonuç varsa sayfalama eklenmeli.
        );

        // Kullanıcılar için sorgu (normalize edilmiş kullanıcı adında)
        const usersQuery = query(
          collection(db, 'users'),
          where('username_normalized', '>=', normalizedTerm),
          where('username_normalized', '<=', normalizedTerm + '\uf8ff'),
          orderBy('username_normalized')
          // Limit ŞİMDİLİK kaldırıldı.
        );

        const [blogsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(blogsQuery),
          getDocs(usersQuery),
        ]);

        const blogs = blogsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          type: 'blog',
        }));
        const users = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          type: 'user',
        }));

        setResults([...blogs, ...users]);
      } catch (err) {
        console.error("Arama sonuçları alınırken hata:", err);
        setError('Arama sonuçları yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllResults();
  }, [searchTerm]); // Arama terimi değiştiğinde yeniden yükle

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Arama Sonuçları: "<span className="text-indigo-600">{searchTerm}</span>"
      </h1>

      {loading && (
        <div className="flex justify-center items-center py-10">
           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {error && (
        <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="text-center text-gray-500 text-lg">
Arama kriterlerinize uygun sonuç bulunamadı.
        </p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="space-y-6">
          {/* Blog Sonuçları */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Bloglar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.filter(r => r.type === 'blog').map(blog => (
                <BlogCard key={`blog-${blog.id}`} {...blog} currentUser={currentUser} />
              ))}
            </div>
             {results.filter(r => r.type === 'blog').length === 0 && <p className="text-gray-500">Eşleşen blog bulunamadı.</p>}
          </section>

          {/* Kullanıcı Sonuçları */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Kullanıcılar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.filter(r => r.type === 'user').map(user => (
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
             {results.filter(r => r.type === 'user').length === 0 && <p className="text-gray-500">Eşleşen kullanıcı bulunamadı.</p>}
          </section>
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage; 