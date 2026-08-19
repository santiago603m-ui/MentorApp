const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    student: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    course: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course', 
        required: true 
    },
    
    // Progreso
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    
    // Fechas
    enrolledAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    
    // Estado
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    
    // Certificado
    certificateUrl: { type: String },
    certificateIssuedAt: { type: Date },
    
    // Notas del estudiante (opcional)
    notes: { type: String, default: '' },
    
    // Review del curso (opcional)
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
    reviewedAt: { type: Date }
}, { timestamps: true });

// Índice único para evitar inscripciones duplicadas
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Método para actualizar progreso
enrollmentSchema.methods.updateProgress = function() {
    return this.populate('course').then(enrollment => {
        const totalLessons = enrollment.course.totalLessons;
        if (totalLessons === 0) {
            this.progress = 0;
        } else {
            this.progress = Math.round((this.completedLessons.length / totalLessons) * 100);
        }
        
        // Si completó el 100%, marcar como completado
        if (this.progress === 100 && !this.completedAt) {
            this.completedAt = new Date();
            this.status = 'completed';
        }
        
        return this.save();
    });
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);
