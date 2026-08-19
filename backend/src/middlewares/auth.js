const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            // Verificar token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // SEGURIDAD: No devolver password ni campos sensibles
            req.user = await User.findById(decoded.id).select('-password -passwordResetToken -emailVerificationToken');
            
            if (!req.user) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Usuario no encontrado' 
                });
            }
            
            return next();
        } catch (error) {
            console.error('Error en autenticación:', error.message);
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Token expirado' 
                });
            }
            
            return res.status(401).json({ 
                success: false,
                message: 'No autorizado, token no válido' 
            });
        }
    }
    
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'No autorizado, falta el token' 
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: 'No autenticado' 
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                message: `El rol ${req.user.role} no tiene permisos para esta acción` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };