import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginScreen.css';

const LoginScreen = () => {
    const { login, register } = useAuth();
    const [selectedUser, setSelectedUser] = useState(null);
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await login(username, password);
        if (!result.success) setError(result.error);
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await register(username, password);
        if (!result.success) setError(result.error);
        setLoading(false);
    };

    const handleUserClick = () => {
        setSelectedUser(true);
        setIsRegister(false);
        setError('');
    };

    const handleNewUser = () => {
        setSelectedUser(true);
        setIsRegister(true);
        setError('');
        setUsername('');
        setPassword('');
    };

    const handleBack = () => {
        setSelectedUser(null);
        setError('');
        setUsername('');
        setPassword('');
    };

    return (
        <div className="xp-login-screen">
            {/* Top gradient bar */}
            <div className="xp-login-top-bar">
                <div className="xp-top-stripe" />
            </div>

            {/* Center content */}
            <div className="xp-login-center">
                {/* Left: Windows branding */}
                <div className="xp-login-branding">
                    <div className="xp-logo-group">
                        <div className="xp-flag">
                            <div className="flag-r"></div>
                            <div className="flag-g"></div>
                            <div className="flag-b"></div>
                            <div className="flag-y"></div>
                        </div>
                        <div className="xp-brand-text">
                            <span className="xp-brand-windows">Windows</span>
                            <span className="xp-brand-xp"><em>XP</em></span>
                        </div>
                    </div>
                    <p className="xp-tagline">To begin, click your user name</p>
                </div>

                {/* Divider */}
                <div className="xp-login-divider" />

                {/* Right: User list / login form */}
                <div className="xp-login-users">
                    {!selectedUser ? (
                        <>
                            {/* User card */}
                            <div className="xp-user-card" onClick={handleUserClick}>
                                <div className="xp-user-icon">
                                    <img
                                        src="/assets/xp-user-icon.png"
                                        alt="User"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://ui-avatars.com/api/?name=User&background=3c5fb1&color=fff&size=64";
                                        }}
                                    />
                                </div>
                                <div className="xp-user-info">
                                    <span className="xp-user-name">Log In</span>
                                    <span className="xp-user-hint">Password protected</span>
                                </div>
                                <div className="xp-user-arrow">▸</div>
                            </div>

                            {/* New user card */}
                            <div className="xp-user-card new-user" onClick={handleNewUser}>
                                <div className="xp-user-icon new">
                                    <span>+</span>
                                </div>
                                <div className="xp-user-info">
                                    <span className="xp-user-name">Create New Account</span>
                                    <span className="xp-user-hint">Set up a new user</span>
                                </div>
                                <div className="xp-user-arrow">▸</div>
                            </div>
                        </>
                    ) : (
                        <form className="xp-password-form" onSubmit={isRegister ? handleRegister : handleLogin}>
                            <button type="button" className="xp-back-btn" onClick={handleBack}>← Back</button>
                            <div className="xp-form-user-header">
                                <div className="xp-user-icon small">
                                    <img
                                        src="/assets/xp-user-icon.png"
                                        alt="User"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://ui-avatars.com/api/?name=U&background=3c5fb1&color=fff&size=48";
                                        }}
                                    />
                                </div>
                                <span className="xp-form-label">
                                    {isRegister ? 'Create a new account' : 'Welcome back'}
                                </span>
                            </div>

                            <div className="xp-field-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Type your user name"
                                    autoFocus
                                    required
                                    className="xp-login-input"
                                />
                            </div>
                            <div className="xp-field-group">
                                <label>Password</label>
                                <div className="xp-pw-row">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Type your password"
                                        required
                                        className="xp-login-input"
                                    />
                                    <button type="submit" className="xp-go-btn" disabled={loading}>
                                        {loading ? '...' : '→'}
                                    </button>
                                </div>
                            </div>

                            {error && <div className="xp-login-error">{error}</div>}
                        </form>
                    )}
                </div>
            </div>

            {/* Bottom bar */}
            <div className="xp-login-bottom">
                <div className="xp-shutdown-btn">
                    <span className="xp-power-icon">⏻</span>
                    <span>Turn off computer</span>
                </div>
                <div className="xp-after-logon">
                    After you log on, you can add or change accounts.<br />
                    Just go to Control Panel and click User Accounts.
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
