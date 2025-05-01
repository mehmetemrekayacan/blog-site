import React, { useState, useEffect } from 'react';
import { deleteComment, addReply, toggleCommentLike } from '../services/commentService';
import { toast } from 'react-toastify';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Link } from 'react-router-dom';

const Comment = ({ comment, currentUser, onDelete, onEdit }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isLiked, setIsLiked] = useState(comment.likedBy?.includes(currentUser?.uid));
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [replies, setReplies] = useState(comment.replies || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  useEffect(() => {
    setReplies(comment.replies || []);
  }, [comment.replies]);

  const formatDate = (date) => {
    if (!date) return '';
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
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

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', comment.id), { content: editContent });
      setIsEditing(false);
      if (onEdit) onEdit(comment.id, editContent);
      toast.success('Yorum güncellendi!');
    } catch (error) {
      toast.error('Yorum güncellenirken bir hata oluştu.');
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
      const updatedReplies = replies.filter(r => r.id !== replyId);
      await updateDoc(doc(db, 'comments', comment.id), { replies: updatedReplies });
      setReplies(updatedReplies);
      toast.success('Yanıt başarıyla silindi!');
    } catch (error) {
      toast.error('Yanıt silinirken bir hata oluştu.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-4">
      <div className="flex items-center mb-2">
        <Link to={`/profile/${comment.userId}`} className="flex-shrink-0 mr-2">
          {(comment.userPhotoURL || comment.authorPhotoURL) ? (
            <img
              src={comment.userPhotoURL || comment.authorPhotoURL}
              alt={comment.userName || comment.author}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-base font-bold text-white">
              {(comment.userName || comment.author)?.slice(0,2).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex flex-col justify-center">
          <Link to={`/profile/${comment.userId}`} className="font-semibold text-gray-900 hover:text-indigo-600 leading-tight">
            {comment.userName || comment.author}
          </Link>
          <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          {currentUser && (currentUser.uid === comment.userId || currentUser.isAdmin) && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-blue-500 hover:text-blue-700 px-1"
                title="Düzenle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 00-4-4l-8 8v3z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 px-1"
                title="Sil"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="mt-2 flex flex-col space-y-2">
          <textarea
            className="w-full border rounded p-2"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={2}
          />
          <div className="flex space-x-2">
            <button onClick={handleEdit} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Kaydet</button>
            <button onClick={() => setIsEditing(false)} className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400">İptal</button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-gray-700">{comment.content}</p>
      )}
      <div className="flex items-center mt-2 space-x-4">
        <button onClick={handleLike} className={`text-sm ${isLiked ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-700`}>
          Beğen ({likeCount})
        </button>
        <button onClick={() => setShowReplyForm(!showReplyForm)} className="text-sm text-gray-500 hover:text-indigo-700">
          Yanıtla
        </button>
      </div>
      {showReplyForm && (
        <form onSubmit={handleReply} className="mt-2 flex flex-col space-y-2">
          <textarea
            className="w-full border rounded p-2"
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            rows={2}
            placeholder="Yanıtınızı yazın..."
          />
          <div className="flex space-x-2">
            <button type="submit" disabled={isSubmitting} className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">
              {isSubmitting ? 'Gönderiliyor...' : 'Yanıtla'}
            </button>
            <button type="button" onClick={() => setShowReplyForm(false)} className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400">İptal</button>
          </div>
        </form>
      )}
      {/* Yanıtlar */}
      {replies.length > 0 && (
        <div className="mt-4 space-y-2">
          {replies.map(reply => (
            <div key={reply.id} className="flex items-start space-x-2 bg-gray-50 p-2 rounded">
              <Link to={`/profile/${reply.userId}`} className="flex-shrink-0">
                {reply.authorPhotoURL ? (
                  <img src={reply.authorPhotoURL} alt={reply.author} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-white">
                    {reply.author?.slice(0,2).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <Link to={`/profile/${reply.userId}`} className="font-semibold text-gray-800 hover:text-indigo-600 text-sm">
                    {reply.author}
                  </Link>
                  {(currentUser && (currentUser.uid === reply.userId || currentUser.isAdmin)) && (
                    <button onClick={() => handleDeleteReply(reply.id)} className="text-xs text-red-500 hover:text-red-700 ml-2">Sil</button>
                  )}
                </div>
                <div className="text-gray-700 text-sm mt-1">{reply.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Comment; 