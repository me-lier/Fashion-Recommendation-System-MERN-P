const jwt = require('jsonwebtoken');

const ensureAuthenticated = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(403).json({ 
            success: false, 
            message: 'No authorization header provided' 
        });
    }

    // Check if auth header has correct format
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid authorization format. Must be Bearer token' 
        });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ 
                success: false, 
                message: 'Token has expired' 
            });
        }
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

module.exports = ensureAuthenticated;