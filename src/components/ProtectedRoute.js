import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, redirectTo = '/login', allowedRoles = [] }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Yükleme durumu
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-t-4 border-blue-500 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 animate-pulse">
            Yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  // Kullanıcı yoksa veya rol yetkisi yoksa yönlendirme
  if (!currentUser) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Rol kontrolü (opsiyonel)
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;