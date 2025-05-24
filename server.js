const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const http = require('http');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // Use this server for listening

// Define PORT (Crucial Fix 1)
const PORT = process.env.PORT || 3000; // Use environment variable or default to 3000

const APP_ID = '384b88429f6c4934bd13dae2a9c2a5ab';
const APP_CERTIFICATE = 'ba1843eb9d0a470daaa059617543ec8f'; // Keep this secure on the server!

// CORS middleware (Correctly placed at the top)
app.use(cors({
    origin: '*', // Be specific in production: e.g., 'https://your-frontend-domain.com'
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// Agora Token Generation Endpoint
app.get('/generate-agora-token', (req, res) => {
    const channelName = req.query.channelName;
    const uid = req.query.uid || 0; // 0 means let Agora assign UID
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; // 1 hour

    if (!channelName) {
        return res.status(400).json({ error: 'channelName is required' });
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        role,
        privilegeExpiredTs
    );

    return res.json({ token });
});

// MySQL connection setup (Consider environment variables for credentials in production)
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', // Use env variable or default
    user: process.env.DB_USER || 'elective',
    password: process.env.DB_PASSWORD || 'elective-project',
    database: process.env.DB_NAME || 'chat',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4'
});

// Connect to MySQL with error handling
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('Connected to MySQL database.');
});

// Socket.IO setup with CORS
const io = new Server(server, {
    cors: {
        origin: '*', // Replace with your frontend URL in production for security
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
    }
});

// In-memory room-user mapping
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

                // Delete messages when room is empty
                db.query('DELETE FROM messages WHERE room_id = ?', [roomId], (err) => {
                    if (err) console.error(`Failed to delete messages for room ${roomId}:`, err.message);
                    else console.log(`All messages for room ${roomId} deleted.`);
                });

                // Delete the room
                db.query('DELETE FROM rooms WHERE id = ?', [roomId], (err) => {
                    if (err) console.error(`Failed to delete room ${roomId}:`, err.message);
                    else console.log(`Room ${roomId} deleted.`);
                });
            }
        }
    });
});

// REST API endpoints

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

// Get all rooms
app.get('/rooms', (req, res) => {
    db.query('SELECT * FROM rooms ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('Error fetching rooms:', err.message);
            return res.status(500).send('Error fetching rooms');
        }
        res.json(results);
    });
});

// Get messages for a specific room
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

// Listen on the http server, not the express app directly (Crucial Fix 2)
server.listen(PORT, () => {
    console.log(`Server and Agora token server running on port ${PORT}`);
});