const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
    rating: { 
        type: Number, 
        required: true,
        min: 1,
        max: 5
    },
    comment: { type: String, trim: true },
    
    // Votos de otros usuarios
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    
    // Moderación
    isReported: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true }
}, { timestamps: true });

// Un estudiante solo puede dejar una review por curso
reviewSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
