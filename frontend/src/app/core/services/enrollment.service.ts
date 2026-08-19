import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Course } from './course.service';
import { API_URL } from '../config/api.config';

export interface Enrollment {
    _id: string;
    student: string;
    course: Course;
    progress: number;
    completedLessons: string[];
    enrolledAt: string;
    lastAccessedAt: string;
    completedAt?: string;
    status: 'active' | 'completed' | 'cancelled';
    certificateUrl?: string;
    rating?: number;
    review?: string;
}

@Injectable({
    providedIn: 'root'
})
export class EnrollmentService {
    private apiUrl = `${API_URL}/enrollments`;

    constructor(private http: HttpClient) { }

    enrollCourse(courseId: string): Observable<{
        success: boolean;
        data: Enrollment;
        message: string;
    }> {
        return this.http.post<any>(`${this.apiUrl}/${courseId}`, {});
    }

    getMyEnrollments(status?: string): Observable<{
        success: boolean;
        data: Enrollment[];
    }> {
        let params = new HttpParams();
        if (status) params = params.set('status', status);
        
        return this.http.get<any>(`${this.apiUrl}/my-enrollments`, { params });
    }

    getCourseProgress(courseId: string): Observable<{
        success: boolean;
        data: {
            progress: number;
            completedLessons: string[];
            totalLessons: number;
            enrolledAt: string;
            lastAccessedAt: string;
            status: string;
        };
    }> {
        return this.http.get<any>(`${this.apiUrl}/${courseId}/progress`);
    }

    completeLesson(courseId: string, lessonId: string): Observable<{
        success: boolean;
        data: {
            progress: number;
            completedLessons: string[];
            status: string;
            completedAt?: string;
        };
        message: string;
    }> {
        return this.http.post<any>(`${this.apiUrl}/${courseId}/lessons/${lessonId}/complete`, {});
    }

    updateLastAccess(courseId: string): Observable<{
        success: boolean;
        data: Enrollment;
    }> {
        return this.http.put<any>(`${this.apiUrl}/${courseId}/access`, {});
    }

    cancelEnrollment(courseId: string): Observable<{
        success: boolean;
        message: string;
    }> {
        return this.http.delete<any>(`${this.apiUrl}/${courseId}`);
    }
}
