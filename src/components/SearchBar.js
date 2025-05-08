import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';

// Debounce fonksiyonu
function debounce(func, delay) {
  let timeout;
  const debounced = function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
  debounced.cancel = function() {
    clearTimeout(timeout);
  };
  return debounced;
}

// Türkçe karakterleri normalize etme fonksiyonu (blogService.js'teki ile aynı olmalı)
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

const RESULTS_PER_PAGE = 5; // Sayfa başına gösterilecek sonuç sayısı

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Daha fazla yükleme için
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const searchContainerRef = useRef(null);

  // Sayfalama için son dokümanları tutacak referanslar
  const [lastVisibleBlogDoc, setLastVisibleBlogDoc] = useState(null);
  const [lastVisibleUserDoc, setLastVisibleUserDoc] = useState(null);
  const [hasMoreToFetch, setHasMoreToFetch] = useState(true); // Daha fazla sonuç olup olmadığını tutar

  // Dışarı tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchContainerRef]);

  const fetchResults = useCallback(async (termToSearch, options = {}) => {
    const {
      isInitial = true,
      lastBlog = null, 
      lastUser = null
    } = options;

    if (!termToSearch.trim()) {
      setSearchResults([]);
      setShowResults(false);
      setIsLoading(false);
      setIsLoadingMore(false);
      setHasMoreToFetch(true);
      setLastVisibleBlogDoc(null); // State'leri sıfırla
      setLastVisibleUserDoc(null); // State'leri sıfırla
      return;
    }

    if (isInitial) {
      setIsLoading(true);
      setSearchResults([]);
      setLastVisibleBlogDoc(null); // İlk aramada state'leri sıfırla
      setLastVisibleUserDoc(null);
      setHasMoreToFetch(true); // İlk aramada daha fazla olabileceğini varsay
    } else {
      setIsLoadingMore(true);
    }
    setError(null);
    setShowResults(true);

    const normalizedTerm = normalizeTurkishChars(termToSearch);

    try {
      let blogsQuery;
      const blogsCollectionRef = collection(db, 'blogs');
      if (isInitial) {
        blogsQuery = query(
          blogsCollectionRef,
          where('title_normalized', '>=', normalizedTerm),
          where('title_normalized', '<=', normalizedTerm + '\uf8ff'),
          orderBy('title_normalized'),
          limit(RESULTS_PER_PAGE)
        );
      } else if (lastBlog) { // Sadece bir önceki cursor varsa devam et
        blogsQuery = query(
          blogsCollectionRef,
          where('title_normalized', '>=', normalizedTerm),
          where('title_normalized', '<=', normalizedTerm + '\uf8ff'),
          orderBy('title_normalized'),
          startAfter(lastBlog),
          limit(RESULTS_PER_PAGE)
        );
      } else {
        blogsQuery = null; // Bloglar için daha fazla sorgu yapma
      }

      let usersQuery;
      const usersCollectionRef = collection(db, 'users');
      if (isInitial) {
        usersQuery = query(
          usersCollectionRef,
          where('username_normalized', '>=', normalizedTerm), // username_normalized KULLANILIYOR
          where('username_normalized', '<=', normalizedTerm + '\uf8ff'),
          orderBy('username_normalized'),
          limit(RESULTS_PER_PAGE)
        );
      } else if (lastUser) { // Sadece bir önceki cursor varsa devam et
        usersQuery = query(
          usersCollectionRef,
          where('username_normalized', '>=', normalizedTerm),
          where('username_normalized', '<=', normalizedTerm + '\uf8ff'),
          orderBy('username_normalized'),
          startAfter(lastUser),
          limit(RESULTS_PER_PAGE)
        );
      } else {
        usersQuery = null; // Kullanıcılar için daha fazla sorgu yapma
      }
      
      const promises = [];
      if (blogsQuery) promises.push(getDocs(blogsQuery)); else promises.push(Promise.resolve({ docs: [] }));
      if (usersQuery) promises.push(getDocs(usersQuery)); else promises.push(Promise.resolve({ docs: [] }));

      const [blogsSnapshot, usersSnapshot] = await Promise.all(promises);

      const newBlogs = blogsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: 'blog',
      }));
      const newUsers = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: 'user',
      }));
      
      let newLastBlog = null;
      if (blogsSnapshot.docs.length > 0) {
        newLastBlog = blogsSnapshot.docs[blogsSnapshot.docs.length - 1];
      }
      if (isInitial || newBlogs.length > 0) { // Sadece ilk aramada veya yeni bloglar geldiyse güncelle
        setLastVisibleBlogDoc(newLastBlog); 
      } else if (!newBlogs.length && !isInitial) { // Daha fazla yüklenirken blog gelmediyse null yapma, eskisi kalsın
         // Belki de burada null yapmamak daha iyi, böylece tekrar tekrar aynı şeyi sorgulamaz
      }

      let newLastUser = null;
      if (usersSnapshot.docs.length > 0) {
        newLastUser = usersSnapshot.docs[usersSnapshot.docs.length - 1];
      }
      if (isInitial || newUsers.length > 0) {
        setLastVisibleUserDoc(newLastUser);
      } // Benzer mantık kullanıcılar için
      
      const mightHaveMoreBlogs = newBlogs.length === RESULTS_PER_PAGE;
      const mightHaveMoreUsers = newUsers.length === RESULTS_PER_PAGE;
      setHasMoreToFetch(mightHaveMoreBlogs || mightHaveMoreUsers);

      setSearchResults(prevResults => 
        isInitial ? [...newBlogs, ...newUsers] : [...prevResults, ...newBlogs, ...newUsers]
      );

    } catch (err) {
      console.error("Search error:", err);
      setError('Arama sırasında bir hata oluştu. Lütfen Firebase indekslerinizi kontrol edin veya daha sonra tekrar deneyin.');
      if (isInitial) setSearchResults([]); // Hata durumunda ilk aramaysa temizle
      setHasMoreToFetch(false);
    } finally {
      if (isInitial) setIsLoading(false);
      else setIsLoadingMore(false);
    }
  // useCallback için bağımlılıklar: Sadece state setter'ları ve dışarıdan gelen stabil fonksiyonlar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // navigate dışarıdan geldiği için eklendi, normalizeTurkishChars global olduğu için gerek yok

  // Debounced arama fonksiyonu (fetchResults'a olan bağımlılığı değişmediği için stabil kalacak)
  const debouncedSearch = useCallback(debounce((term) => fetchResults(term, { isInitial: true }), 400), [fetchResults]);

  useEffect(() => {
    if (searchTerm.trim()) {
      debouncedSearch(searchTerm);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setLastVisibleBlogDoc(null);
      setLastVisibleUserDoc(null);
      setHasMoreToFetch(true);
      debouncedSearch.cancel?.(); // Debounce edilmiş çağrıyı iptal et
    }
  }, [searchTerm, debouncedSearch]);

  const handleInputChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setShowResults(false);
    }
  };

  const handleLoadMore = () => {
    if (searchTerm.trim() && hasMoreToFetch && !isLoadingMore) {
      // Daha fazla yükle, mevcut son dokümanları argüman olarak geçir
      fetchResults(searchTerm, {
        isInitial: false,
        lastBlog: lastVisibleBlogDoc, // State'ten alınan güncel değerler
        lastUser: lastVisibleUserDoc
      });
    }
  };

  const handleResultClick = (result) => {
    if (result.type === 'blog') {
      navigate(`/blog/${result.id}`);
    } else {
      navigate(`/user/${result.id}`);
    }
    setShowResults(false);
    setSearchTerm('');
    // setSearchResults([]); // İsteğe bağlı olarak sonuçları temizle
  };

  return (
    <div className="relative w-full" ref={searchContainerRef}>
      <form onSubmit={handleFormSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {if (searchTerm.trim() && searchResults.length > 0) setShowResults(true);}}
          placeholder="Blog veya kullanıcı ara..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 bg-white placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={isLoading} // Sadece ilk yüklemede devre dışı bırak
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 shrink-0"
        >
          {isLoading && !isLoadingMore ? 'Aranıyor...' : 'Ara'}
        </button>
      </form>

      {error && showResults && (
        <div className="absolute left-0 right-0 mt-2 w-full bg-red-100 text-red-700 p-3 rounded-md shadow-lg z-20 border border-red-200">
          {error}
        </div>
      )}

      {showResults && searchResults.length > 0 && !error && (
        <div className="absolute left-0 right-0 mt-2 w-full bg-white rounded-md shadow-lg z-20 border border-gray-200 max-h-80 overflow-y-auto">
          <ul className="divide-y divide-gray-100">
            {searchResults.map((result) => (
              <li
                key={`${result.type}-${result.id}`} // Daha benzersiz key
                onClick={() => handleResultClick(result)}
                className="p-3 hover:bg-gray-100 cursor-pointer text-gray-800"
              >
                {result.type === 'blog' ? (
                  <div>
                    <h4 className="font-medium text-gray-900">{result.title}</h4>
                    {result.excerpt && <p className="text-sm text-gray-600 truncate">{result.excerpt}</p>}
                  </div>
                ) : ( // Kullanıcı sonucu için yeni görünüm
                  <div className="flex items-center gap-3">
                    {result.photoURL ? (
                      <img 
                        src={result.photoURL} 
                        alt={result.displayName || result.username}
                        className="w-10 h-10 rounded-full object-cover bg-gray-200" // Arka plan rengi eklendi, yüklenemezse diye
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-semibold">
                        {/* DisplayName veya username'in ilk harfi/harfleri */}
                        {(result.displayName || result.username || 'K').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{result.displayName || result.username}</h4>
                      {/* İsteğe bağlı: @kullaniciadi gibi bir şey eklenebilir */}
                      {/* {result.username && <p className="text-xs text-gray-500">@{result.username}</p>} */}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {hasMoreToFetch && !isLoadingMore && (
            <button 
              onClick={handleLoadMore} 
              className="w-full p-3 text-center text-indigo-600 hover:bg-indigo-50 font-medium"
            >
              Daha Fazla Göster
            </button>
          )}
          {isLoadingMore && (
            <div className="p-3 text-center text-gray-500">Daha fazla yükleniyor...</div>
          )}
        </div>
      )}
      {showResults && searchResults.length === 0 && searchTerm.trim() && !isLoading && !isLoadingMore && !error && (
         <div className="absolute left-0 right-0 mt-2 w-full bg-white p-3 rounded-md shadow-lg z-20 border border-gray-200 text-gray-600">
           Sonuç bulunamadı.
         </div>
      )}
    </div>
  );
};

export default SearchBar; 