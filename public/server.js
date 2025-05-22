// server.js
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Change if needed
    password: '', // Change if needed
    database: 'chat'
});

db.connect((err) => {
    if (err) {
        console.error('Failed to connect to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Endpoint to fetch messages for a room
app.get('/messages', (req, res) => {
    const roomId = req.query.roomId;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    const query = 'SELECT username, message, timestamp FROM users WHERE room_id = ? ORDER BY timestamp ASC';
    db.query(query, [roomId], (err, results) => {
        if (err) {
            console.error('Error fetching messages:', err);
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }
        res.json(results);
    });
});

// Endpoint to save a new message
app.post('/messages', (req, res) => {
    const { username, message } = req.body;
    const roomId = 'elective';

    if (!username || !message) {
        return res.status(400).json({ error: 'Username and message are required' });
    }

    const query = 'INSERT INTO users (username, message, room_id, timestamp) VALUES (?, ?, ?, NOW())';
    db.query(query, [username, message, roomId], (err, result) => {
        if (err) {
            console.error('Error saving message:', err);
            return res.status(500).json({ error: 'Failed to send message' });
        }
        res.status(201).json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
