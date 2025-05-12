import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  getAuth,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { auth } from './firebase';
import { getDoc, doc, getDocs, collection, deleteDoc, setDoc, serverTimestamp, updateDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'react-toastify';

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

// Yardımcı fonksiyon: Türkçe karakterleri normalize etme (SearchBar.js'teki ile aynı)
const normalizeTurkishChars = (str) => {
  if (!str) return '';
  let s = str;
  s = s.replace(/İ/g, 'i').replace(/I/g, 'i');
  s = s.toLowerCase();
  s = s.replace(/[ıi]/g, 'i');
  s = s.replace(/ü/g, 'u');
  s = s.replace(/ö/g, 'o');
  s = s.replace(/ş/g, 's');
  s = s.replace(/ç/g, 'c');
  s = s.replace(/ğ/g, 'g');
  return s;
};

// Kullanıcı kaydı
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Kullanıcı profilini Firebase Auth üzerinde güncelle (displayName ve photoURL başlangıçta null olabilir)
    await updateProfile(user, { 
      displayName: displayName,
      photoURL: user.photoURL || null // Auth'tan gelen photoURL veya başlangıçta null
    });

    // Firestore'da kullanıcı dokümanı oluştur
    const usernameForSearch = displayName || email.split('@')[0]; // displayName yoksa e-postanın başını kullan
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName, // Auth'a kaydedilen displayName
      photoURL: user.photoURL || null, // Auth'a kaydedilen photoURL
      username_lowercase: usernameForSearch.toLowerCase(),
      username_normalized: normalizeTurkishChars(usernameForSearch),
      createdAt: serverTimestamp(),
      isAdmin: false // Varsayılan olarak admin değil
    });

    await sendEmailVerification(user);
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
      throw new Error('Böyle bir hesap bulunamadı.');
    }
    if (error.code === 'auth/wrong-password') {
      throw new Error('Şifreniz yanlış, lütfen şifrenizi doğru girin.');
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
    // 1. Firebase Auth profilini güncelle
    await updateProfile(user, { displayName, photoURL });

    // 2. Firestore'daki 'users' dokümanını güncelle
    const userDocRef = doc(db, 'users', user.uid);
    const usernameForSearchOnUpdate = displayName || user.email.split('@')[0]; // Güncellenmiş displayName veya e-posta
    await updateDoc(userDocRef, {
      displayName: displayName,
      photoURL: photoURL,
      username_lowercase: usernameForSearchOnUpdate.toLowerCase(),
      username_normalized: normalizeTurkishChars(usernameForSearchOnUpdate)
    });

    // 3. Kullanıcının blog yazılarını güncelle
    const blogsRef = collection(db, 'blogs');
    const blogsQuery = query(blogsRef, where('userId', '==', user.uid));
    const blogsSnapshot = await getDocs(blogsQuery);
    const blogUpdatePromises = blogsSnapshot.docs.map(blogDoc => 
      updateDoc(blogDoc.ref, {
        authorPhotoURL: photoURL,
        author: displayName // Bloglardaki author alanı da displayName ile güncellenmeli
      })
    );

    // 4. Kullanıcının tüm yorumlarını güncelle
    const commentsRef = collection(db, 'comments');
    const commentsQuery = query(commentsRef, where('userId', '==', user.uid));
    const commentsSnapshot = await getDocs(commentsQuery);
    const commentUpdatePromises = commentsSnapshot.docs.map(commentDoc => 
      updateDoc(commentDoc.ref, {
        authorPhotoURL: photoURL,
        author: displayName // Yorumlardaki author alanı da displayName ile güncellenmeli
      })
    );

    // 5. Tüm yorumlardaki bu kullanıcıya ait yanıtları güncelle
    const allCommentsSnapshot = await getDocs(commentsRef);
    const replyUpdatePromises = allCommentsSnapshot.docs.map(replyDoc => {
      const commentData = replyDoc.data();
      if (commentData.replies && Array.isArray(commentData.replies)) {
        let repliesChanged = false;
        const updatedReplies = commentData.replies.map(reply => {
          if (reply.userId === user.uid) {
            repliesChanged = true;
            return {
              ...reply,
              authorPhotoURL: photoURL,
              author: displayName // Yanıtlardaki author alanı da displayName ile güncellenmeli
            };
          }
          return reply;
        });
        if (repliesChanged) {
          return updateDoc(replyDoc.ref, { replies: updatedReplies });
        }
      }
      return null;
    }).filter(Boolean);

    // Tüm güncellemeleri paralel olarak yap
    await Promise.all([
      ...blogUpdatePromises, 
      ...commentUpdatePromises, 
      ...replyUpdatePromises
    ]);

    return user; // Güncellenmiş Auth kullanıcısını döndür
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
    // 1. Kullanıcının bloglarını sil
    const blogsRef = collection(db, 'blogs');
    const blogsQuery = query(blogsRef, where('userId', '==', userId));
    const blogsSnapshot = await getDocs(blogsQuery);
    for (const blogDoc of blogsSnapshot.docs) {
      await deleteDoc(doc(db, 'blogs', blogDoc.id));
    }

    // 2. Kullanıcının yorumlarını sil
    const commentsRef = collection(db, 'comments');
    const commentsQuery = query(commentsRef, where('userId', '==', userId));
    const commentsSnapshot = await getDocs(commentsQuery);
    for (const commentDoc of commentsSnapshot.docs) {
      await deleteDoc(doc(db, 'comments', commentDoc.id));
    }

    // 3. Tüm yorumlardaki bu kullanıcıya ait yanıtları sil
    const allCommentsSnapshot = await getDocs(commentsRef);
    for (const commentDoc of allCommentsSnapshot.docs) {
      const commentData = commentDoc.data();
      if (commentData.replies && Array.isArray(commentData.replies)) {
        const updatedReplies = commentData.replies.filter(r => r.userId !== userId);
        if (updatedReplies.length !== commentData.replies.length) {
          await updateDoc(doc(db, 'comments', commentDoc.id), { replies: updatedReplies });
        }
      }
    }

    // 4. Kullanıcıyı Firestore'dan sil
    await deleteDoc(doc(db, 'users', userId));

    // 5. Firebase Authentication'dan silmek için:
    // Bunu doğrudan istemci tarafında yapamazsınız. Bunun için bir backend veya Cloud Function gerekir.
    // Öneri: Bir Cloud Function ile admin.auth().deleteUser(userId) çağrısı yapabilirsiniz.
    // https://firebase.google.com/docs/auth/admin/manage-users#delete_a_user

    return true;
  } catch (error) {
    throw new Error('Kullanıcı ve içerikleri silinirken bir hata oluştu: ' + error.message);
  }
};

export const updateUserEmail = async (newEmail, currentPassword) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Kullanıcı girişi yapılmamış');
  }

  try {
    // Kullanıcıyı yeniden doğrula
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // E-posta adresini güncelle
    await updateEmail(user, newEmail);

    // Firestore'daki kullanıcı bilgilerini güncelle
    const userDoc = doc(db, 'users', user.uid);
    await updateDoc(userDoc, {
      email: newEmail
    });

    return true;
  } catch (error) {
    console.error('E-posta güncelleme hatası:', error);
    throw error;
  }
};

export const updateUserPassword = async (newPassword, currentPassword) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Kullanıcı girişi yapılmamış');
  }

  try {
    // Kullanıcıyı yeniden doğrula
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Şifreyi güncelle
    await updatePassword(user, newPassword);

    return true;
  } catch (error) {
    console.error('Şifre güncelleme hatası:', error);
    throw error;
  }
};