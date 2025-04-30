import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../services/auth';

const ProtectedRoute = ({ children, redirectTo = '/login', allowedRoles = [] }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        const adminStatus = await isAdmin(currentUser);
        setIsUserAdmin(adminStatus);
      }
      setCheckingAdmin(false);
    };

    checkAdminStatus();
  }, [currentUser]);

  // Yükleme durumu
  if (loading || checkingAdmin) {
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

  // Kullanıcı yoksa yönlendirme
  if (!currentUser) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Rol kontrolü
  if (allowedRoles.length > 0) {
    if (allowedRoles.includes('admin') && !isUserAdmin) {
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;