const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path'); // Added for serving frontend
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname)); // Serve static files like index.html, Taki.png, mitsuha.png

// MongoDB Connection
const url = process.env.MONGODB_URL;
const dbName = 'diary_db';
let db;

async function connectDB() {
    try {
        const client = new MongoClient(url);
        await client.connect();
        console.log("Connected to MongoDB");
        db = client.db(dbName);
    } catch (err) {
        console.error("MongoDB Error:", err);
    }
}
connectDB();

// API Endpoints
app.get('/api/entries', async (req, res) => {
    const { coupleId, role } = req.query;
    try {
        const entries = await db.collection('entries')
            .find({ coupleId: coupleId, role: role.toLowerCase() })
            .sort({ timestamp: -1 })
            .toArray();
        res.json(entries);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/entries', async (req, res) => {
    try {
        const entry = req.body;
        const result = await db.collection('entries').insertOne(entry);
        res.json({ success: true, id: result.insertedId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/entries/:id', async (req, res) => {
    try {
        await db.collection('entries').deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/gallery', async (req, res) => {
    const { coupleId, role } = req.query;
    try {
        const photos = await db.collection('entries')
            .find({ coupleId: coupleId, role: role.toLowerCase(), image: { $ne: null } })
            .project({ image: 1, _id: 1, timestamp: 1 })
            .sort({ timestamp: -1 })
            .toArray();
        res.json(photos);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve the website
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
