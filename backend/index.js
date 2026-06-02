const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const dns = require('node:dns');
const cookieParser = require('cookie-parser');

dotenv.config();
dns.setServers(['1.1.1.1']);

const app = express();
const server = http.createServer(app);

// ── MIDDLEWARE ──
const ALLOWED_ORIGINS = [
  'https://nhom3zolochat.dotienluong.id.vn', // production HTTPS
  'http://nhom3zolochat.dotienluong.id.vn',  // HTTP fallback trước khi có SSL
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://localhost:5173',
  'http://localhost:8081',
  'http://172.27.130.18:5173',
  'http://172.27.130.18:8081',
  'http://172.27.130.18:2026',
  'http://172.20.10.3:5173',
];
if (process.env.FRONTEND_URL) ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile / curl / postman
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: '${origin}' không được phép`));
  },
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
const voiceRoomRouter    = require('./src/routes/voiceRoomRouter');
const groupCallRouter    = require('./src/routes/groupCallRouter');
const storyRouter        = require('./src/routes/storyRoutes');
const { initReminderCron } = require('./src/services/reminderService');



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
app.use('/backend/api/stories',       storyRouter);

app.use('/backend/api/voice-rooms',   voiceRoomRouter);
app.use('/backend/api/group-calls',   groupCallRouter);

// ── SOCKET ──
const { initSocket } = require('./src/socket/socketManager');
initSocket(server);
initReminderCron();


// ── DEBUG ROUTES ──
app.get('/backend/api/debug/ping', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is reachable', time: new Date() });
});

// ── ERROR HANDLER ──
const errorHandler = require('./src/middlewares/errorHandler');
app.use(errorHandler);

// ── 404 CATCH-ALL (MUST BE LAST) ──
app.use((req, res) => {
    console.warn(`[404 DEBUG] ${req.method} ${req.originalUrl} - Not Found`);
    res.status(404).json({ 
        message: 'API Route not found', 
        path: req.originalUrl,
        method: req.method 
    });
});

// ── ROUTE TEST ──
app.get('/', (req, res) => {
    res.send('Server is running');
});

// ── START SERVER ──
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});