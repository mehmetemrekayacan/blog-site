import React from 'react';

const BlogCard = ({ title, content, author }) => {
  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 transition-transform transform hover:-translate-y-1 hover:shadow-xl">
      <h2 className="text-2xl font-semibold text-gray-900 mb-3">{title}</h2>
      <p className="text-gray-700 mb-3 line-clamp-3">{content}</p>
      <p className="text-gray-500 text-sm font-medium">Author: {author}</p>
    </div>
  );
};

export default BlogCard;
