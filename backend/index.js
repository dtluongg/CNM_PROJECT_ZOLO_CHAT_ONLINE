const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const PORT = process.env.PORT;
const cors = require('cors');

const dns = require('node:dns');
// Set the global DNS servers for this Node.js process
dns.setServers(['1.1.1.1']);

app.use(cors({
    origin: 'http://localhost:5173', // Thay đổi nếu frontend chạy trên cổng khác
    credentials: true, // Cho phép gửi cookie
}));

const connectMongoAtlas = require('./src/config/connectMongo');

app.listen(PORT, ()=> {
    console.log(`Server is running on port: ${PORT}`);
})
app.get('/', (req, res)=>{
    res.send('Hello Everyone, Today I will study NodeJS and Login with JWT');
});

connectMongoAtlas();
app.use(express.json({ limit: '10mb' }));  // tăng limit để hỗ trợ upload ảnh base64
const cookieParser = require('cookie-parser');
app.use(cookieParser()); // dùng để parse cookie từ request header

// khởi tạo route cho user:
const userRouter = require('./src/routes/userRouter');
app.use('/backend/api/users', userRouter);
const authRouter = require('./src/routes/authRouter');
app.use('/backend/api/auth', authRouter); // các route cần auth đã có verifyToken riêng trong authRouter
