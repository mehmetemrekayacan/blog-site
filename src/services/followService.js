import { db } from './firebase';
import { doc, getDoc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';

// Bir kullanıcıyı takip etme
export const followUser = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    throw new Error('Geçersiz kullanıcı IDleri veya kendi kendini takip etme işlemi.');
  }

  const batch = writeBatch(db);

  // 1. currentUserId'nin following alt koleksiyonuna targetUserId'yi ekle
  const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
  batch.set(followingRef, { createdAt: serverTimestamp() });

  // 2. targetUserId'nin followers alt koleksiyonuna currentUserId'yi ekle
  const followerRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
  batch.set(followerRef, { createdAt: serverTimestamp() });

  // 3. currentUserId'nin ana dokümanındaki followingCount'u artır
  const currentUserDocRef = doc(db, 'users', currentUserId);
  batch.update(currentUserDocRef, { followingCount: increment(1) });

  // 4. targetUserId'nin ana dokümanındaki followerCount'u artır
  const targetUserDocRef = doc(db, 'users', targetUserId);
  batch.update(targetUserDocRef, { followerCount: increment(1) });

  try {
    await batch.commit();
  } catch (error) {
    console.error("Takip etme hatası:", error);
    throw new Error('Kullanıcı takip edilirken bir sorun oluştu.');
  }
};

// Bir kullanıcının takibini bırakma
export const unfollowUser = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) {
    throw new Error('Geçersiz kullanıcı IDleri.');
  }

  const batch = writeBatch(db);

  // 1. currentUserId'nin following alt koleksiyonundan targetUserId'yi sil
  const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
  batch.delete(followingRef);

  // 2. targetUserId'nin followers alt koleksiyonundan currentUserId'yi sil
  const followerRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
  batch.delete(followerRef);

  // 3. currentUserId'nin ana dokümanındaki followingCount'u azalt
  const currentUserDocRef = doc(db, 'users', currentUserId);
  batch.update(currentUserDocRef, { followingCount: increment(-1) });

  // 4. targetUserId'nin ana dokümanındaki followerCount'u azalt
  const targetUserDocRef = doc(db, 'users', targetUserId);
  batch.update(targetUserDocRef, { followerCount: increment(-1) });

  try {
    await batch.commit();
  } catch (error) {
    console.error("Takibi bırakma hatası:", error);
    throw new Error('Kullanıcı takibi bırakılırken bir sorun oluştu.');
  }
};

// Bir kullanıcının başka bir kullanıcıyı takip edip etmediğini kontrol etme
export const checkFollowingStatus = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) {
    return false; // ID'ler eksikse takip etmiyor varsay
  }
  try {
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    const docSnap = await getDoc(followingRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Takip durumu kontrol hatası:", error);
    return false; // Hata durumunda takip etmiyor varsay
  }
}; 