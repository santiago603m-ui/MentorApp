const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false }, // SEGURIDAD: No devolver password por defecto
    role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
    
    // Seguridad y verificación
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    
    // 2FA (futuro)
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    
    // Recuperación de contraseña
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    
    // Seguridad: Intentos de login
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    
    // Perfil (futuro)
    bio: { type: String, maxlength: 500 },
    avatar: { type: String },
    
    // Audit trail
    lastLogin: { type: Date },
    lastPasswordChange: { type: Date }
}, { timestamps: true });

// Índices
userSchema.index({ email: 1 });

// Virtual para verificar si la cuenta está bloqueada
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Método para incrementar intentos de login fallidos
userSchema.methods.incrementLoginAttempts = function() {
    // Si ya está bloqueado y el tiempo expiró, resetear
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    const maxAttempts = 5;
    const lockTime = 15 * 60 * 1000; // 15 minutos
    
    // Bloquear después de 5 intentos
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime };
    }
    
    return this.updateOne(updates);
};

// Método para resetear intentos de login después de login exitoso
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $set: { loginAttempts: 0, lastLogin: new Date() },
        $unset: { lockUntil: 1 }
    });
};

module.exports = mongoose.model('User', userSchema);