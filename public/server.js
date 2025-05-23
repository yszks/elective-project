const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();

// CORS configuration
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

// Create a new room
app.post('/rooms', (req, res) => {
    const { roomName } = req.body;
    if (!roomName) {
        return res.status(400).send('Room name is required');
    }
    db.query(
        'INSERT INTO rooms (room_name) VALUES (?)',
        [roomName],
        (err, results) => {
            if (err) {
                console.error('Error creating room:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.status(201).json({ roomId: results.insertId, roomName });
        }
    );
});

// Function to delete a room if no users are left
function deleteRoomIfEmpty(roomId) {
    db.query(
        'SELECT COUNT(*) AS userCount FROM users WHERE room_id = ?',
        [roomId],
        (err, results) => {
            if (err) {
                console.error('Error checking user count:', err);
                return;
            }
            if (results[0].userCount < 1) {
                db.query(
                    'DELETE FROM rooms WHERE id = ?',
                    [roomId],
                    (err) => {
                        if (err) {
                            console.error('Error deleting room:', err);
                        } else {
                            console.log(`Room ${roomId} deleted as it is empty.`);
                        }
                    }
                );
            }
        }
    );
}

// Call this function when a user leaves a room
app.post('/leave-room', (req, res) => {
    const { userId, roomId } = req.body;
    // Logic to remove user from the room
    // ...

    // Check if the room is empty and delete if necessary
    deleteRoomIfEmpty(roomId);
    res.sendStatus(200);
});



// Get messages for a specific room
app.get('/messages', (req, res) => {
    const roomId = req.query.roomId;
    db.query(
        'SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC',
        [roomId],
        (err, results) => {
            if (err) {
                console.error('Error fetching messages:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.json(results);
        }
    );
});

// Post a new message
app.post('/messages', (req, res) => {
    const { username, message, roomId } = req.body; // Include roomId in the request body
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

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: 'https://www.i-bulong.com',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    socket.on('send-message', ({ roomId, username, message }) => {
        const query = 'INSERT INTO messages (username, message, room_id, timestamp) VALUES (?, ?, ?, NOW())';
        db.query(query, [username, message, roomId], (err) => {
            if (!err) {
                io.to(roomId).emit('receive-message', { username, message, timestamp: new Date() });
            } else {
                console.error('DB error:', err);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3000; // Use environment variable for port
http.listen(PORT, () => {
    console.log(`Server with Socket.IO running on https://www.i-bulong.com:${PORT}`);
});

