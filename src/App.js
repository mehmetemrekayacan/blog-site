import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import { HelmetProvider } from 'react-helmet-async';
import "react-toastify/dist/ReactToastify.css";

// Pages
import Home from "./pages";
import Login from "./pages/login";
import Register from "./pages/register";
import Profile from "./pages/profile";
import Share from "./pages/share";
import Edit from "./pages/edit";
import BlogDetail from "./pages/blog/[id]";
import { AdminPanel } from "./pages/Admin";
import Unauthorized from "./pages/Unauthorized";

// Components
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
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
              </Routes>
            </div>
            <ToastContainer />
          </div>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
