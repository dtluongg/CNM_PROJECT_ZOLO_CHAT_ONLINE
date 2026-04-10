const express = require('express');
const http    = require('http');
const dotenv  = require('dotenv');
dotenv.config();

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

// MongoDB
const connectMongoAtlas = require('./src/config/connectMongo');
connectMongoAtlas();

// Middleware
app.use(express.json({ limit: '10mb' }));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Health check
app.get('/', (req, res) => {
    res.send('Hello Everyone, Today I will study NodeJS and Login with JWT');
});

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
server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});