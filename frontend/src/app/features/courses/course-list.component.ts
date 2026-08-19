import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CourseService, Course, CourseFilters } from '../../core/services/course.service';

interface Option {
    value: string;
    label: string;
}

@Component({
    selector: 'app-course-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './course-list.component.html',
    styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit {
    courses: Course[] = [];
    loading = false;
    errorMessage = '';
    pagination: { page: number; pages: number; total?: number } | null = null;

    filters: CourseFilters = this.defaultFilters();

    readonly categories: Option[] = [
        { value: 'frontend', label: 'Frontend' },
        { value: 'backend', label: 'Backend' },
        { value: 'fullstack', label: 'Full Stack' },
        { value: 'mobile', label: 'Mobile' },
        { value: 'devops', label: 'DevOps' },
        { value: 'data-science', label: 'Data Science' },
        { value: 'ai-ml', label: 'AI / ML' }
    ];

    readonly levels: Option[] = [
        { value: 'beginner', label: 'Principiante' },
        { value: 'intermediate', label: 'Intermedio' },
        { value: 'advanced', label: 'Avanzado' }
    ];

    readonly sortOptions: Option[] = [
        { value: '-createdAt', label: 'Más recientes' },
        { value: 'createdAt', label: 'Más antiguos' },
        { value: '-enrolledCount', label: 'Más populares' },
        { value: '-rating', label: 'Mejor valorados' },
        { value: 'price', label: 'Precio: menor a mayor' },
        { value: '-price', label: 'Precio: mayor a menor' }
    ];

    private readonly levelLabels: Record<string, string> = {
        beginner: 'Principiante',
        intermediate: 'Intermedio',
        advanced: 'Avanzado'
    };

    constructor(
        private courseService: CourseService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.fetch();
    }

    /** Nueva búsqueda: siempre vuelve a la primera página. */
    searchCourses(): void {
        this.filters.page = 1;
        this.fetch();
    }

    goToPage(page: number): void {
        if (!this.pagination) return;
        if (page < 1 || page > this.pagination.pages) return;

        this.filters.page = page;
        this.fetch(true);
    }

    clearFilters(): void {
        this.filters = this.defaultFilters();
        this.fetch();
    }

    getLevelLabel(level: string): string {
        return this.levelLabels[level] ?? level;
    }

    getInitial(name?: string): string {
        return (name?.trim().charAt(0) || 'M').toUpperCase();
    }

    formatPrice(price: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(price);
    }

    viewCourse(slug: string): void {
        this.router.navigate(['/courses', slug]);
    }

    private fetch(scrollTop = false): void {
        this.loading = true;
        this.errorMessage = '';

        this.courseService.getCourses(this.filters).subscribe({
            next: (res) => {
                this.courses = res.data ?? [];
                this.pagination = res.pagination ?? null;
                this.loading = false;

                if (scrollTop) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            },
            error: (err) => {
                this.loading = false;
                this.courses = [];
                this.pagination = null;
                this.errorMessage =
                    err?.error?.message ||
                    'Revisa que el servidor esté encendido e inténtalo otra vez.';
            }
        });
    }

    private defaultFilters(): CourseFilters {
        return {
            search: '',
            category: '',
            level: '',
            sort: '-createdAt',
            page: 1,
            limit: 12
        };
    }
}
