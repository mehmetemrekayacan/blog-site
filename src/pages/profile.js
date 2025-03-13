import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteCurrentUser } from '../services/auth';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const Profile = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');

  const handleReauthenticate = async () => {
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    try {
      await reauthenticateWithCredential(currentUser, credential);
      await deleteCurrentUser();
      toast.success('Account deleted successfully!');
      navigate('/register');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <h1>Profile</h1>
      {currentUser ? (
        <div>
          <p>Username: {currentUser.displayName}</p>
          <p>Email: {currentUser.email}</p>
          <input
            type="password"
            placeholder="Enter your password to delete account"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button onClick={handleReauthenticate}>Delete Account</button>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default Profile; 