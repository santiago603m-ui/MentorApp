import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class RagService {
    private apiUrl = `${API_URL}/bot`;

    constructor(private http: HttpClient) { }

    uploadDocument(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('document', file);
        return this.http.post(`${this.apiUrl}/upload`, formData);
    }

    queryBot(question: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/query`, { question });
    }
}