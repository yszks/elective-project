const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();

// CORS configuration
app.use(cors({
    origin: 'https://www.i-bulong.com', // Replace with your actual frontend URL
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

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database');
});

// Get messages for a specific room
app.get('/messages', (req, res) => {
    const roomId = req.query.roomId;
    db.query(
        'SELECT * FROM users WHERE room_id = ? ORDER BY timestamp ASC',
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
        'INSERT INTO users (username, message, room_id, timestamp) VALUES (?, ?, ?, NOW())',
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

// Start the server
const PORT = process.env.PORT || 3000; // Use environment variable for port
app.listen(PORT, () => {
    console.log(`Server running on https://www.i-bulong.com:${PORT}`);
});

