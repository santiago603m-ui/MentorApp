const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
    createCourse,
    getCourses,
    getCourse,
    updateCourse,
    deleteCourse,
    togglePublish,
    getMyCourses
} = require('../controllers/course.controller');

// Rutas públicas
router.get('/', getCourses);
router.get('/:identifier', getCourse);

// Rutas protegidas (mentor/admin)
router.post('/', protect, authorize('mentor', 'admin'), createCourse);
router.get('/mentor/my-courses', protect, authorize('mentor', 'admin'), getMyCourses);
router.put('/:id', protect, authorize('mentor', 'admin'), updateCourse);
router.delete('/:id', protect, authorize('mentor', 'admin'), deleteCourse);
router.put('/:id/publish', protect, authorize('mentor', 'admin'), togglePublish);

module.exports = router;
