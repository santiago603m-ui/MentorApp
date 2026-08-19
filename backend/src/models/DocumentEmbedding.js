const mongoose = require('mongoose');

const documentEmbeddingSchema = new mongoose.Schema({
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'md', 'txt'], required: true },
    textChunk: { type: String, required: true }, // Fragmento de texto extraído
    embedding: { type: [Number], required: true } // Vector numérico para la búsqueda semántica
}, { timestamps: true });

module.exports = mongoose.model('DocumentEmbedding', documentEmbeddingSchema);