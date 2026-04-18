
import { User } from '../types';

export const loadAuth = () => {
    const data = localStorage.getItem('cute_app_auth');
    if (data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse auth data:', e);
        }
    }
    return { admin: { passcode: '1234' }, users: [] };
};

export const saveAuth = (data: any) => {
    localStorage.setItem('cute_app_auth', JSON.stringify(data));
};

export const loadUserData = (userId: string) => {
    const data = localStorage.getItem(`cute_user_${userId}`);
    if (data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse user data:', e);
        }
    }
    return { statements: [], endings: [], entryMessage: null };
};

export const saveUserData = (userId: string, data: any) => {
    localStorage.setItem(`cute_user_${userId}`, JSON.stringify(data));
};
