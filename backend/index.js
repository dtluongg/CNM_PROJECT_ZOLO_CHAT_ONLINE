const express = require('express');
const http    = require('http');
const dotenv  = require('dotenv');
dotenv.config();

<<<<<<< HEAD
const PORT = process.env.PORT;

const cors = require('cors');
const dns = require('node:dns');
dns.setServers(['1.1.1.1']);

const cookieParser = require('cookie-parser');
const http = require('http');
=======
const cors = require('cors');
const dns  = require('node:dns');

dns.setServers(['1.1.1.1']);

const app    = express();
const server = http.createServer(app); // dùng cho socket.io

// CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:8081'],
    credentials: true,
}));
>>>>>>> origin/tuongvi-dev

// MongoDB
const connectMongoAtlas = require('./src/config/connectMongo');
<<<<<<< HEAD
const errorHandler = require('./src/middlewares/errorHandler');

// routes
const userRouter = require('./src/routes/userRouter');
const authRouter = require('./src/routes/authRouter');
const friendRouter = require('./src/routes/friendRouter');
const messageRouter = require('./src/routes/messageRoutes');

// socket
const { initSocket } = require("./src/socket/index");

// ── MIDDLEWARE ─────────────────────
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:8081'],
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── ROUTES ─────────────────────────
=======
connectMongoAtlas();

// Middleware
app.use(express.json({ limit: '10mb' }));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Health check
>>>>>>> origin/tuongvi-dev
app.get('/', (req, res) => {
    res.send('Hello Everyone, Today I will study NodeJS and Login with JWT');
});

<<<<<<< HEAD
app.use('/backend/api/users', userRouter);
app.use('/backend/api/auth', authRouter);
app.use('/backend/api/friends', friendRouter);
app.use('/backend/api/message', messageRouter);

// ── ERROR HANDLER ──────────────────
app.use(errorHandler);

// ── SERVER + SOCKET ────────────────
const server = http.createServer(app);

initSocket(server);

// ── DB CONNECT ──────────────────────
connectMongoAtlas();

// ── START SERVER ────────────────────
=======
// ── ROUTES ──
const userRouter         = require('./src/routes/userRouter');
const authRouter         = require('./src/routes/authRouter');
const friendRouter       = require('./src/routes/friendRouter');
const uploadRouter       = require('./src/routes/uploadRouter');
const callRouter         = require('./src/routes/callRouter');
const voiceRouter        = require('./src/routes/voiceRouter');
const conversationRouter = require('./src/routes/conversationRouter');
const messageRouter      = require('./src/routes/messageRouter');    // ← Chat messages

app.use('/backend/api/users',         userRouter);
app.use('/backend/api/auth',          authRouter);
app.use('/backend/api/friends',       friendRouter);
app.use('/backend/api/uploads',       uploadRouter);
app.use('/backend/api/calls',         callRouter);
app.use('/backend/api/voice',         voiceRouter);
app.use('/backend/api/conversations', conversationRouter);
app.use('/backend/api/messages',      messageRouter);               // ← Chat messages

// Socket.io
const { initSocket } = require('./src/socket/socketManager');
initSocket(server);

// Error handler
const errorHandler = require('./src/middlewares/errorHandler');
app.use(errorHandler);

// Start server (CHỈ 1 cái này)
const PORT = process.env.PORT;
>>>>>>> origin/tuongvi-dev
server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});