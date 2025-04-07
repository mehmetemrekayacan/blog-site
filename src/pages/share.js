import React, { useState, useRef } from 'react';
import { createBlog } from '../services/blogService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Share = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `blog-images/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      
      // Görsel URL'sini state'e ekle
      setImageUrl(imageUrl);
      
      toast.success('Görsel başarıyla yüklendi!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const blogData = {
        title,
        content,
        userId: currentUser.uid,
        author: currentUser.displayName || currentUser.email.split('@')[0],
        authorPhotoURL: currentUser.photoURL,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
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
      navigate('/');
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

          {/* Görsel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blog Görseli
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploadingImage}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {uploadingImage ? 'Yükleniyor...' : 'Görsel Seç'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            {imageUrl && (
              <div className="mt-4">
                <img
                  src={imageUrl}
                  alt="Blog görseli"
                  className="max-h-48 rounded-lg object-cover"
                />
              </div>
            )}
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