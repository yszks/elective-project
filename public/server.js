const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();

// CORS configuration
app.use(cors({
    origin: 'http://your-frontend-url.com', // Replace with your actual frontend URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'www.i-bulong.com',
    user: 'elective',
    password: 'elective-project', 
    database: 'chat'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database');
});

app.get('/messages', (req, res) => {
    const roomId = req.query.roomId;
    db.query(
        'SELECT * FROM users WHERE room_id = ? ORDER BY timestamp ASC',
        [roomId],
        (err, results) => {
            if (err) return res.status(500).send(err);
            res.json(results);
        }
    );
});

app.post('/messages', (req, res) => {
    const { username, message } = req.body;
    const roomId = 'elective';
    db.query(
        'INSERT INTO users (username, message, room_id, timestamp) VALUES (?, ?, ?, NOW())',
        [username, message, roomId],
        (err) => {
            if (err) return res.status(500).send(err);
            res.sendStatus(200);
        }
    );
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
