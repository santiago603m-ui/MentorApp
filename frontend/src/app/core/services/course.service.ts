import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface Course {
    _id: string;
    title: string;
    slug: string;
    description: string;
    mentor: {
        _id: string;
        name: string;
        email?: string;
    };
    level: 'beginner' | 'intermediate' | 'advanced';
    category: string;
    thumbnail: string;
    price: number;
    isPublished: boolean;
    modules: Module[];
    enrolledCount: number;
    rating: number;
    reviewCount: number;
    totalDuration: number;
    totalLessons: number;
    tags: string[];
    requirements: string[];
    whatYouWillLearn: string[];
    createdAt: string;
}

export interface Module {
    _id: string;
    title: string;
    description: string;
    order: number;
    lessons: Lesson[];
}

export interface Lesson {
    _id: string;
    title: string;
    description: string;
    type: 'video' | 'live' | 'reading' | 'exercise' | 'quiz';
    content: string;
    duration: number;
    order: number;
    resources: Resource[];
    isPublished: boolean;
}

export interface Resource {
    title: string;
    url: string;
    type: 'pdf' | 'link' | 'code' | 'other';
}

export interface CourseFilters {
    category?: string;
    level?: string;
    search?: string;
    mentor?: string;
    featured?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
}

@Injectable({
    providedIn: 'root'
})
export class CourseService {
    private apiUrl = `${API_URL}/courses`;

    constructor(private http: HttpClient) { }

    getCourses(filters?: CourseFilters): Observable<{
        success: boolean;
        data: Course[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        let params = new HttpParams();
        
        if (filters) {
            if (filters.category) params = params.set('category', filters.category);
            if (filters.level) params = params.set('level', filters.level);
            if (filters.search) params = params.set('search', filters.search);
            if (filters.mentor) params = params.set('mentor', filters.mentor);
            if (filters.featured !== undefined) params = params.set('featured', filters.featured.toString());
            if (filters.sort) params = params.set('sort', filters.sort);
            if (filters.page) params = params.set('page', filters.page.toString());
            if (filters.limit) params = params.set('limit', filters.limit.toString());
        }
        
        return this.http.get<any>(`${this.apiUrl}`, { params });
    }

    getCourse(identifier: string): Observable<{
        success: boolean;
        data: Course;
        isEnrolled: boolean;
    }> {
        return this.http.get<any>(`${this.apiUrl}/${identifier}`);
    }

    createCourse(courseData: Partial<Course>): Observable<{
        success: boolean;
        data: Course;
    }> {
        return this.http.post<any>(`${this.apiUrl}`, courseData);
    }

    updateCourse(id: string, courseData: Partial<Course>): Observable<{
        success: boolean;
        data: Course;
    }> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, courseData);
    }

    deleteCourse(id: string): Observable<{
        success: boolean;
        message: string;
    }> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }

    togglePublish(id: string): Observable<{
        success: boolean;
        data: Course;
        message: string;
    }> {
        return this.http.put<any>(`${this.apiUrl}/${id}/publish`, {});
    }

    getMyCourses(): Observable<{
        success: boolean;
        data: Course[];
    }> {
        return this.http.get<any>(`${this.apiUrl}/mentor/my-courses`);
    }
}
