import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pagess
import Home from "./pages";
import Login from "./pages/login";
import Register from "./pages/register";
import Profile from "./pages/profile";
import Share from "./pages/share";

// Components
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
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
            </Routes>
          </div>
          <ToastContainer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
