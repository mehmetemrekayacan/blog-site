import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser, isAdmin } from "../services/auth";
import { toast } from "react-toastify";
import SearchBar from "./SearchBar";

const Navbar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        const adminStatus = await isAdmin(currentUser);
        setIsUserAdmin(adminStatus);
      }
    };
    checkAdminStatus();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success("Başarıyla çıkış yapıldı!", {
        position: "top-right",
        autoClose: 3000,
      });
      navigate("/login");
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex justify-between items-center w-full md:w-auto">
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-bold tracking-tight hover:text-indigo-200 transition-colors duration-200"
        >
          BlogSphere
        </Link>

        {/* Hamburger Menü (Mobil için) */}
        <button
          className="md:hidden text-2xl focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? "✖" : "☰"}
        </button>
        </div>

        {/* SearchBar - Doğrudan Navbar içinde */}
        {/* Mobil için w-full, masaüstünde ortada ve belirli bir genişlikte */}
        <div className="w-full md:w-auto md:flex-grow md:max-w-lg order-2"> {/* order-2: Logo'dan sonra, Menü'den önce */}
          <SearchBar />
        </div>

        {/* Menü Öğeleri */}
        <div
          className={`w-full md:w-auto order-3 ${
            isMenuOpen ? "flex" : "hidden"
          } md:flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 absolute md:static top-full left-0 md:top-auto md:left-auto bg-blue-600 md:bg-transparent p-4 md:p-0 transition-all duration-300 mt-1 md:mt-0`}
        >
          {currentUser ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2 hover:text-indigo-200 transition-colors duration-200"
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profil
              </Link>
              <Link
                to="/share"
                className="flex items-center gap-2 hover:text-indigo-200 transition-colors duration-200"
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
                Paylaş
              </Link>
              {isUserAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 hover:text-indigo-200 transition-colors duration-200"
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
                      d="M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Admin Paneli
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hover:text-indigo-200 transition-colors duration-200"
              >
                Giriş Yap
              </Link>
              <Link
                to="/register"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
              >
                Kayıt Ol
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
