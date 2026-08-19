const DocumentEmbedding = require('../models/DocumentEmbedding');
const MentorBotConfig = require('../models/MentorBotConfig');
const { extractAndChunkPDF, queryMentorBot } = require('../services/rag.service');

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Por favor sube un archivo PDF' });
        }

        const chunks = await extractAndChunkPDF(req.file.buffer);

        const docEntries = chunks.map((chunk, index) => ({
            mentor: req.user._id,
            fileName: req.file.originalname,
            fileType: 'pdf', // Se ajusta al enum esperado por el esquema
            textChunk: chunk,
            chunkIndex: index
        }));

        await DocumentEmbedding.insertMany(docEntries);

        res.status(201).json({
            message: 'PDF procesado e indexado correctamente',
            totalChunks: chunks.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Error procesando el PDF', error: error.message });
    }
};

exports.askBot = async (req, res) => {
    try {
        const { question, mentorId } = req.body;

        const docs = await DocumentEmbedding.find({ mentor: mentorId }).limit(5);
        const contextChunks = docs.map((doc) => doc.textChunk);

        if (contextChunks.length === 0) {
            return res.status(404).json({ message: 'El mentor no tiene documentos cargados aún.' });
        }

        const config = await MentorBotConfig.findOne({ mentor: mentorId });

        const reply = await queryMentorBot(question, contextChunks, config || {});

        res.json({ answer: reply });
    } catch (error) {
        res.status(500).json({ message: 'Error al consultar el Bot', error: error.message });
    }
};