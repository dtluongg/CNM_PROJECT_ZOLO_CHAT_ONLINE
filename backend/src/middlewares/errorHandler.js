const errorHandler = (err, req, res, next) => {
    // Log lỗi để developer dễ debug trên console server
    console.error(`[ERROR] ${err.name}: ${err.message}`);
    // Có thể in cả stack trace nếu đang ở môi trường dev
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    const statusCode = err.statusCode || 500;
    
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Lỗi hệ thống nội bộ (Internal Server Error)',
        // Gợi ý cho frontend không cần đọc error stack của hệ thống
        error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
};

module.exports = errorHandler;
