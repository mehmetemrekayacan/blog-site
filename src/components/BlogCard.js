import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { deleteBlog, toggleLike } from '../services/blogService';
import { getBlogComments } from '../services/commentService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const BlogCard = ({ id, title, content, author, date, imageUrl, videoUrl, tags = [], userId, currentUser, likeCount = 0, likedBy = [], authorPhotoURL }) => {
  const [isLiked, setIsLiked] = useState(likedBy.includes(currentUser?.uid));
  const [currentLikeCount, setCurrentLikeCount] = useState(likeCount);
  const [commentCount, setCommentCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Yorum sayısını al
  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const comments = await getBlogComments(id);
        // Toplam yorum sayısını hesapla (ana yorumlar + yanıtlar)
        const totalComments = comments.reduce((total, comment) => {
          return total + 1 + (comment.replies?.length || 0);
        }, 0);
        setCommentCount(totalComments);
      } catch (error) {
        console.error('Yorum sayısı alınırken hata:', error);
      }
    };

    fetchCommentCount();
  }, [id]);

  // Menü dışına tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getEmbedUrl = (url) => {
    if (!url) return null;
    
    // YouTube URL'sini işle
    if (url.includes('youtube.com')) {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : null;
    }
    
    // Vimeo URL'sini işle
    if (url.includes('vimeo.com')) {
      const videoId = url.match(/(?:vimeo\.com\/)([^"&?\/\s]+)/);
      return videoId ? `https://player.vimeo.com/video/${videoId[1]}` : null;
    }
    
    return null;
  };

  const handleLike = async (e) => {
    e.stopPropagation(); // Tıklama olayının üst elemana yayılmasını engelle
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
      setIsLiked(newLikeState);
      setCurrentLikeCount(prevCount => newLikeState ? prevCount + 1 : prevCount - 1);
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation(); // Tıklama olayının üst elemana yayılmasını engelle
    setShowDeleteModal(false); // Modal'ı kapat
    try {
      await deleteBlog(id);
      toast.success('Blog başarıyla silindi!', {
        position: 'top-right',
        autoClose: 3000,
      });
      window.location.reload();
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation(); // Tıklama olayının üst elemana yayılmasını engelle
    navigate(`/edit/${id}`);
  };

  const handleCardClick = () => {
    navigate(`/blog/${id}`);
  };

  return (
    <>
      <div 
        onClick={handleCardClick}
        className="bg-white shadow-lg rounded-2xl p-6 mb-6 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl relative cursor-pointer"
      >
        {/* 3 Nokta Menüsü - Sadece blog sahibi görebilir */}
        {currentUser && currentUser.uid === userId && (
          <div className="absolute top-4 right-4" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {/* Menü İçeriği */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={handleEdit}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
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
                  Düzenle
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Sil
                </button>
              </div>
            )}
          </div>
        )}

        {/* Blog Görseli veya Video */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-48 object-cover rounded-t-2xl mb-4"
          />
        ) : videoUrl && getEmbedUrl(videoUrl) ? (
          <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-t-2xl mb-4">
            <iframe
              src={getEmbedUrl(videoUrl)}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              title={`${title} - Video İçeriği`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        ) : null}

        {/* Başlık */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-indigo-600 transition-colors duration-200">
          {title}
        </h2>

        {/* İçerik */}
        <p className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">{content}</p>

        {/* Yazar ve Tarih */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <img
              src={authorPhotoURL || `https://ui-avatars.com/api/?name=${author}&background=random`}
              alt={author}
              className="w-8 h-8 rounded-full object-cover"
            />
            <p className="text-gray-500 text-sm font-medium">
              Yazar: <span className="text-indigo-500">{author}</span>
            </p>
          </div>
          <p className="text-gray-400 text-xs">{date}</p>
        </div>

        {/* Etiketler */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs font-medium text-white bg-indigo-500 rounded-full px-2 py-1 hover:bg-indigo-600 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Beğenme Butonu ve Yorum Sayısı */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
              isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-400'
            }`}
          >
            <svg
              className={`w-5 h-5 ${isLiked ? 'fill-current' : 'fill-none stroke-current'}`}
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{currentLikeCount} {isLiked ? 'Beğenildi' : 'Beğen'}</span>
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-500">
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>{commentCount} Yorum</span>
          </div>
        </div>
      </div>

      {/* Silme Onay Modalı */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Blogu Silmeyi Onayla
            </h3>
            <p className="text-gray-600 mb-6">
              "{title}" başlıklı blogu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(e);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// PropTypes ile prop doğrulaması
BlogCard.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  date: PropTypes.string,
  imageUrl: PropTypes.string,
  videoUrl: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
  userId: PropTypes.string.isRequired,
  currentUser: PropTypes.object,
  likeCount: PropTypes.number,
  likedBy: PropTypes.arrayOf(PropTypes.string),
  authorPhotoURL: PropTypes.string
};

export default BlogCard;