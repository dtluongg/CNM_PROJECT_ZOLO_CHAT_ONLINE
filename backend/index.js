const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT;

const cors = require('cors');
const dns = require('node:dns');
dns.setServers(['1.1.1.1']);

const cookieParser = require('cookie-parser');
const http = require('http');

const connectMongoAtlas = require('./src/config/connectMongo');
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
app.get('/', (req, res) => {
    res.send('Hello Everyone, Today I will study NodeJS and Login with JWT');
});

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
server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});