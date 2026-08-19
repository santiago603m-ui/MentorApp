const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: {
        type: String,
        enum: ['aprendiz', 'mentor', 'bot'],
        required: true
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);