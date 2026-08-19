import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CourseService, Course } from '../../core/services/course.service';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-course-detail',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './course-detail.component.html',
    styleUrls: ['./course-detail.component.css']
})
export class CourseDetailComponent implements OnInit {
    course: Course | null = null;
    loading = true;
    isEnrolled = false;
    enrolling = false;
    expandedModules: boolean[] = [];

    private readonly levelLabels: Record<string, string> = {
        beginner: 'Principiante',
        intermediate: 'Intermedio',
        advanced: 'Avanzado'
    };

    private readonly categoryLabels: Record<string, string> = {
        frontend: 'Frontend',
        backend: 'Backend',
        fullstack: 'Full Stack',
        mobile: 'Mobile',
        devops: 'DevOps',
        'data-science': 'Data Science',
        'ai-ml': 'AI / ML'
    };

    private readonly lessonIcons: Record<string, string> = {
        video: '🎥',
        live: '🔴',
        reading: '📖',
        exercise: '💪',
        quiz: '📝'
    };

    private readonly lessonTypeLabels: Record<string, string> = {
        video: 'Video',
        live: 'Clase en vivo',
        reading: 'Lectura',
        exercise: 'Ejercicio',
        quiz: 'Quiz'
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private courseService: CourseService,
        private enrollmentService: EnrollmentService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.loadCourse(params['slug']);
        });
    }

    loadCourse(identifier: string): void {
        this.loading = true;

        this.courseService.getCourse(identifier).subscribe({
            next: (res) => {
                this.course = res.data;
                this.isEnrolled = res.isEnrolled;
                this.expandedModules = new Array(this.course?.modules?.length ?? 0).fill(false);

                // El primer módulo abierto de entrada: da contexto sin obligar a hacer clic
                if (this.expandedModules.length > 0) {
                    this.expandedModules[0] = true;
                }

                this.loading = false;
            },
            error: (err) => {
                console.error('Error al cargar curso:', err);
                this.course = null;
                this.loading = false;
            }
        });
    }

    enroll(): void {
        if (!this.authService.isLoggedIn()) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
            return;
        }

        if (!this.course || this.enrolling) return;

        this.enrolling = true;

        this.enrollmentService.enrollCourse(this.course._id).subscribe({
            next: () => {
                this.isEnrolled = true;
                this.enrolling = false;
                this.router.navigate(['/courses', this.course!.slug, 'play']);
            },
            error: (err) => {
                console.error('Error al inscribirse:', err);
                this.enrolling = false;
            }
        });
    }

    toggleModule(index: number): void {
        this.expandedModules[index] = !this.expandedModules[index];
    }

    getLevelLabel(level: string): string {
        return this.levelLabels[level] ?? level;
    }

    getCategoryLabel(category: string): string {
        return this.categoryLabels[category] ?? category;
    }

    getLessonIcon(type: string): string {
        return this.lessonIcons[type] ?? '📄';
    }

    getLessonTypeLabel(type: string): string {
        return this.lessonTypeLabels[type] ?? type;
    }

    formatPrice(price: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(price);
    }

    formatDuration(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    getModuleDuration(module: any): string {
        const total = (module?.lessons ?? []).reduce(
            (sum: number, lesson: any) => sum + (lesson.duration || 0),
            0
        );
        return this.formatDuration(total);
    }
}
