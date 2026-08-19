const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
    enrollCourse,
    getMyEnrollments,
    getCourseProgress,
    completeLesson,
    cancelEnrollment,
    updateLastAccess
} = require('../controllers/enrollment.controller');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas de inscripciones
router.post('/:courseId', enrollCourse);
router.get('/my-enrollments', getMyEnrollments);
router.get('/:courseId/progress', getCourseProgress);
router.post('/:courseId/lessons/:lessonId/complete', completeLesson);
router.put('/:courseId/access', updateLastAccess);
router.delete('/:courseId', cancelEnrollment);

module.exports = router;
