# Modern Blog Application

A secure, modern, and feature-rich blog application built with React and Express.js, incorporating best practices in web security and user experience.

## 🚀 Features

- **Modern Tech Stack**: Built with React 18, Express.js, and Firebase
- **Rich Text Editing**: Integrated with React Quill and Markdown support
- **Security First**: Implements multiple security layers including:
  - Rate limiting
  - CORS protection
  - Helmet security headers
  - XSS protection
  - Command injection prevention
  - Request size limiting
- **Responsive Design**: Built with Tailwind CSS for a modern, responsive UI
- **Real-time Updates**: Firebase integration for real-time data synchronization
- **SEO Friendly**: React Helmet Async for optimal SEO performance

## 🛠️ Tech Stack

- **Frontend**:
  - React 18
  - React Router DOM
  - React Quill
  - React Markdown Editor
  - Tailwind CSS
  - React Toastify
  - React Helmet Async

- **Backend**:
  - Express.js
  - Firebase
  - CORS
  - Helmet
  - Express Rate Limit

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Modern web browser

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/blog-app.git
cd blog-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Firebase configuration:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
npm start
```

## 🚀 Usage

- Frontend runs on `http://localhost:3000`
- Backend API runs on `http://localhost:5000`

## 🔒 Security Features

- Rate limiting (100 requests per 15 minutes per IP)
- Request size limiting (1KB)
- CORS protection
- XSS protection
- Command injection prevention
- Security headers (Helmet)
- Input sanitization
- Error handling and logging

## 📝 API Endpoints

- `GET /`: API status check
- `POST /`: Create new blog post (with security validations)
- `GET /test`: Test endpoint

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Mehmet Emre Kayacan

## 🙏 Acknowledgments

- React Team
- Express.js Team
- Firebase Team
- All contributors and supporters

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers. 