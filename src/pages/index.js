import React, { useEffect, useState } from 'react';
import { getBlogs } from '../services/blogService';
import BlogCard from '../components/BlogCard';

const Home = () => {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const blogList = await getBlogs();
        setBlogs(blogList);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      }
    };

    fetchBlogs();
  }, []);

  return (
    <div>
      <h1>Blog Feed</h1>
      {blogs.map((blog) => (
        <BlogCard key={blog.id} title={blog.title} content={blog.content} author={blog.author} />
      ))}
    </div>
  );
};

export default Home;