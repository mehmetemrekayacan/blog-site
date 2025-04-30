import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  where,
  doc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Yorum ekleme
export const createComment = async (commentData) => {
  try {
    const commentsRef = collection(db, 'comments');
    const newComment = await addDoc(commentsRef, {
      ...commentData,
      createdAt: serverTimestamp(),
      likeCount: 0,
      likedBy: [],
      replies: []
    });

    // Yeni eklenen yorumu getir
    const commentDoc = await getDoc(doc(db, 'comments', newComment.id));
    return {
      id: newComment.id,
      ...commentDoc.data()
    };
  } catch (error) {
    console.error('Yorum ekleme hatası:', error);
    throw new Error('Yorum eklenirken bir hata oluştu.');
  }
};

// Blog için yorumları getirme
export const getBlogComments = async (blogId) => {
  try {
    const commentsRef = collection(db, 'comments');
    const q = query(
      commentsRef,
      where('blogId', '==', blogId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const comments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
    return comments;
  } catch (error) {
    console.error('Yorumları getirme hatası:', error);
    throw new Error('Yorumlar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
  }
};

// Yorum silme
export const deleteComment = async (commentId) => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    await deleteDoc(commentRef);
    return true;
  } catch (error) {
    console.error('Yorum silme hatası:', error);
    throw new Error('Yorum silinirken bir hata oluştu.');
  }
};

// Yoruma yanıt ekleme
export const addReply = async (commentId, replyData) => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);
    
    if (!commentDoc.exists()) {
      throw new Error('Yorum bulunamadı');
    }

    const comment = commentDoc.data();
    const currentReplies = comment.replies || [];
    const newReply = {
      id: Date.now().toString(),
      content: replyData.content,
      userId: replyData.userId,
      author: replyData.author,
      authorPhotoURL: replyData.authorPhotoURL,
      createdAt: new Date()
    };

    await updateDoc(commentRef, {
      replies: [...currentReplies, newReply]
    });

    return newReply;
  } catch (error) {
    console.error('Yanıt ekleme hatası:', error);
    throw new Error('Yanıt eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
  }
};

// Yorum beğenme/beğenmeme
export const toggleCommentLike = async (commentId, userId) => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);
    
    if (!commentDoc.exists()) {
      throw new Error('Yorum bulunamadı');
    }

    const commentData = commentDoc.data();
    const likedBy = commentData.likedBy || [];
    
    if (likedBy.includes(userId)) {
      await updateDoc(commentRef, {
        likeCount: increment(-1),
        likedBy: likedBy.filter(id => id !== userId)
      });
      return false;
    } else {
      await updateDoc(commentRef, {
        likeCount: increment(1),
        likedBy: [...likedBy, userId]
      });
      return true;
    }
  } catch (error) {
    console.error('Beğeni işlemi hatası:', error);
    throw new Error('Beğeni işlemi sırasında bir hata oluştu.');
  }
}; 