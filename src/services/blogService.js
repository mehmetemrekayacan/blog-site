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
  getDoc,
  updateDoc,
  increment,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeTurkishChars } from '../utils/textUtils';

// Yardımcı fonksiyon: Hata mesajlarını özelleştirme
const getFriendlyErrorMessage = (error) => {
  switch (error.code) {
    case 'permission-denied':
      return 'Bu işlem için yetkiniz yok.';
    case 'not-found':
      return 'Blog veya kullanıcı bulunamadı.';
    case 'unavailable':
      return 'Servis şu anda kullanılamıyor, lütfen daha sonra tekrar deneyin.';
    default:
      return error.message || 'Bir hata oluştu, lütfen tekrar deneyin.';
  }
};

// Yeni blog oluşturma
export const createBlog = async (blogData) => {
  try {
    const blogsRef = collection(db, 'blogs');
    const title = blogData.title || '';
    const dataToSave = {
      ...blogData,
      title: title, // Orijinal başlık
      title_lowercase: title.toLowerCase(),
      title_normalized: normalizeTurkishChars(title), // Normalize edilmiş başlık
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likeCount: 0,
      likedBy: []
    };
    const newBlog = await addDoc(blogsRef, dataToSave);
    return newBlog.id;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Blog beğenme/beğeniyi geri çekme
export const toggleLike = async (blogId, userId) => {
  if (!blogId || !userId) {
    throw new Error("Blog ID'si ve kullanıcı ID'si gereklidir.");
  }

  try {
    const blogRef = doc(db, 'blogs', blogId);
    const blogDoc = await getDoc(blogRef);

    if (!blogDoc.exists()) {
      throw new Error('Blog bulunamadı.');
    }

    const blogData = blogDoc.data();
    const likedBy = blogData.likedBy || [];
    const isLiked = likedBy.includes(userId);

    if (isLiked) {
      // Beğeniyi geri çek
      await updateDoc(blogRef, {
        likeCount: increment(-1),
        likedBy: likedBy.filter(id => id !== userId)
      });
    } else {
      // Beğeni ekle
      await updateDoc(blogRef, {
        likeCount: increment(1),
        likedBy: [...likedBy, userId]
      });
    }

    return !isLiked; // Yeni beğeni durumunu döndür
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Tüm blogları alma
export const getBlogs = async ({ limit = 10, filterTags = null } = {}) => {
  try {
    const blogsRef = collection(db, 'blogs');
    let q = query(blogsRef, orderBy('createdAt', 'desc'), firestoreLimit(limit));

    // Etiket filtresi (opsiyonel)
    if (filterTags) {
      q = query(blogsRef, 
        where('tags', 'array-contains-any', filterTags), 
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );
    }

    const querySnapshot = await getDocs(q);
    const blogs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return blogs;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Kullanıcıya özel blogları alma
export const getUserBlogs = async (userId, { limit = 10 } = {}) => {
  if (!userId) {
    throw new Error("Kullanıcı ID'si gereklidir.");
  }

  try {
    const blogsRef = collection(db, 'blogs');
    const q = query(
      blogsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    const querySnapshot = await getDocs(q);
    const blogs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return blogs;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Blog silme
export const deleteBlog = async (blogId) => {
  if (!blogId) {
    throw new Error("Blog ID'si gereklidir.");
  }

  try {
    const blogRef = doc(db, 'blogs', blogId);
    await deleteDoc(blogRef);
    return true; // Başarılı silme için geri dönüş
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Blog güncelleme
export const updateBlog = async (blogId, blogData) => {
  if (!blogId) {
    throw new Error("Blog ID'si gereklidir.");
  }

  try {
    const blogRef = doc(db, 'blogs', blogId);
    // Güncellenecek dokümanın varlığını kontrol etmeye gerek yok, updateDoc hata verecektir.
    // Ancak yine de kontrol etmek isterseniz eski kod kalabilir.

    const dataToUpdate = {
      ...blogData,
      updatedAt: serverTimestamp(),
    };

    // Eğer başlık güncelleniyorsa, title_lowercase ve title_normalized da güncelle
    if (blogData.title) {
      const title = blogData.title;
      dataToUpdate.title_lowercase = title.toLowerCase();
      dataToUpdate.title_normalized = normalizeTurkishChars(title);
    } else if (blogData.hasOwnProperty('title') && blogData.title === '') {
      // Başlık kasıtlı olarak boşaltılıyorsa normalize edilmiş alanları da boşalt
      dataToUpdate.title_lowercase = '';
      dataToUpdate.title_normalized = '';
    }

    await updateDoc(blogRef, dataToUpdate);
    return true;
  } catch (error) {
    // Firestore'dan gelen hatayı doğrudan veya özelleştirilmiş mesajla fırlat
    if (error.code === 'not-found') {
        throw new Error('Güncellenmek istenen blog bulunamadı.');
    }
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Tek bir blog getirme
export const getBlogById = async (blogId) => {
  if (!blogId) {
    throw new Error("Blog ID'si gereklidir.");
  }

  try {
    const blogRef = doc(db, 'blogs', blogId);
    const blogDoc = await getDoc(blogRef);

    if (!blogDoc.exists()) {
      throw new Error('Blog bulunamadı.');
    }

    return {
      id: blogDoc.id,
      ...blogDoc.data(),
    };
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};