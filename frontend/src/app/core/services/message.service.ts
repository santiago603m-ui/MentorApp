import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message } from '../../models/message.model';
import { API_URL } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class MessageService {
    private apiUrl = `${API_URL}/messages`;

    constructor(private http: HttpClient) { }

    getMessagesByRoom(roomId: string): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.apiUrl}/${roomId}`);
    }
}