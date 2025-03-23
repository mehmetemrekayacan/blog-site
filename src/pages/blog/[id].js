import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getBlogById, toggleLike } from '../../services/blogService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const BlogDetail = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        const blogData = await getBlogById(id);
        setBlog(blogData);
        setError(null);
      } catch (error) {
        console.error('Blog yüklenirken hata oluştu:', error);
        setError(error.message || 'Blog yüklenemedi.');
        toast.error('Blog yüklenirken bir hata oluştu!', {
          position: 'top-right',
          autoClose: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  const handleLike = async () => {
    if (!currentUser) {
      toast.info('Beğeni yapabilmek için giriş yapmalısınız.', {
        position: 'top-right',
        autoClose: 3000,
      });
      navigate('/login');
      return;
    }

    try {
      const newLikeState = await toggleLike(id, currentUser.uid);
      setBlog(prev => ({
        ...prev,
        isLiked: newLikeState,
        likeCount: newLikeState ? prev.likeCount + 1 : prev.likeCount - 1
      }));
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-t-4 border-blue-500 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 animate-pulse">
            Yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Hata!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Uyarı!</strong>
          <span className="block sm:inline"> Blog bulunamadı.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <article className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Blog Görseli */}
        {blog.imageUrl && (
          <img
            src={blog.imageUrl}
            alt={blog.title}
            className="w-full h-96 object-cover"
          />
        )}

        <div className="p-8">
          {/* Başlık */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {blog.title}
          </h1>

          {/* Yazar ve Tarih */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <span className="text-gray-600 font-medium">
                Yazar: <span className="text-indigo-600">{blog.author}</span>
              </span>
            </div>
            <span className="text-gray-500">
              {blog.createdAt?.toDate().toLocaleDateString('tr-TR')}
            </span>
          </div>

          {/* Etiketler */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {blog.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* İçerik */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {blog.content}
            </p>
          </div>

          {/* Beğeni Butonu */}
          <div className="flex items-center justify-between border-t pt-6">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 text-lg font-medium transition-colors duration-200 ${
                blog.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-400'
              }`}
            >
              <svg
                className={`w-6 h-6 ${blog.isLiked ? 'fill-current' : 'fill-none stroke-current'}`}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{blog.likeCount || 0} {blog.isLiked ? 'Beğenildi' : 'Beğen'}</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};

export default BlogDetail; 