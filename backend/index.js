const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const dns = require('node:dns');
const cookieParser = require('cookie-parser');

dotenv.config();
// dns.setServers(['1.1.1.1']);

const app = express();
const server = http.createServer(app);

// ── MIDDLEWARE ──
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://localhost:5173',
    'http://localhost:8081',
    'http://172.27.130.18:5173',
    'http://172.27.130.18:8081',
    'http://172.27.130.18:2026',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── DB ──
const connectMongoAtlas = require('./src/config/connectMongo');
connectMongoAtlas();

// ── ROUTES ──
const userRouter         = require('./src/routes/userRouter');
const authRouter         = require('./src/routes/authRouter');
const friendRouter       = require('./src/routes/friendRouter');
const uploadRouter       = require('./src/routes/uploadRouter');
const callRouter         = require('./src/routes/callRouter');
const voiceRouter        = require('./src/routes/voiceRouter');
const conversationRouter = require('./src/routes/conversationRouter');
const messageRouter      = require('./src/routes/messageRouter');
const reactionRouter     = require('./src/routes/reactionRouter');
const notificationRouter = require('./src/routes/notificationRouter');
const groupRoleRouter = require('./src/routes/groupRoleRouter');

//
app.use('/backend/api/users',         userRouter);
app.use('/backend/api/auth',          authRouter);
app.use('/backend/api/friends',       friendRouter);
app.use('/backend/api/uploads',       uploadRouter);
app.use('/backend/api/calls',         callRouter);
app.use('/backend/api/voice',         voiceRouter);
app.use('/backend/api/conversations', conversationRouter);
app.use('/backend/api/messages',      messageRouter);
app.use('/backend/api/reactions',     reactionRouter);
app.use('/backend/api/notifications', notificationRouter);
app.use('/backend/api/conversations/:id', groupRoleRouter);

// ── SOCKET ──
const { initSocket } = require('./src/socket/socketManager');
initSocket(server);

// ── ERROR HANDLER ──
const errorHandler = require('./src/middlewares/errorHandler');
app.use(errorHandler);

// ── ROUTE TEST ──
app.get('/', (req, res) => {
    res.send('Server is running');
});

// ── START SERVER ──
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});