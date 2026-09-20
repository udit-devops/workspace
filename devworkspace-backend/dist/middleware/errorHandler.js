export const errorHandler = (err, _req, res, _next) => {
    console.error(err);
    return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Server Error",
    });
};
