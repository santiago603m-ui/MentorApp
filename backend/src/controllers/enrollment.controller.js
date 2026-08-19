const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// @desc    Inscribirse a un curso
// @route   POST /api/enrollments/:courseId
// @access  Private (Student)
exports.enrollCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        
        // Verificar que el curso existe y está publicado
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Curso no encontrado'
            });
        }
        
        if (!course.isPublished) {
            return res.status(400).json({
                success: false,
                message: 'Este curso no está disponible'
            });
        }
        
        // Verificar que no esté ya inscrito
        const existingEnrollment = await Enrollment.findOne({
            student: req.user._id,
            course: courseId
        });
        
        if (existingEnrollment) {
            return res.status(400).json({
                success: false,
                message: 'Ya estás inscrito en este curso'
            });
        }
        
        // Crear inscripción
        const enrollment = await Enrollment.create({
            student: req.user._id,
            course: courseId
        });
        
        // Incrementar contador de inscritos en el curso
        course.enrolledCount += 1;
        await course.save();
        
        const populatedEnrollment = await Enrollment.findById(enrollment._id)
            .populate('course', 'title slug thumbnail');
        
        res.status(201).json({
            success: true,
            data: populatedEnrollment,
            message: 'Te has inscrito exitosamente al curso'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error al inscribirse al curso',
            error: error.message
        });
    }
};

// @desc    Obtener mis cursos inscritos
// @route   GET /api/enrollments/my-enrollments
// @access  Private (Student)
exports.getMyEnrollments = async (req, res) => {
    try {
        const { status } = req.query;
        
        const filter = { student: req.user._id };
        if (status) filter.status = status;
        
        const enrollments = await Enrollment.find(filter)
            .populate({
                path: 'course',
                select: 'title slug description thumbnail level category totalDuration totalLessons mentor',
                populate: {
                    path: 'mentor',
                    select: 'name'
                }
            })
            .sort('-lastAccessedAt');
        
        res.json({
            success: true,
            data: enrollments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener tus inscripciones',
            error: error.message
        });
    }
};

// @desc    Obtener progreso de un curso específico
// @route   GET /api/enrollments/:courseId/progress
// @access  Private (Student)
exports.getCourseProgress = async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            student: req.user._id,
            course: req.params.courseId
        }).populate('course');
        
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'No estás inscrito en este curso'
            });
        }
        
        res.json({
            success: true,
            data: {
                progress: enrollment.progress,
                completedLessons: enrollment.completedLessons,
                totalLessons: enrollment.course.totalLessons,
                enrolledAt: enrollment.enrolledAt,
                lastAccessedAt: enrollment.lastAccessedAt,
                status: enrollment.status
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el progreso',
            error: error.message
        });
    }
};

// @desc    Marcar lección como completada
// @route   POST /api/enrollments/:courseId/lessons/:lessonId/complete
// @access  Private (Student)
exports.completeLesson = async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        
        const enrollment = await Enrollment.findOne({
            student: req.user._id,
            course: courseId
        });
        
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'No estás inscrito en este curso'
            });
        }
        
        // Verificar que la lección no esté ya completada
        if (!enrollment.completedLessons.includes(lessonId)) {
            enrollment.completedLessons.push(lessonId);
            enrollment.lastAccessedAt = new Date();
            
            // Actualizar progreso
            await enrollment.updateProgress();
        }
        
        res.json({
            success: true,
            data: {
                progress: enrollment.progress,
                completedLessons: enrollment.completedLessons,
                status: enrollment.status,
                completedAt: enrollment.completedAt
            },
            message: 'Lección marcada como completada'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error al marcar la lección como completada',
            error: error.message
        });
    }
};

// @desc    Cancelar inscripción
// @route   DELETE /api/enrollments/:courseId
// @access  Private (Student)
exports.cancelEnrollment = async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            student: req.user._id,
            course: req.params.courseId
        });
        
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'No estás inscrito en este curso'
            });
        }
        
        // Marcar como cancelada en lugar de eliminar
        enrollment.status = 'cancelled';
        await enrollment.save();
        
        // Decrementar contador de inscritos
        await Course.findByIdAndUpdate(req.params.courseId, {
            $inc: { enrolledCount: -1 }
        });
        
        res.json({
            success: true,
            message: 'Inscripción cancelada correctamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cancelar la inscripción',
            error: error.message
        });
    }
};

// @desc    Actualizar última fecha de acceso
// @route   PUT /api/enrollments/:courseId/access
// @access  Private (Student)
exports.updateLastAccess = async (req, res) => {
    try {
        const enrollment = await Enrollment.findOneAndUpdate(
            {
                student: req.user._id,
                course: req.params.courseId
            },
            {
                lastAccessedAt: new Date()
            },
            { new: true }
        );
        
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'No estás inscrito en este curso'
            });
        }
        
        res.json({
            success: true,
            data: enrollment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar acceso',
            error: error.message
        });
    }
};
