import React, { useState } from 'react';
import { createBlog } from '../services/blogService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Share = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const blogData = {
        title,
        content,
        userId: currentUser.uid,
        author: currentUser.displayName || currentUser.email.split('@')[0], // Varsayılan yazar adı
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), // Etiketleri diziye çevir
        imageUrl: imageUrl || null,
        createdAt: new Date().toISOString(),
      };
      await createBlog(blogData);
      toast.success('Blog başarıyla paylaşıldı!', {
        position: 'top-right',
        autoClose: 3000,
      });
      setTitle('');
      setContent('');
      setTags('');
      setImageUrl('');
      navigate('/'); // Ana sayfaya yönlendir
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        {/* Başlık */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Blog Paylaş
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Düşüncelerinizi dünyayla paylaşın!
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Başlık */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Başlık
            </label>
            <input
              id="title"
              type="text"
              placeholder="Blog başlığınız"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
            />
          </div>

          {/* İçerik */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              İçerik
            </label>
            <textarea
              id="content"
              placeholder="Blog içeriğinizi buraya yazın..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={loading}
              rows="6"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200 resize-y"
            />
          </div>

          {/* Etiketler */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Etiketler (virgülle ayırın)
            </label>
            <input
              id="tags"
              type="text"
              placeholder="ör. teknoloji, yaşam, kodlama"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
            />
          </div>

          {/* Görsel URL */}
          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
              Görsel URL (isteğe bağlı)
            </label>
            <input
              id="imageUrl"
              type="url"
              placeholder="Blog için bir görsel URL’si ekleyin"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
            />
          </div>

          {/* Paylaş Butonu */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Paylaşılıyor...
              </span>
            ) : (
              'Paylaş'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Share;