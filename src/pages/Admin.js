import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, deleteUserByAdmin, isAdmin } from '../services/auth';
import { getBlogs } from '../services/blogService';
import { getDocs, collection, query, where, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AdminPanel = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBlogs, setUserBlogs] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [userReplies, setUserReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAndLoadUsers = async () => {
      try {
        const adminStatus = await isAdmin(currentUser);
        if (!adminStatus) {
          toast.error('Bu sayfaya erişim yetkiniz yok!');
          navigate('/');
          return;
        }
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        toast.error('Kullanıcılar yüklenirken bir hata oluştu: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    checkAdminAndLoadUsers();
  }, [currentUser, navigate]);

  // Kullanıcıya ait blogları getir
  const handleShowBlogs = async (userId) => {
    setLoadingContent(true);
    setSelectedUser(userId);
    try {
      const blogsRef = collection(db, 'blogs');
      const q = query(blogsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setUserBlogs(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUserComments([]);
      setUserReplies([]);
    } catch (error) {
      toast.error('Bloglar yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoadingContent(false);
    }
  };

  // Kullanıcıya ait yorumları getir
  const handleShowComments = async (userId) => {
    setLoadingContent(true);
    setSelectedUser(userId);
    try {
      const commentsRef = collection(db, 'comments');
      const q = query(commentsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setUserComments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUserBlogs([]);
      setUserReplies([]);
    } catch (error) {
      toast.error('Yorumlar yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoadingContent(false);
    }
  };

  // Kullanıcıya ait yanıtları getir
  const handleShowReplies = async (userId) => {
    setLoadingContent(true);
    setSelectedUser(userId);
    try {
      const commentsRef = collection(db, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      // Tüm yorumlar içinden bu kullanıcıya ait yanıtları bul
      const allReplies = [];
      querySnapshot.docs.forEach(docSnap => {
        const comment = docSnap.data();
        if (comment.replies && Array.isArray(comment.replies)) {
          comment.replies.forEach(reply => {
            if (reply.userId === userId) {
              allReplies.push({ ...reply, commentId: docSnap.id, blogId: comment.blogId });
            }
          });
        }
      });
      setUserReplies(allReplies);
      setUserBlogs([]);
      setUserComments([]);
    } catch (error) {
      toast.error('Yanıtlar yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoadingContent(false);
    }
  };

  // Blog silme
  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Bu blogu silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, 'blogs', blogId));
      setUserBlogs(userBlogs.filter(blog => blog.id !== blogId));
      toast.success('Blog başarıyla silindi!');
    } catch (error) {
      toast.error('Blog silinirken bir hata oluştu: ' + error.message);
    }
  };

  // Yorum silme
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      setUserComments(userComments.filter(comment => comment.id !== commentId));
      toast.success('Yorum başarıyla silindi!');
    } catch (error) {
      toast.error('Yorum silinirken bir hata oluştu: ' + error.message);
    }
  };

  // Yanıt silme
  const handleDeleteReply = async (commentId, replyId) => {
    if (!window.confirm('Bu yanıtı silmek istediğinizden emin misiniz?')) return;
    try {
      const commentRef = doc(db, 'comments', commentId);
      const commentSnap = await getDocs(query(collection(db, 'comments'), where('__name__', '==', commentId)));
      if (!commentSnap.empty) {
        const commentDoc = commentSnap.docs[0];
        const replies = commentDoc.data().replies || [];
        const updatedReplies = replies.filter(r => r.id !== replyId);
        await updateDoc(commentRef, { replies: updatedReplies });
        setUserReplies(userReplies.filter(r => r.id !== replyId));
        toast.success('Yanıt başarıyla silindi!');
      }
    } catch (error) {
      toast.error('Yanıt silinirken bir hata oluştu: ' + error.message);
    }
  };

  // Kullanıcı silme
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı ve tüm içeriklerini silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteUserByAdmin(userId);
      setUsers(users.filter(user => user.id !== userId));
      toast.success('Kullanıcı ve tüm içerikleri başarıyla silindi!');
    } catch (error) {
      toast.error('Kullanıcı silinirken bir hata oluştu: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-t-4 border-blue-500 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 animate-pulse">
            Yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Paneli</h1>
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Kullanıcılar</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.displayName || 'İsimsiz Kullanıcı'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2">
                    <button
                      onClick={() => handleShowBlogs(user.id)}
                      className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md transition-colors"
                    >
                      Bloglar
                    </button>
                    <button
                      onClick={() => handleShowComments(user.id)}
                      className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md transition-colors"
                    >
                      Yorumlar
                    </button>
                    <button
                      onClick={() => handleShowReplies(user.id)}
                      className="text-purple-600 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1 rounded-md transition-colors"
                    >
                      Yanıtlar
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md transition-colors"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seçili kullanıcının içerikleri */}
      {selectedUser && (
        <div className="mb-12">
          {loadingContent ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <>
              {userBlogs.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-2">Kullanıcının Blogları</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlık</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userBlogs.map((blog) => (
                        <tr key={blog.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{blog.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{blog.createdAt?.toDate?.().toLocaleDateString?.() || 'Bilinmiyor'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2">
                            <button
                              onClick={() => navigate(`/blog/${blog.id}`)}
                              className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded-md transition-colors"
                            >
                              Görüntüle
                            </button>
                            <button
                              onClick={() => handleDeleteBlog(blog.id)}
                              className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md transition-colors"
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {userComments.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-2">Kullanıcının Yorumları</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yorum</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blog ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userComments.map((comment) => (
                        <tr key={comment.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{comment.content}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{comment.blogId}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{comment.createdAt?.toDate?.().toLocaleDateString?.() || 'Bilinmiyor'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md transition-colors"
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {userReplies.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-2">Kullanıcının Yanıtları</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yanıt</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blog ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yorum ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userReplies.map((reply) => (
                        <tr key={reply.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{reply.content}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{reply.blogId}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{reply.commentId}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{reply.createdAt ? (reply.createdAt.toLocaleDateString ? reply.createdAt.toLocaleDateString() : new Date(reply.createdAt).toLocaleDateString()) : 'Bilinmiyor'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteReply(reply.commentId, reply.id)}
                              className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md transition-colors"
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {userBlogs.length === 0 && userComments.length === 0 && userReplies.length === 0 && (
                <div className="text-center text-gray-500">Bu kullanıcıya ait içerik bulunamadı.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel; 