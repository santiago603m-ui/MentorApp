const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Extraer y segmentar texto del PDF en fragmentos (chunks)
const extractAndChunkPDF = async (pdfBuffer) => {
    const parsedPdf = await pdfParse(pdfBuffer);
    const text = parsedPdf.text.replace(/\s+/g, ' ').trim();

    const chunkSize = 600;
    const overlap = 100;
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.slice(i, i + chunkSize));
    }

    return chunks;
};

// Generar respuesta con Groq LLM combinando prompt y contexto
const queryMentorBot = async (userQuestion, contextChunks, botConfig = {}) => {
    const { tone = 'profesional y claro', systemPrompt = '' } = botConfig;
    const contextText = contextChunks.join('\n---\n');

    const messages = [
        {
            role: 'system',
            content: `Eres el Mentor Bot interactuando en lugar del mentor.
Tono de respuesta: ${tone}.
${systemPrompt ? `Instrucciones del mentor: ${systemPrompt}` : ''}

REGLA STRICTA: Utiliza EXCLUSIVAMENTE el siguiente contexto documental para responder. Si la respuesta no está contenida en el texto, indica amablemente que no posees dicha información en la base del conocimiento.

Contexto disponible:
${contextText}`
        },
        { role: 'user', content: userQuestion }
    ];

    const completion = await groq.chat.completions.create({
        messages,
        model: 'openai/gpt-oss-20b',
        temperature: 0.4,
        max_tokens: 1024
    });

    return completion.choices[0]?.message?.content || 'No se pudo generar respuesta.';
};

module.exports = { extractAndChunkPDF, queryMentorBot };