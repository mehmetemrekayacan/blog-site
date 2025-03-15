import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  where,
  doc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Yardımcı fonksiyon: Hata mesajlarını özelleştirme
const getFriendlyErrorMessage = (error) => {
  switch (error.code) {
    case 'permission-denied':
      return 'Bu işlem için yetkiniz yok.';
    case 'not-found':
      return 'Blog bulunamadı.';
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
    const newBlog = await addDoc(blogsRef, {
      ...blogData,
      createdAt: serverTimestamp(), // Sunucu zaman damgası
      updatedAt: serverTimestamp(), // Güncelleme zaman damgası
    });
    return newBlog.id;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Tüm blogları alma
export const getBlogs = async ({ limit = 10, filterTags = null } = {}) => {
  try {
    const blogsRef = collection(db, 'blogs');
    let q = query(blogsRef, orderBy('createdAt', 'desc'));

    // Etiket filtresi (opsiyonel)
    if (filterTags) {
      q = query(blogsRef, where('tags', 'array-contains-any', filterTags), orderBy('createdAt', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    const blogs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Limit uygulama (istemci tarafında, çünkü Firestore sorgusu limit olmadan çalıştı)
    return blogs.slice(0, limit);
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Kullanıcıya özel blogları alma
export const getUserBlogs = async (userId, { limit = 10 } = {}) => {
  if (!userId) {
    throw new Error('Kullanıcı ID’si gereklidir.');
  }

  try {
    const blogsRef = collection(db, 'blogs');
    const q = query(
      blogsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const blogs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return blogs.slice(0, limit);
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Blog silme
export const deleteBlog = async (blogId) => {
  if (!blogId) {
    throw new Error('Blog ID’si gereklidir.');
  }

  try {
    const blogRef = doc(db, 'blogs', blogId);
    await deleteDoc(blogRef);
    return true; // Başarılı silme için geri dönüş
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};