import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  where,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export const createBlog = async (blogData) => {
  try {
    const blogsRef = collection(db, 'blogs');
    const newBlog = await addDoc(blogsRef, {
      ...blogData,
      createdAt: new Date().toISOString()
    });
    return newBlog.id;
  } catch (error) {
    throw error;
  }
};

export const getBlogs = async () => {
  try {
    const blogsRef = collection(db, 'blogs');
    const q = query(blogsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

export const getUserBlogs = async (userId) => {
  try {
    const blogsRef = collection(db, 'blogs');
    const q = query(
      blogsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

export const deleteBlog = async (blogId) => {
  try {
    const blogRef = doc(db, 'blogs', blogId);
    await deleteDoc(blogRef);
  } catch (error) {
    throw error;
  }
}; 