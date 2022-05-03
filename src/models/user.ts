export interface User {
    uid: string;
    email: string|null;
    displayName: string|null;
    shortName?: string|null;
    photoURL: string|null;
}