import React, { useState, useEffect } from 'react';
import './BootScreen.css';

const BootScreen = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => onComplete(), 400);
                    return 100;
                }
                return prev + 2;
            });
        }, 60);
        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="boot-screen">
            <div className="boot-content">
                <div className="boot-logo">
                    <div className="boot-flag">
                        <div className="flag-pane red"></div>
                        <div className="flag-pane green"></div>
                        <div className="flag-pane blue"></div>
                        <div className="flag-pane yellow"></div>
                    </div>
                    <div className="boot-text">
                        <span className="boot-windows">Microsoft</span>
                        <span className="boot-xp">
                            Windows<sup>®</sup><em>XP</em>
                        </span>
                    </div>
                </div>
                <div className="boot-progress-area">
                    <div className="boot-progress-track">
                        <div className="boot-progress-blocks">
                            {[...Array(Math.floor(progress / 5))].map((_, i) => (
                                <div key={i} className="boot-block" style={{ animationDelay: `${i * 0.05}s` }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="boot-copyright">
                Copyright © Microsoft Corporation
            </div>
        </div>
    );
};

export default BootScreen;
