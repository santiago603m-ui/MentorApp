import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface AiMessage {
    sender: 'user' | 'ai';
    text: string;
}

@Injectable({
    providedIn: 'root'
})
export class AiService {
    private apiUrl = `${API_URL}/ai`;

    constructor(private http: HttpClient) { }

    askAi(messages: AiMessage[]): Observable<{ reply: string }> {
        return this.http.post<{ reply: string }>(`${this.apiUrl}/chat`, { messages });
    }
}