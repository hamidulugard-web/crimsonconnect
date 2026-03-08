const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const expressWs = require('express-ws');
const path = require('path');
const fs = require('fs');

const app = express();
expressWs(app);

const JWT_SECRET = 'your-secret-key-change-in-production';
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Database error:', err);
  else console.log('Connected to SQLite database');
  initializeDatabase();
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        location TEXT,
        bio TEXT,
        interests TEXT,
        profileImage TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Likes table
    db.run(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        likedUserId INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(likedUserId) REFERENCES users(id),
        UNIQUE(userId, likedUserId)
      )
    `);

    // Matches table
    db.run(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1Id INTEGER NOT NULL,
        user2Id INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user1Id) REFERENCES users(id),
        FOREIGN KEY(user2Id) REFERENCES users(id),
        UNIQUE(user1Id, user2Id)
      )
    `);

    // Messages table
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matchId INTEGER NOT NULL,
        senderId INTEGER NOT NULL,
        receiverId INTEGER NOT NULL,
        content TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(matchId) REFERENCES matches(id),
        FOREIGN KEY(senderId) REFERENCES users(id),
        FOREIGN KEY(receiverId) REFERENCES users(id)
      )
    `);

    console.log('Database initialized');
  });
}

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
};

// Sign Up
app.post('/api/auth/signup', (req, res) => {
  const { email, password, name, age, gender, location, interests } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (email, password, name, age, gender, location, interests, bio) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [email, hashedPassword, name, age, gender, location, interests || '', ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        token,
        user: {
          id: this.lastID,
          email,
          name
        }
      });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage
      }
    });
  });
});

// Get current user profile
app.get('/api/users/me', verifyToken, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      age: user.age,
      gender: user.gender,
      location: user.location,
      bio: user.bio,
      interests: user.interests ? user.interests.split(',') : [],
      profileImage: user.profileImage
    });
  });
});

// Update user profile
app.put('/api/users/me', verifyToken, (req, res) => {
  const { name, age, gender, location, bio, interests } = req.body;

  db.run(
    `UPDATE users SET name = ?, age = ?, gender = ?, location = ?, bio = ?, interests = ?, updatedAt = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [name, age, gender, location, bio, interests?.join(',') || '', req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      db.get('SELECT * FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        res.json({
          id: user.id,
          name: user.name,
          age: user.age,
          gender: user.gender,
          location: user.location,
          bio: user.bio,
          interests: user.interests ? user.interests.split(',') : [],
          profileImage: user.profileImage
        });
      });
    }
  );
});

// Upload profile image
app.post('/api/users/upload-image', verifyToken, (req, res) => {
  const base64Data = req.body.image;
  if (!base64Data) return res.status(400).json({ error: 'No image provided' });

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const data = Buffer.from(matches[2], 'base64');
    const fileName = `${req.userId}_${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, data);

    const imageUrl = `/uploads/${fileName}`;
    db.run('UPDATE users SET profileImage = ? WHERE id = ?', [imageUrl, req.userId], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ imageUrl });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get profiles to view (excluding current user and already liked)
app.get('/api/profiles', verifyToken, (req, res) => {
  db.all(
    `SELECT u.* FROM users u 
     WHERE u.id != ? 
     AND u.id NOT IN (
       SELECT likedUserId FROM likes WHERE userId = ?
     )
     LIMIT 20`,
    [req.userId, req.userId],
    (err, profiles) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      const users = profiles.map(u => ({
        id: u.id,
        name: u.name,
        age: u.age,
        gender: u.gender,
        location: u.location,
        bio: u.bio,
        interests: u.interests ? u.interests.split(',') : [],
        profileImage: u.profileImage || '/default-avatar.jpg'
      }));

      res.json(users);
    }
  );
});

// Like a user
app.post('/api/likes/:userId', verifyToken, (req, res) => {
  const likedUserId = parseInt(req.params.userId);

  db.run(
    'INSERT INTO likes (userId, likedUserId) VALUES (?, ?)',
    [req.userId, likedUserId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Already liked this user' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      // Check if mutual like (match)
      db.get(
        'SELECT * FROM likes WHERE userId = ? AND likedUserId = ?',
        [likedUserId, req.userId],
        (err, like) => {
          if (like) {
            // Create match
            const user1Id = Math.min(req.userId, likedUserId);
            const user2Id = Math.max(req.userId, likedUserId);

            db.run(
              'INSERT OR IGNORE INTO matches (user1Id, user2Id) VALUES (?, ?)',
              [user1Id, user2Id],
              (err) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                res.json({ matched: true, message: 'You have a match!' });
              }
            );
          } else {
            res.json({ matched: false, message: 'Like sent' });
          }
        }
      );
    }
  );
});

// Get matches
app.get('/api/matches', verifyToken, (req, res) => {
  db.all(
    `SELECT CASE 
       WHEN user1Id = ? THEN user2Id 
       ELSE user1Id 
     END as userId,
     u.name, u.age, u.location, u.profileImage, u.bio, m.createdAt
     FROM matches m
     JOIN users u ON u.id = CASE 
       WHEN user1Id = ? THEN user2Id 
       ELSE user1Id 
     END
     WHERE user1Id = ? OR user2Id = ?
     ORDER BY m.createdAt DESC`,
    [req.userId, req.userId, req.userId, req.userId],
    (err, matches) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      const matchedUsers = matches.map(m => ({
        userId: m.userId,
        name: m.name,
        age: m.age,
        location: m.location,
        bio: m.bio,
        profileImage: m.profileImage || '/default-avatar.jpg',
        matchedAt: m.createdAt
      }));

      res.json(matchedUsers);
    }
  );
});

// Get messages for a match
app.get('/api/messages/:matchUserId', verifyToken, (req, res) => {
  const matchUserId = parseInt(req.params.matchUserId);
  const user1Id = Math.min(req.userId, matchUserId);
  const user2Id = Math.max(req.userId, matchUserId);

  db.get(
    'SELECT id FROM matches WHERE (user1Id = ? AND user2Id = ?) OR (user1Id = ? AND user2Id = ?)',
    [user1Id, user2Id, user2Id, user1Id],
    (err, match) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      db.all(
        'SELECT * FROM messages WHERE matchId = ? ORDER BY createdAt ASC',
        [match.id],
        (err, messages) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json(messages);
        }
      );
    }
  );
});

// WebSocket for real-time chat
const connectedUsers = new Map();

app.ws('/api/chat/:matchUserId', (ws, req) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const matchUserId = parseInt(req.params.matchUserId);

  if (!token) {
    ws.close();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      ws.close();
      return;
    }

    const userId = decoded.userId;
    const key = `${Math.min(userId, matchUserId)}-${Math.max(userId, matchUserId)}`;

    if (!connectedUsers.has(key)) {
      connectedUsers.set(key, []);
    }
    connectedUsers.get(key).push({ userId, ws });

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        const user1Id = Math.min(userId, matchUserId);
        const user2Id = Math.max(userId, matchUserId);

        db.get(
          'SELECT id FROM matches WHERE (user1Id = ? AND user2Id = ?) OR (user1Id = ? AND user2Id = ?)',
          [user1Id, user2Id, user2Id, user1Id],
          (err, match) => {
            if (err || !match) return;

            db.run(
              'INSERT INTO messages (matchId, senderId, receiverId, content) VALUES (?, ?, ?, ?)',
              [match.id, userId, matchUserId, data.content],
              (err) => {
                if (err) return;

                // Send to all connected clients for this match
                const users = connectedUsers.get(key) || [];
                users.forEach(user => {
                  user.ws.send(JSON.stringify({
                    senderId: userId,
                    content: data.content,
                    createdAt: new Date().toISOString()
                  }));
                });
              }
            );
          }
        );
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    });

    ws.on('close', () => {
      const users = connectedUsers.get(key);
      if (users) {
        const index = users.findIndex(u => u.userId === userId && u.ws === ws);
        if (index > -1) users.splice(index, 1);
      }
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dating app backend running on http://0.0.0.0:${PORT}`);
});