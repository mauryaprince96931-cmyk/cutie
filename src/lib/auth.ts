
export const loadAuthData = () => {
    const data = localStorage.getItem('cute_app_auth');
    if (data) {
        return JSON.parse(data);
    }
    return { admin: { passcode: '1234' }, users: [] };
};

export const saveAuthData = (data: any) => {
    localStorage.setItem('cute_app_auth', JSON.stringify(data));
};
