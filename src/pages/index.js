import React, { useEffect, useState } from 'react';
import { getBlogs } from '../services/blogService';
import BlogCard from '../components/BlogCard';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const blogList = await getBlogs();
        setBlogs(blogList || []);
        setError(null);
      } catch (error) {
        console.error('Bloglar yüklenirken hata oluştu:', error);
        setError(error.message || 'Bloglar yüklenemedi. Lütfen daha sonra tekrar deneyin.');
        toast.error(error.message || 'Bloglar yüklenirken bir hata oluştu!', {
          position: 'top-right',
          autoClose: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          Blog Akışı
        </h1>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-t-4 border-blue-500 border-t-indigo-600 rounded-full animate-spin"></div>
              <span className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 animate-pulse">
                Yükleniyor...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!loading && !error && blogs.length === 0 && (
          <p className="text-center text-gray-500 text-lg">
            Henüz blog yazısı yok. İlk yazıyı sen paylaşmaya ne dersin?
          </p>
        )}

        {!loading && !error && blogs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <BlogCard
                key={blog.id}
                id={blog.id}
                title={blog.title}
                content={blog.content}
                author={blog.author}
                date={blog.createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString()}
                imageUrl={blog.imageUrl}
                tags={blog.tags || []}
                userId={blog.userId}
                currentUser={currentUser}
                likeCount={blog.likeCount || 0}
                likedBy={blog.likedBy || []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;