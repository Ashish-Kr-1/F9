import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginScreen.css';

const LoginScreen = () => {
    const { login, register } = useAuth();
    const [isLoginView, setIsLoginView] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const action = isLoginView ? login : register;
        const result = await action(username, password);

        if (!result.success) {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div className="xp-login-screen">
            <div className="xp-login-top-bar"></div>

            <div className="xp-login-center-panel">
                <div className="xp-login-left-side">
                    <h1 className="xp-welcome-text">Windows<br /><span>XP</span></h1>
                    <p className="xp-welcome-subtext">To begin, click your user name</p>
                </div>

                <div className="xp-login-divider"></div>

                <div className="xp-login-right-side">
                    <form className="xp-login-form" onSubmit={handleSubmit}>
                        <div className="xp-user-avatar">
                            <img src="/assets/xp-user-icon.png" alt="User" onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://ui-avatars.com/api/?name=User&background=025a9c&color=fff";
                            }} />
                        </div>

                        <div className="xp-auth-fields">
                            <h2 className="xp-form-title">{isLoginView ? 'Welcome' : 'Create Account'}</h2>

                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="xp-input"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="xp-input"
                            />

                            {error && <div className="xp-error-msg">{error}</div>}

                            <div className="xp-auth-actions">
                                <button type="submit" disabled={loading} className="xp-btn-submit">
                                    {loading ? '...' : (isLoginView ? 'Log In \u2192' : 'Register \u2192')}
                                </button>
                            </div>

                            <div className="xp-toggle-auth" onClick={() => {
                                setIsLoginView(!isLoginView);
                                setError('');
                            }}>
                                {isLoginView ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div className="xp-login-bottom-bar">
                <div className="xp-power-btn">
                    <img src="/assets/power-icon.png" alt="Power" onError={(e) => e.target.style.display = 'none'} />
                    <span>Turn off computer</span>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
