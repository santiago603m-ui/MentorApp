const mongoose = require('mongoose');

const mentorBotConfigSchema = new mongoose.Schema({
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  systemPrompt: { type: String, default: 'Eres un asistente técnico pedagógico.' },
  tone: { type: String, default: 'amigable' }, // Tono de la respuesta
  explanationStyle: { type: String, default: 'detallado' }, // Nivel de detalle
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('MentorBotConfig', mentorBotConfigSchema);