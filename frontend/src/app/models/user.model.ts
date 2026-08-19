export interface User {
    _id?: string;
    name: string;
    email: string;
    role: 'student' | 'mentor' | 'admin';
    token?: string;
}