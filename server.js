// --- Core Modules & Third-Party Libraries ---
const express = require('express');
const http = require('http'); // For creating the HTTP server for Express and Socket.IO
const cors = require('cors'); // Handles Cross-Origin Resource Sharing
const mysql = require('mysql2'); // MySQL database connector (using mysql2 for promises/pooling if needed, but current uses callbacks)
const bodyParser = require('body-parser'); // Parses incoming request bodies
const { Server } = require('socket.io'); // Socket.IO server

// --- Agora Specific Imports ---
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

// --- Express App Setup ---
const app = express();
const server = http.createServer(app); // Create HTTP server from Express app


const PORT = process.env.PORT || 3000;

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;


const allowedOrigins = [
    'https://www.i-bulong.com',
    'https://i-bulong.com'
];

// --- CORS Middleware Setup for Express Routes ---
app.use(cors({
    origin: function (origin, callback) {

        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.warn(msg); // Log blocked origin for debugging
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'], // Ensure OPTIONS is allowed for preflight requests
    allowedHeaders: ['Content-Type', 'Authorization'], // Add any other headers your frontend might send
    credentials: true // Crucial if frontend sends cookies/sessions (e.g., PHP sessions)
}));

// --- Body Parser Middleware ---
app.use(bodyParser.json()); // To parse application/json bodies
app.use(bodyParser.urlencoded({ extended: true })); // To parse application/x-www-form-urlencoded bodies

// --- MySQL Database Connection Setup ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // Default MySQL port
    charset: 'utf8mb4',
    waitForConnections: true, // If all connections are in use, wait for one to be released
    connectionLimit: 10,     // Max number of connections in the pool
    queueLimit: 0
});

// Connect to MySQL and handle initial connection errors
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('Connected to MySQL database.');
});

// --- Agora Token Generation Endpoint ---
app.get('/generate-agora-token', (req, res) => {
    const channelName = req.query.channelName;
    const uid = req.query.uid || 0; // Use 0 to let Agora assign UID
    const role = RtcRole.PUBLISHER; // Role can be PUBLISHER or SUBSCRIBER
    const expirationTimeInSeconds = 3600; // Token expiration time in seconds (1 hour)

    if (!channelName) {
        return res.status(400).json({ error: 'channelName is required' });
    }

    if (!APP_ID || !APP_CERTIFICATE) {
        console.error('Agora APP_ID or APP_CERTIFICATE not set in environment variables.');
        return res.status(500).json({ error: 'Agora credentials not configured on server.' });
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
        const token = RtcTokenBuilder.buildTokenWithUid(
            APP_ID,
            APP_CERTIFICATE,
            channelName,
            uid,
            role,
            privilegeExpiredTs
        );
        return res.json({ token });
    } catch (error) {
        console.error('Error building Agora token:', error.message);
        return res.status(500).json({ error: 'Failed to generate Agora token.' });
    }
});

// --- Socket.IO Setup with CORS for WebSocket Handshake ---
const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) === -1) {
                const msg = `The CORS policy for Socket.IO does not allow access from the specified Origin: ${origin}`;
                console.warn(msg);
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
        methods: ['GET', 'POST'], // Allow GET for WebSocket handshake, POST for HTTP polling fallback
        credentials: true // Crucial if frontend sends cookies/sessions via Socket.IO
    }
});

// In-memory mapping to track users in rooms (for room cleanup logic)
const roomUserMap = {}; // Key: roomId, Value: Set of socket.ids

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    let joinedRoomId = null; // Track the room ID for this socket

    socket.on('join-room', ({ roomId, username }) => {
        socket.join(roomId);
        joinedRoomId = roomId; // Store the room ID on the socket object
        console.log(`${username} joined room: ${roomId}`);

        if (!roomUserMap[roomId]) {
            roomUserMap[roomId] = new Set();
        }
        roomUserMap[roomId].add(socket.id);

        // Notify other users in the room that a new user joined
        socket.to(roomId).emit('user-joined', { username });
    });

    socket.on('send-message', ({ roomId, username, message }) => {
        console.log(`Message from ${username} in room ${roomId}: ${message}`);

        db.query('SELECT id FROM users WHERE username = ?', [username], (err, userResults) => {
            if (err || userResults.length === 0) {
                console.error('Error finding user to save message:', err || 'User not found');
                return;
            }
            const userId = userResults[0].id;

            db.query(
                'INSERT INTO messages (user_id, message, room_id, timestamp) VALUES (?, ?, ?, NOW())',
                [userId, message, roomId],
                (insertErr) => {
                    if (insertErr) {
                        console.error('Error saving message to DB:', insertErr.message);
                        return;
                    }

                    // **If saving is successful, THEN broadcast the message**
                    io.to(roomId).emit('chat-message', { username, message });
                }
            );
        });
    });

    socket.on('leave-room', ({ roomId, username }) => {
        socket.leave(roomId);
        console.log(`${username} explicitly left room: ${roomId}`);

        if (roomId && roomUserMap[roomId]) {
            roomUserMap[roomId].delete(socket.id);

            io.to(roomId).emit('user-left', { username });

            // Check if the room is now empty after this user left
            if (roomUserMap[roomId].size === 0) {
                console.log(`Room ${roomId} is now empty. Initiating cleanup.`);
                delete roomUserMap[roomId]; // Remove the room from the map

                // Delete messages for the empty room
                db.query('DELETE FROM messages WHERE room_id = ?', [roomId], (err) => {
                    if (err) console.error(`Failed to delete messages for room ${roomId}:`, err.message);
                    else console.log(`All messages for room ${roomId} deleted.`);
                });

                // Delete the room itself
                db.query('DELETE FROM rooms WHERE id = ?', [roomId], (err) => {
                    if (err) {
                        console.error(`Failed to delete room ${roomId}:`, err.message);
                    } else {
                        console.log(`Room ${roomId} deleted.`);
                        io.emit('leave-room', { roomId: roomId });
                    }
                });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Handle implicit disconnections (e.g., browser closed)
        if (joinedRoomId && roomUserMap[joinedRoomId]) {
            roomUserMap[joinedRoomId].delete(socket.id);
            if (roomUserMap[joinedRoomId].size === 0) {
                console.log(`Room ${joinedRoomId} is now empty due to disconnect. Initiating cleanup.`);
                delete roomUserMap[joinedRoomId];

                db.query('DELETE FROM messages WHERE room_id = ?', [joinedRoomId], (err) => {
                    if (err) console.error(`Failed to delete messages for room ${joinedRoomId}:`, err.message);
                    else console.log(`All messages for room ${joinedRoomId} deleted.`);
                });

                db.query('DELETE FROM rooms WHERE id = ?', [joinedRoomId], (err) => {
                    if (err) console.error(`Failed to delete room ${joinedRoomId}:`, err.message);
                    else console.log(`Room ${joinedRoomId} deleted.`);
                });
            }
        }
    });
});

// --- REST API Endpoints ---

// Create a new room
app.post('/rooms', (req, res) => {
    const { roomName } = req.body;
    if (!roomName) {
        return res.status(400).json({ error: 'Room name is required' });
    }

    db.query('INSERT INTO rooms (room_name) VALUES (?)', [roomName], (err, results) => {
        if (err) {
            console.error('Error creating room:', err.message);
            // Send a more informative error response
            return res.status(500).json({ error: 'Error creating room in database.' });
        }
        res.status(201).json({ roomId: results.insertId, roomName });
    });
});

// Get all rooms
app.get('/rooms', (req, res) => {
    db.query('SELECT id, room_name FROM rooms ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('Error fetching rooms:', err.message);
            return res.status(500).json({ error: 'Error fetching rooms from database.' });
        }
        res.json(results);
    });
});

// Get messages for a specific room
app.get('/messages', (req, res) => {
    const { roomId } = req.query;
    if (!roomId) {
        return res.status(400).json({ error: 'Room ID required' });
    }

    db.query(`
        SELECT m.message, m.timestamp, u.username
        FROM messages AS m
        INNER JOIN users AS u ON m.user_id = u.id
        WHERE m.room_id = ?
        ORDER BY m.timestamp ASC
    `, [roomId], (err, results) => {
        if (err) {
            console.error('Error fetching messages from Node.js API:', err.message); // Added Node.js API context
            return res.status(500).json({ error: 'Error fetching messages from database.' });
        }
        res.json(results);
    });
});


// Optional: Add a simple root endpoint for health checks on Render
app.get('/', (req, res) => {
    res.status(200).send('Node.js server is running and accessible.');
});

// --- Start the HTTP Server ---
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Agora App ID: ${APP_ID ? 'Configured' : 'NOT CONFIGURED - CHECK ENV VARS!'}`);
    console.log(`Agora App Certificate: ${APP_CERTIFICATE ? 'Configured (securely)' : 'NOT CONFIGURED - CHECK ENV VARS!'}`);
    console.log(`Database Host: ${process.env.DB_HOST}`);
});