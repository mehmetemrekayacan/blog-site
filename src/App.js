import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import { HelmetProvider } from 'react-helmet-async';
import { Suspense, lazy } from 'react';
import "react-toastify/dist/ReactToastify.css";

// Components
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy loading ile sayfa bileşenlerini dinamik olarak yükleme
const Home = lazy(() => import("./pages"));
const Login = lazy(() => import("./pages/login"));
const Register = lazy(() => import("./pages/register"));
const Profile = lazy(() => import("./pages/profile"));
const Share = lazy(() => import("./pages/share"));
const Edit = lazy(() => import("./pages/edit"));
const BlogDetail = lazy(() => import("./pages/blog/[id]"));
const AdminPanel = lazy(() => import("./pages/Admin"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const Settings = lazy(() => import('./pages/settings'));

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
              <Suspense fallback={<div className="flex justify-center items-center h-64">Yükleniyor...</div>}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/blog/:id" element={<BlogDetail />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/share"
                    element={
                      <ProtectedRoute>
                        <Share />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit/:id"
                    element={
                      <ProtectedRoute>
                        <Edit />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminPanel />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Suspense>
            </div>
            <ToastContainer />
          </div>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
