/**
 * Script de Verificación Rápida - MentorSync Backend
 * Ejecutar con: node test-connection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🧪 Iniciando verificación del sistema...\n');

// 1. Verificar Variables de Entorno
console.log('📋 Variables de Entorno:');
console.log('  ✓ PORT:', process.env.PORT || '5000 (default)');
console.log('  ✓ CLIENT_URL:', process.env.CLIENT_URL || 'http://localhost:4200 (default)');
console.log('  ✓ MONGO_URI:', process.env.MONGO_URI ? '✅ Configurado' : '❌ NO CONFIGURADO');
console.log('  ✓ JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ NO CONFIGURADO');
console.log('  ✓ GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Configurado' : '❌ NO CONFIGURADO');
console.log('');

// 2. Verificar Conexión a MongoDB
console.log('🔌 Intentando conectar a MongoDB...');
mongoose.connect(process.env.MONGO_URI)
    .then((conn) => {
        console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
        console.log(`✅ Base de datos: ${conn.connection.name}`);
        console.log('');
        
        // 3. Verificar Colecciones
        return conn.connection.db.listCollections().toArray();
    })
    .then((collections) => {
        console.log('📦 Colecciones en la base de datos:');
        if (collections.length === 0) {
            console.log('  ⚠️  No hay colecciones aún (normal en DB nueva)');
        } else {
            collections.forEach(col => {
                console.log(`  ✓ ${col.name}`);
            });
        }
        console.log('');
        
        // 4. Verificar Modelos
        console.log('📊 Modelos de Mongoose disponibles:');
        const models = ['User', 'Message', 'ChatHistory', 'DocumentEmbedding', 'MentorBotConfig'];
        models.forEach(model => {
            try {
                require(`./src/models/${model}`);
                console.log(`  ✓ ${model} - OK`);
            } catch (err) {
                console.log(`  ❌ ${model} - ERROR: ${err.message}`);
            }
        });
        console.log('');
        
        // 5. Test de Groq API
        console.log('🤖 Verificando conexión con Groq API...');
        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        return groq.chat.completions.create({
            messages: [{ role: 'user', content: 'Responde solo: OK' }],
            model: 'openai/gpt-oss-20b',
            max_tokens: 5
        });
    })
    .then((completion) => {
        console.log(`✅ Groq API responde correctamente`);
        console.log(`  Respuesta: "${completion.choices[0]?.message?.content}"`);
        console.log('');
        
        console.log('🎉 TODAS LAS VERIFICACIONES EXITOSAS');
        console.log('');
        console.log('✅ El backend está listo para ejecutarse');
        console.log('   Ejecuta: npm run dev');
        console.log('');
        
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('❌ ERROR EN LA VERIFICACIÓN:');
        console.error('  ', error.message);
        console.error('');
        
        if (error.message.includes('MONGO')) {
            console.error('💡 Solución: Verifica tu MONGO_URI en el archivo .env');
        } else if (error.message.includes('API')) {
            console.error('💡 Solución: Verifica tu GROQ_API_KEY en el archivo .env');
        }
        
        console.error('');
        process.exit(1);
    });
