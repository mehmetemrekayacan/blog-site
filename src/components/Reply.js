import React from 'react';
import { Link } from 'react-router-dom';

const Reply = ({ reply, currentUser, onDelete }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4 ml-8">
      <div className="flex items-start space-x-3">
        <Link to={`/profile/${reply.userId}`} className="flex-shrink-0">
          <img
            src={reply.userPhotoURL || `https://ui-avatars.com/api/?name=${reply.userName}&background=random`}
            alt={reply.userName}
            className="w-10 h-10 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <Link to={`/profile/${reply.userId}`} className="font-semibold text-gray-900 hover:text-indigo-600">
                {reply.userName}
              </Link>
              <span className="text-sm text-gray-500 ml-2">
                {reply.createdAt?.toDate().toLocaleDateString()}
              </span>
            </div>
            {currentUser && (currentUser.uid === reply.userId || currentUser.isAdmin) && (
              <button
                onClick={() => onDelete(reply.id)}
                className="text-red-500 hover:text-red-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-1 text-gray-700">{reply.content}</p>
        </div>
      </div>
    </div>
  );
};

export default Reply; 