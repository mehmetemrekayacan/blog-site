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
      await signOut(auth); // Doğrulanmamışsa çıkış yap
      throw new Error('Lütfen e-posta adresinizi doğrulayın. Gelen kutunuzu kontrol edin.');
    }

    return user;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
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