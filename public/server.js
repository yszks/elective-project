const express = require('express');
const http = require('http');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

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
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
  host: 'www.i-bulong.com',
  user: 'elective',
  password: 'elective-project',
  database: 'chat'
});

// ROOM ROUTES
app.post('/rooms', (req, res) => {
  const { roomName } = req.body;
  if (!roomName) return res.status(400).send('Room name is required');
  db.query('INSERT INTO rooms (room_name) VALUES (?)', [roomName], (err, results) => {
    if (err) {
      console.error('Error creating room:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.status(201).json({ roomId: results.insertId, roomName });
  });
});

app.post('/leave-room', (req, res) => {
  const { userId, roomId } = req.body;
  // You should handle user disassociation here if needed
  deleteRoomIfEmpty(roomId);
  res.sendStatus(200);
});

function deleteRoomIfEmpty(roomId) {
  db.query('SELECT COUNT(*) AS userCount FROM users WHERE room_id = ?', [roomId], (err, results) => {
    if (err) return console.error('Error checking user count:', err);
    if (results[0].userCount < 1) {
      db.query('DELETE FROM rooms WHERE id = ?', [roomId], (err) => {
        if (err) console.error('Error deleting room:', err);
        else console.log(`Room ${roomId} deleted as it is empty.`);
      });
    }
  });
}

// MESSAGE ROUTES
app.get('/messages', (req, res) => {
  const roomId = req.query.roomId;
  db.query('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC', [roomId], (err, results) => {
    if (err) {
      console.error('Error fetching messages:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.json(results);
  });
});

app.post('/messages', (req, res) => {
  const { username, message, roomId } = req.body;
  if (!username || !message || !roomId) {
    return res.status(400).send('Bad Request: Missing required fields');
  }
  db.query(
    'INSERT INTO messages (username, message, room_id, timestamp) VALUES (?, ?, ?, NOW())',
    [username, message, roomId],
    (err) => {
      if (err) {
        console.error('Error inserting message:', err);
        return res.status(500).send('Internal Server Error');
      }
      res.sendStatus(200);
    }
  );
});

// SOCKET.IO HANDLING
const roomUserMap = {}; // { roomId: Set(socket.id) }

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;

    if (!roomUserMap[roomId]) {
      roomUserMap[roomId] = new Set();
    }
    roomUserMap[roomId].add(socket.id);

    console.log(`${username} joined room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId && roomUserMap[roomId]) {
      roomUserMap[roomId].delete(socket.id);
      if (roomUserMap[roomId].size === 0) {
        delete roomUserMap[roomId];
        db.query('DELETE FROM messages WHERE room_id = ?', [roomId], (err) => {
          if (err) console.error(`Failed to delete messages for room ${roomId}:`, err.message);
          else console.log(`All messages for room ${roomId} deleted.`);
        });
      }
    }
  });
});

// START SERVER
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server with Socket.IO running on https://www.i-bulong.com:${PORT}`);
});
