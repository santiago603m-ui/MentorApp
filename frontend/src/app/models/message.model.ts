import { User } from './user.model';

export interface Message {
    _id?: string;

    /** Poblado por el backend (`populate('sender', 'name email role')`). */
    sender?: string | User;

    /** Texto normalizado en el cliente. */
    content: string;

    /** Campo real del documento en Mongo; se normaliza a `content`. */
    message?: string;

    roomId?: string;
    /** @deprecated usar `roomId` */
    room?: string;

    createdAt?: string | Date;
}
