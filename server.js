import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import setupSockets from './sockets/index.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// CORS setup to allow frontend (e.g. Vercel)
const io = new Server(server, {
    cors: {
        origin: '*', // Adjust to specific origin in production if needed
        methods: ['GET', 'POST']
    }
});

// Pass IO instance to socket handler
setupSockets(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('admin')); // Serve admin panel statically

// Make socket IO accessible to routes
app.set('io', io);

// Basic Route
app.get('/', (req, res) => {
    res.send('HackIoT Backend API Running');
});

// Import Routes
import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
