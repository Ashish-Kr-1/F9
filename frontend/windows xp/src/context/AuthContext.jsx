import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Create an axois instance with the base API URL
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Development mode: always start unauthenticated
    useEffect(() => {
        // Clear any existing token to force login screen during dev
        localStorage.removeItem('xp_token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            const { user, token } = res.data;

            localStorage.setItem('xp_token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const register = async (email, password) => {
        try {
            const res = await api.post('/auth/register', { email, password });
            const { user, token } = res.data;

            localStorage.setItem('xp_token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Registration failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('xp_token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, api }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
