import React, { useState } from 'react';
import PropTypes from 'prop-types';

const BlogCard = ({ title, content, author, date, imageUrl, tags = [] }) => {
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl">
      {/* Blog Görseli (Opsiyonel) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-48 object-cover rounded-t-2xl mb-4"
        />
      )}

      {/* Başlık */}
      <h2 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-indigo-600 transition-colors duration-200">
        {title}
      </h2>

      {/* İçerik */}
      <p className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">{content}</p>

      {/* Yazar ve Tarih */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-gray-500 text-sm font-medium">
          Yazar: <span className="text-indigo-500">{author}</span>
        </p>
        <p className="text-gray-400 text-xs">{date}</p>
      </div>

      {/* Etiketler */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs font-medium text-white bg-indigo-500 rounded-full px-2 py-1 hover:bg-indigo-600 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Beğenme Butonu */}
      <button
        onClick={handleLike}
        className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
          isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-400'
        }`}
      >
        <svg
          className={`w-5 h-5 ${isLiked ? 'fill-current' : 'fill-none stroke-current'}`}
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {isLiked ? 'Beğenildi' : 'Beğen'}
      </button>
    </div>
  );
};

// PropTypes ile prop doğrulaması
BlogCard.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  date: PropTypes.string,
  imageUrl: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
};

export default BlogCard;