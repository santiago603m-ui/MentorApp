const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Endpoint: POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Validación de inputs
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Por favor proporciona nombre, email y contraseña' 
            });
        }
        
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                message: 'Email inválido' 
            });
        }
        
        // Validar complejidad de contraseña
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }

        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({ 
                success: false,
                message: 'El correo ya está registrado' 
            });
        }

        // SEGURIDAD: Hash de contraseña con bcrypt (factor 12)
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || 'student'
        });

        await newUser.save();
        
        // No devolver la contraseña
        const userResponse = {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        };
        
        res.status(201).json({ 
            success: true,
            data: userResponse,
            message: 'Usuario registrado exitosamente' 
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error en el servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Endpoint: POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Por favor proporciona email y contraseña' 
            });
        }

        // SEGURIDAD: Incluir password y campos de bloqueo para validación
        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+password +loginAttempts +lockUntil');
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Credenciales inválidas' 
            });
        }
        
        // SEGURIDAD: Verificar si la cuenta está bloqueada
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(423).json({ 
                success: false,
                message: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutesLeft} minutos.`
            });
        }

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            // SEGURIDAD: Incrementar intentos fallidos
            await user.incrementLoginAttempts();
            
            return res.status(401).json({ 
                success: false,
                message: 'Credenciales inválidas' 
            });
        }
        
        // SEGURIDAD: Resetear intentos de login después de login exitoso
        await user.resetLoginAttempts();

        // SEGURIDAD: Generar JWT con expiración corta (8 horas)
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error en el servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;