import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Auth durumunu izle
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user ? { uid: user.uid, email: user.email, ...user } : null);
        setLoading(false);
        setError(null); // Başarılıysa hata sıfırlanır
      },
      (err) => {
        console.error('Auth state change error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Temizlik fonksiyonu
    return () => unsubscribe();
  }, []);

  // Context değerini memoize et
  const value = useMemo(
    () => ({
      currentUser,
      loading,
      error,
      isAuthenticated: !!currentUser, // Kullanıcı giriş yapmış mı?
    }),
    [currentUser, loading, error]
  );

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex justify-center items-center h-screen bg-gray-50">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-t-4 border-blue-500 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 animate-pulse">
              Yükleniyor...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-screen bg-gray-50 text-red-600">
          <p>Authentication Error: {error}</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};