const express = require('express');
const http = require('http');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

const socket = io("https://www.i-bulong.com:3000");  // Example if running on port 3000

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://www.i-bulong.com',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: 'https://www.i-bulong.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
  host: 'www.i-bulong.com',
  user: 'elective',
  password: 'elective-project',
  database: 'chat'
});

// Routes

// Create room
app.post('/rooms', (req, res) => {
  const { roomName } = req.body;
  if (!roomName) return res.status(400).send('Room name is required');
  db.query('INSERT INTO rooms (room_name) VALUES (?)', [roomName], (err, results) => {
    if (err) return res.status(500).send('Error creating room');
    res.status(201).json({ roomId: results.insertId, roomName });
  });
});

// Leave room
app.post('/leave-room', (req, res) => {
  const { roomId } = req.body;
  deleteRoomIfEmpty(roomId);
  res.sendStatus(200);
});

function deleteRoomIfEmpty(roomId) {
  db.query('SELECT COUNT(*) AS userCount FROM users WHERE room_id = ?', [roomId], (err, results) => {
    if (err) return console.error(err);
    if (results[0].userCount < 1) {
      db.query('DELETE FROM rooms WHERE id = ?', [roomId], err => {
        if (err) return console.error(err);
        console.log(`Room ${roomId} deleted.`);
      });
    }
  });
}

// Get messages
app.get('/messages', (req, res) => {
  const { roomId } = req.query;
  db.query('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC', [roomId], (err, results) => {
    if (err) return res.status(500).send('Error fetching messages');
    res.json(results);
  });
});

// Post a message
app.post('/messages', (req, res) => {
  const { username, message, roomId } = req.body;
  if (!username || !message || !roomId) return res.status(400).send('Missing required fields');
  db.query(
    'INSERT INTO messages (username, message, room_id, timestamp) VALUES (?, ?, ?, NOW())',
    [username, message, roomId],
    err => {
      if (err) return res.status(500).send('Error sending message');
      res.sendStatus(200);
    }
  );
});

// Socket.IO
const roomUserMap = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;

    if (!roomUserMap[roomId]) {
      roomUserMap[roomId] = new Set();
    }
    roomUserMap[roomId].add(socket.id);
    console.log(`${username} joined room ${roomId}`);
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId && roomUserMap[roomId]) {
      roomUserMap[roomId].delete(socket.id);
      if (roomUserMap[roomId].size === 0) {
        delete roomUserMap[roomId];
        db.query('DELETE FROM messages WHERE room_id = ?', [roomId], err => {
          if (err) return console.error(`Error deleting messages for room ${roomId}:`, err.message);
          console.log(`Messages for room ${roomId} deleted.`);
        });
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at https://www.i-bulong.com:${PORT}`);
});
