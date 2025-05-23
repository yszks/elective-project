const express = require('express');
const http = require('http');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Enable CORS for your frontend domain
app.use(cors({
  origin: 'https://www.i-bulong.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// MySQL Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'elective',
  password: 'elective-project',
  database: 'chat'
});

db.connect(err => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to MySQL database.');
});

// Create Socket.IO server
     const io = new Server(server, {
       cors: {
         origin: 'https://www.i-bulong.com',
         methods: ['GET', 'POST'],
         allowedHeaders: ['Content-Type']
       }
     });
     

// In-memory map of room users
const roomUserMap = {};

// SOCKET.IO EVENTS
io.on('connection', (socket) => {
  console.log('User  connected:', socket.id);

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

        // Delete messages when room is empty
        db.query('DELETE FROM messages WHERE room_id = ?', [roomId], (err) => {
          if (err) {
            console.error(`Failed to delete messages for room ${roomId}:`, err.message);
          } else {
            console.log(`All messages for room ${roomId} deleted.`);
          }
        });

        // Also delete the room itself
        db.query('DELETE FROM rooms WHERE id = ?', [roomId], (err) => {
          if (err) {
            console.error(`Failed to delete room ${roomId}:`, err.message);
          } else {
            console.log(`Room ${roomId} deleted.`);
          }
        });
      }
    }
  });
});

// EXPRESS ROUTES

// Create a new room
app.post('/rooms', (req, res) => {
  const { roomName } = req.body;
  if (!roomName) return res.status(400).send('Room name is required');

  db.query('INSERT INTO rooms (room_name) VALUES (?)', [roomName], (err, results) => {
    if (err) {
      console.error('Error creating room:', err.message);
      return res.status(500).send('Error creating room');
    }
    res.status(201).json({ roomId: results.insertId, roomName });
  });
});

// Leave a room and clean up if needed
app.post('/leave-room', (req, res) => {
  const { roomId } = req.body;
  deleteRoomIfEmpty(roomId);
  res.sendStatus(200);
});

function deleteRoomIfEmpty(roomId) {
  db.query('SELECT COUNT(*) AS userCount FROM users WHERE room_id = ?', [roomId], (err, results) => {
    if (err) {
      console.error(err);
      return;
    }
    if (results[0].userCount < 1) {
      db.query('DELETE FROM rooms WHERE id = ?', [roomId], err => {
        if (err) {
          console.error(err);
        } else {
          console.log(`Room ${roomId} deleted.`);
        }
      });
    }
  });
}

// Get messages for a room
app.get('/messages', (req, res) => {
  const { roomId } = req.query;
  if (!roomId) return res.status(400).send('Room ID required');

  db.query('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC', [roomId], (err, results) => {
    if (err) {
      console.error('Error fetching messages:', err.message);
      return res.status(500).send('Error fetching messages');
    }
    res.json(results);
  });
});

// Post a new message
app.post('/messages', (req, res) => {
  const { username, message, roomId } = req.body;
  if (!username || !message || !roomId) return res.status(400).send('Missing required fields');

  db.query(
    'INSERT INTO messages (username, message, room_id, timestamp) VALUES (?, ?, ?, NOW())',
    [username, message, roomId],
    (err) => {
      if (err) {
        console.error('Error sending message:', err.message);
        return res.status(500).send('Error sending message');
      }
      res.sendStatus(200);
    }
  );
});

// Start the server
const PORT = process.env.PORT || 3000; // Use environment variable or default to 3000
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
