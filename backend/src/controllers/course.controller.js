const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/Review');

// @desc    Crear nuevo curso
// @route   POST /api/courses
// @access  Private (Mentor/Admin)
exports.createCourse = async (req, res) => {
    try {
        const courseData = {
            ...req.body,
            mentor: req.user._id
        };
        
        const course = await Course.create(courseData);
        
        res.status(201).json({
            success: true,
            data: course
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error al crear el curso',
            error: error.message
        });
    }
};

// @desc    Obtener todos los cursos (con filtros)
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res) => {
    try {
        const { 
            category, 
            level, 
            search, 
            mentor,
            featured,
            sort = '-createdAt',
            page = 1,
            limit = 12
        } = req.query;
        
        // Construir filtros
        const filters = { isPublished: true };
        
        if (category) filters.category = category;
        if (level) filters.level = level;
        if (mentor) filters.mentor = mentor;
        if (featured) filters.isFeatured = featured === 'true';
        if (search) {
            filters.$text = { $search: search };
        }
        
        // Paginación
        const skip = (page - 1) * limit;
        
        // Ejecutar query
        const courses = await Course.find(filters)
            .populate('mentor', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Course.countDocuments(filters);
        
        res.json({
            success: true,
            data: courses,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener cursos',
            error: error.message
        });
    }
};

// @desc    Obtener curso por ID o slug
// @route   GET /api/courses/:identifier
// @access  Public
exports.getCourse = async (req, res) => {
    try {
        const { identifier } = req.params;
        
        // Buscar por ID o slug
        const query = mongoose.Types.ObjectId.isValid(identifier)
            ? { _id: identifier }
            : { slug: identifier };
        
        const course = await Course.findOne(query)
            .populate('mentor', 'name email bio avatar');
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Curso no encontrado'
            });
        }
        
        // Incrementar contador de vistas
        course.viewCount += 1;
        await course.save();
        
        // Si el usuario está autenticado, verificar si está inscrito
        let isEnrolled = false;
        if (req.user) {
            const enrollment = await Enrollment.findOne({
                student: req.user._id,
                course: course._id
            });
            isEnrolled = !!enrollment;
        }
        
        res.json({
            success: true,
            data: course,
            isEnrolled
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el curso',
            error: error.message
        });
    }
};

// @desc    Actualizar curso
// @route   PUT /api/courses/:id
// @access  Private (Mentor owner/Admin)
exports.updateCourse = async (req, res) => {
    try {
        let course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Curso no encontrado'
            });
        }
        
        // Verificar que el usuario es el mentor del curso o admin
        if (course.mentor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para editar este curso'
            });
        }
        
        course = await Course.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        res.json({
            success: true,
            data: course
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error al actualizar el curso',
            error: error.message
        });
    }
};

// @desc    Eliminar curso
// @route   DELETE /api/courses/:id
// @access  Private (Mentor owner/Admin)
exports.deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Curso no encontrado'
            });
        }
        
        // Verificar permisos
        if (course.mentor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para eliminar este curso'
            });
        }
        
        await course.deleteOne();
        
        res.json({
            success: true,
            message: 'Curso eliminado correctamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el curso',
            error: error.message
        });
    }
};

// @desc    Publicar/despublicar curso
// @route   PUT /api/courses/:id/publish
// @access  Private (Mentor owner/Admin)
exports.togglePublish = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Curso no encontrado'
            });
        }
        
        // Verificar permisos
        if (course.mentor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para publicar este curso'
            });
        }
        
        course.isPublished = !course.isPublished;
        await course.save();
        
        res.json({
            success: true,
            data: course,
            message: course.isPublished ? 'Curso publicado' : 'Curso despublicado'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado de publicación',
            error: error.message
        });
    }
};

// @desc    Obtener cursos del mentor autenticado
// @route   GET /api/courses/my-courses
// @access  Private (Mentor)
exports.getMyCourses = async (req, res) => {
    try {
        const courses = await Course.find({ mentor: req.user._id })
            .sort('-createdAt');
        
        res.json({
            success: true,
            data: courses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener tus cursos',
            error: error.message
        });
    }
};
