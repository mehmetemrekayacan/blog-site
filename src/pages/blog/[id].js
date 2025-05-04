import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBlogById, toggleLike, deleteBlog } from '../../services/blogService';
import { createComment, getBlogComments } from '../../services/commentService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Comment from '../../components/Comment';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const blogData = await getBlogById(id);
        setBlog(blogData);
        setIsLiked(blogData.likedBy?.includes(currentUser?.uid) || false);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    const fetchComments = async () => {
      try {
        const commentsData = await getBlogComments(id);
        setComments(commentsData);
      } catch (error) {
        toast.error('Yorumlar yüklenirken bir hata oluştu.');
      } finally {
        setLoadingComments(false);
      }
    };

    fetchBlog();
    fetchComments();
  }, [id, currentUser?.uid]);

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
      setIsLiked(newLikeState);
      setBlog(prev => ({
        ...prev,
        likeCount: newLikeState ? prev.likeCount + 1 : prev.likeCount - 1
      }));
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBlog(id);
      toast.success('Blog başarıyla silindi!', {
        position: 'top-right',
        autoClose: 3000,
      });
      navigate('/');
    } catch (error) {
      toast.error(`Hata: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  const handleEdit = () => {
    navigate(`/edit/${id}`);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.info('Yorum yapabilmek için giriş yapmalısınız.');
      navigate('/login');
      return;
    }

    if (!newComment.trim()) return;

    try {
      const commentData = {
        blogId: id,
        content: newComment,
        userId: currentUser.uid,
        author: currentUser.displayName || currentUser.email.split('@')[0],
        authorPhotoURL: currentUser.photoURL
      };

      const newCommentData = await createComment(commentData);
      setComments(prevComments => [newCommentData, ...prevComments]);
      setNewComment('');
      toast.success('Yorumunuz başarıyla eklendi!');
    } catch (error) {
      console.error('Yorum ekleme hatası:', error);
      toast.error('Yorum eklenirken bir hata oluştu.');
    }
  };

  const handleCommentDelete = async (commentId) => {
    const updatedComments = comments.filter(comment => comment.id !== commentId);
    setComments(updatedComments);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <p>{error}</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="text-center p-4">
        <p>Blog bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {blog.imageUrl && (
          <img
            src={blog.imageUrl}
            alt={blog.title}
            className="w-full h-96 object-cover"
          />
        )}
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{blog.title}</h1>
            {currentUser && currentUser.uid === blog.userId && (
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Sil
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center text-gray-600 mb-4">
            <img
              src={blog.authorPhotoURL || `https://ui-avatars.com/api/?name=${blog.author}&background=random`}
              alt={blog.author}
              className="w-8 h-8 rounded-full object-cover mr-2"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${blog.author}&background=random`;
              }}
            />
            <span className="mr-4">Yazar: {blog.author}</span>
            <span>
              {blog.createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString()}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {blog.tags?.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{blog.content}</p>
          </div>

          <button
            onClick={handleLike}
            className={`flex items-center gap-2 text-lg ${
              isLiked ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            <svg
              className={`w-6 h-6 ${isLiked ? 'fill-current' : 'fill-none stroke-current'}`}
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{blog.likeCount || 0} {isLiked ? 'Beğenildi' : 'Beğen'}</span>
          </button>

          <div className="flex items-center gap-2 text-lg text-gray-500">
            <svg
              className="w-6 h-6"
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
            <span>{comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)} Yorum</span>
          </div>
        </div>

        {/* Yorumlar Bölümü */}
        <div className="p-6 border-t">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Yorumlar</h2>

          {/* Yorum Formu */}
          <form onSubmit={handleCommentSubmit} className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Yorumunuzu yazın..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows="3"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!newComment.trim()}
                className={`px-4 py-2 rounded-md text-white ${
                  !newComment.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Yorum Yap
              </button>
            </div>
          </form>

          {/* Yorumları Listele */}
          {loadingComments ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-6">
              {comments.map((comment) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  currentUser={currentUser}
                  onDelete={handleCommentDelete}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Henüz yorum yapılmamış. İlk yorumu sen yap!
            </p>
          )}
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
              "{blog.title}" başlıklı blogu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogDetail; 