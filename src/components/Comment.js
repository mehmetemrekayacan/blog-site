import React, { useState, useEffect } from 'react';
import { deleteComment, addReply, toggleCommentLike } from '../services/commentService';
import { toast } from 'react-toastify';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const Comment = ({ comment, currentUser, onDelete }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isLiked, setIsLiked] = useState(comment.likedBy?.includes(currentUser?.uid));
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [replies, setReplies] = useState(comment.replies || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setReplies(comment.replies || []);
  }, [comment.replies]);

  const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString();
  };

  const handleDelete = async () => {
    if (!window.confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteComment(comment.id);
      onDelete(comment.id);
      toast.success('Yorum başarıyla silindi!');
    } catch (error) {
      console.error('Yorum silme hatası:', error);
      toast.error('Yorum silinirken bir hata oluştu.');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    if (!currentUser) {
      toast.info('Yanıt yazabilmek için giriş yapmalısınız.');
      return;
    }

    setIsSubmitting(true);
    try {
      const replyData = {
        content: replyContent,
        userId: currentUser.uid,
        author: currentUser.displayName || currentUser.email.split('@')[0],
        authorPhotoURL: currentUser.photoURL
      };

      const newReply = await addReply(comment.id, replyData);
      setReplies(prevReplies => [...prevReplies, newReply]);
      setReplyContent('');
      setShowReplyForm(false);
      toast.success('Yanıt başarıyla eklendi!');
    } catch (error) {
      console.error('Yanıt ekleme hatası:', error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast.info('Beğeni yapabilmek için giriş yapmalısınız.');
      return;
    }

    try {
      const newLikeState = await toggleCommentLike(comment.id, currentUser.uid);
      setIsLiked(newLikeState);
      setLikeCount(prev => newLikeState ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Beğeni işlemi hatası:', error);
      toast.error('Beğeni işlemi sırasında bir hata oluştu.');
    }
  };

  // Yanıt silme (sadece admin veya yanıt sahibi için)
  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Bu yanıtı silmek istediğinizden emin misiniz?')) return;
    try {
      // Yanıtı replies dizisinden çıkar
      const updatedReplies = replies.filter(r => r.id !== replyId);
      await updateDoc(doc(db, 'comments', comment.id), { replies: updatedReplies });
      setReplies(updatedReplies);
      toast.success('Yanıt başarıyla silindi!');
    } catch (error) {
      toast.error('Yanıt silinirken bir hata oluştu.');
    }
  };

  return (
    <div className="border-l-4 border-indigo-500 pl-4 mb-4">
      <div className="flex items-start gap-2">
        <img
          src={comment.authorPhotoURL || `https://ui-avatars.com/api/?name=${comment.author}&background=random`}
          alt={comment.author}
          className="w-8 h-8 rounded-full"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://ui-avatars.com/api/?name=${comment.author}&background=random`;
          }}
        />
        <div className="flex-1">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium text-gray-900">{comment.author}</span>
              <span className="text-sm text-gray-500">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-gray-700">{comment.content}</p>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-sm ${
                isLiked ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              <svg
                className={`w-4 h-4 ${isLiked ? 'fill-current' : 'fill-none stroke-current'}`}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{likeCount}</span>
            </button>

            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Yanıtla
            </button>

            {currentUser && currentUser.uid === comment.userId && (
              <button
                onClick={handleDelete}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Sil
              </button>
            )}
          </div>

          {showReplyForm && (
            <form onSubmit={handleReply} className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Yanıtınızı yazın..."
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows="2"
                disabled={isSubmitting}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowReplyForm(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  disabled={isSubmitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm text-white bg-indigo-500 rounded hover:bg-indigo-600 disabled:bg-gray-400"
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Yanıtla'}
                </button>
              </div>
            </form>
          )}

          {/* Yanıtları Göster */}
          {replies.length > 0 && (
            <div className="ml-8 mt-4 space-y-4">
              {replies.map((reply) => (
                <div key={reply.id} className="border-l-4 border-gray-300 pl-4">
                  <div className="flex items-start gap-2">
                    <img
                      src={reply.authorPhotoURL || `https://ui-avatars.com/api/?name=${reply.author}&background=random`}
                      alt={reply.author}
                      className="w-6 h-6 rounded-full"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${reply.author}&background=random`;
                      }}
                    />
                    <div className="flex-1">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-gray-900 text-sm">{reply.author}</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{reply.content}</p>
                        {/* Yanıt silme butonu */}
                        {currentUser && (currentUser.uid === reply.userId || currentUser.isAdmin) && (
                          <button
                            onClick={() => handleDeleteReply(reply.id)}
                            className="text-xs text-red-500 hover:text-red-600 mt-1"
                          >
                            Yanıtı Sil
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comment; 