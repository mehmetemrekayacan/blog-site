import React, { useState } from 'react';
import { createBlog } from '../services/blogService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Share = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createBlog({
        title,
        content,
        userId: currentUser.uid,
        author: currentUser.displayName
      });
      toast.success('Blog shared successfully!');
      setTitle('');
      setContent('');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <h1>Share Blog</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <button type="submit">Share</button>
      </form>
    </div>
  );
};

export default Share; 