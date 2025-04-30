import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from './firebase';
import { getDoc, doc, getDocs, collection, deleteDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Yardımcı fonksiyon: Hata mesajlarını özelleştirme
const getFriendlyErrorMessage = (error) => {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanımda.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.';
    case 'auth/weak-password':
      return 'Şifre çok zayıf, en az 6 karakter olmalı.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-posta veya şifre hatalı.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yaptınız, lütfen bir süre bekleyin.';
    case 'auth/requires-recent-login':
      return 'Bu işlem için tekrar giriş yapmanız gerekiyor.';
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmış.';
    default:
      return error.message || 'Bir hata oluştu, lütfen tekrar deneyin.';
  }
};

// Kullanıcı kaydı
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Kullanıcı profilini güncelle
    await updateProfile(user, { displayName });

    // Firestore'da kullanıcı dokümanı oluştur
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName,
      createdAt: serverTimestamp(),
      isAdmin: false // Varsayılan olarak admin değil
    });

    // E-posta doğrulama gönder
    await sendEmailVerification(user);

    // Kayıt sonrası otomatik giriş yapılmasını engellemek için çıkış yap
    await signOut(auth);

    return user;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Kullanıcı girişi
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await signOut(auth);
      try {
        await sendEmailVerification(user);
        throw new Error('Lütfen e-posta adresinizi doğrulayın. Yeni bir doğrulama e-postası gönderildi.');
      } catch (verificationError) {
        throw new Error('Lütfen e-posta adresinizi doğrulayın. Gelen kutunuzu kontrol edin.');
      }
    }

    return user;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw { code: 'user-not-found', message: 'Böyle bir hesap bulunamadı.' };
    }
    if (error.code === 'auth/wrong-password') {
      throw { code: 'wrong-password', message: 'Şifreniz yanlış, lütfen şifrenizi doğru girin.' };
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Çok fazla başarısız giriş denemesi. Lütfen bir süre bekleyin.');
    }
    if (error.code === 'auth/user-disabled') {
      throw new Error('Bu hesap devre dışı bırakılmış.');
    }
    throw new Error(error.message || 'Giriş yapılırken bir hata oluştu.');
  }
};

// Kullanıcı çıkışı
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Mevcut kullanıcıyı silme
export const deleteCurrentUser = async (password) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Şu anda oturum açmış bir kullanıcı yok.');
  }

  try {
    // Önce kimlik doğrulama yap
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    
    // Sonra kullanıcıyı sil
    await deleteUser(user);
    return true;
  } catch (error) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Hesabı silmek için tekrar giriş yapmanız gerekiyor. Lütfen tekrar giriş yapıp deneyin.');
    }
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Kullanıcı profilini güncelleme
export const updateUserProfile = async (displayName, photoURL) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Şu anda oturum açmış bir kullanıcı yok.');
  }

  try {
    await updateProfile(user, { displayName, photoURL });
    return user;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

// Admin kontrolü
export const isAdmin = async (user) => {
  if (!user) return false;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      // Eğer kullanıcı dokümanı yoksa oluştur
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName,
        createdAt: serverTimestamp(),
        isAdmin: false
      });
      return false;
    }
    
    const userData = userDoc.data();
    return userData.isAdmin === true;
  } catch (error) {
    console.error('Admin kontrolü sırasında hata:', error);
    return false;
  }
};

// Admin rolü atama (sadece mevcut adminler için)
export const setUserAsAdmin = async (userId) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isAdmin: true
    });
    return true;
  } catch (error) {
    throw new Error('Admin rolü atanırken bir hata oluştu: ' + error.message);
  }
};

// Tüm kullanıcıları getir (sadece admin için)
export const getAllUsers = async () => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  return usersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Kullanıcı silme (admin için)
export const deleteUserByAdmin = async (userId) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
    return true;
  } catch (error) {
    throw new Error('Kullanıcı silinirken bir hata oluştu: ' + error.message);
  }
};