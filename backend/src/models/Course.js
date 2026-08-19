const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    type: { 
        type: String, 
        enum: ['video', 'live', 'reading', 'exercise', 'quiz'],
        required: true 
    },
    content: { type: String }, // URL del video, texto del artículo, etc.
    duration: { type: Number, default: 0 }, // Duración en minutos
    order: { type: Number, required: true },
    resources: [{
        title: String,
        url: String,
        type: { type: String, enum: ['pdf', 'link', 'code', 'other'] }
    }],
    isPublished: { type: Boolean, default: false }
}, { timestamps: true });

const moduleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true },
    lessons: [lessonSchema]
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String, required: true },
    mentor: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    level: { 
        type: String, 
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    category: { 
        type: String, 
        required: true,
        enum: ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'data-science', 'ai-ml', 'other']
    },
    thumbnail: { type: String, default: '' },
    price: { type: Number, default: 0 }, // 0 = gratis
    currency: { type: String, default: 'USD' },
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    modules: [moduleSchema],
    
    // Estadísticas
    enrolledCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    
    // Metadata
    tags: [{ type: String }],
    requirements: [{ type: String }],
    whatYouWillLearn: [{ type: String }],
    targetAudience: [{ type: String }],
    
    // Duración total calculada
    totalDuration: { type: Number, default: 0 }, // En minutos
    totalLessons: { type: Number, default: 0 }
}, { timestamps: true });

// Middleware para generar slug antes de guardar
courseSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    }
    
    // Calcular totales
    this.totalLessons = 0;
    this.totalDuration = 0;
    
    this.modules.forEach(module => {
        this.totalLessons += module.lessons.length;
        module.lessons.forEach(lesson => {
            this.totalDuration += lesson.duration || 0;
        });
    });
    
    next();
});

// Índices para búsqueda
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ mentor: 1, isPublished: 1 });
courseSchema.index({ category: 1, level: 1 });

module.exports = mongoose.model('Course', courseSchema);
