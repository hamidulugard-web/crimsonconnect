# HeartMatch - Modern Dating Web Application

A beautiful, responsive dating application with a red-themed design. Built with Node.js/Express backend and vanilla JavaScript frontend.

## Features

✨ **User Authentication**
- Sign up with email and password
- Secure login with JWT tokens
- Profile creation and editing

💖 **Profile Management**
- Upload custom profile photos
- Add bio, age, location, and interests
- View and edit your profile anytime

🔄 **Smart Matching System**
- Browse profile cards with swipe-style interface
- Like or pass on profiles
- Automatic matching when both users like each other

💬 **Real-Time Messaging**
- WebSocket-based chat with matched users
- See who you've matched with
- Instant message delivery

📱 **Fully Responsive Design**
- Works seamlessly on mobile and desktop
- Red and white elegant theme
- Smooth animations and transitions

## Project Structure

```
/
├── index.html           # Main HTML file
├── styles.css          # All styling and responsive design
├── app.js              # Frontend logic and API calls
└── /backend
    ├── server.js       # Express server and API routes
    ├── package.json    # Backend dependencies
    └── database.db     # SQLite database (auto-created)
```

## Installation & Setup

### Prerequisites
- Node.js and npm installed

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
npm install
```

2. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:3000`

### Frontend Setup

Open `index.html` in your web browser or serve it with a simple HTTP server:

```bash
python3 -m http.server 8000
```

Then navigate to `http://localhost:8000`

## How to Use

### 1. Landing Page
- View the hero section with app description
- Click "Sign Up" to create a new account
- Click "Login" to access existing account

### 2. Sign Up
- Enter your details: name, email, password
- Add optional info: age, gender, location, interests
- Submit to create your account

### 3. Dashboard
- View profile cards one by one
- **Pass (✕)**: Skip to the next profile
- **Like (❤️)**: Show interest in someone
- **Message (💬)**: Message a profile (after mutual like)

### 4. Profile Page
- Upload your profile photo
- Edit your bio, age, location, interests
- Save changes instantly

### 5. Matches
- See all your mutual matches
- Click on any match to start chatting

### 6. Chat
- Real-time messaging with matched users
- Instant message delivery via WebSocket
- See message timestamps

## Technology Stack

**Frontend:**
- HTML5
- CSS3 (Flexbox, Grid, Animations)
- Vanilla JavaScript (ES6+)

**Backend:**
- Node.js
- Express.js
- SQLite3
- JWT Authentication
- WebSocket (express-ws)
- bcryptjs (password hashing)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login with email/password

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `POST /api/users/upload-image` - Upload profile image
- `GET /api/profiles` - Get available profiles to view

### Interactions
- `POST /api/likes/:userId` - Like a user
- `GET /api/matches` - Get all matches
- `GET /api/messages/:matchUserId` - Get chat messages

### Real-Time Chat
- `WS /api/chat/:matchUserId` - WebSocket connection for real-time messaging

## Database Schema

**users**
- id, email, password, name, age, gender, location, bio, interests, profileImage, createdAt, updatedAt

**likes**
- id, userId, likedUserId, createdAt

**matches**
- id, user1Id, user2Id, createdAt

**messages**
- id, matchId, senderId, receiverId, content, createdAt

## Design Features

- **Red Theme**: Modern, energetic red and white color scheme
- **Smooth Animations**: Card transitions, floating hero image, message slides
- **Rounded Elements**: Soft, friendly appearance with rounded cards and buttons
- **Mobile Optimized**: Responsive grid and flexible layouts
- **Gradient Backgrounds**: Beautiful color transitions throughout the app
- **Icon-Based Navigation**: Clean header with intuitive icons

## Responsive Breakpoints

- **Desktop**: 769px and above
- **Tablet**: 481px to 768px
- **Mobile**: 480px and below

## Security Features

- JWT token-based authentication
- Password hashing with bcryptjs
- Secure WebSocket connections
- Input validation and sanitization
- CORS enabled for API requests

## Future Enhancements

- Image gallery for profiles
- Advanced search and filtering
- Video chat integration
- Social media integration
- Push notifications
- User blocking/reporting
- Verified badges
- Premium features

## License

MIT License - Feel free to use this project for learning and personal use.

## Support

For issues or questions, please create an issue or contact the development team.