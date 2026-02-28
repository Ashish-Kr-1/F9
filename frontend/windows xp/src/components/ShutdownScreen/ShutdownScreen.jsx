import React, { useState, useEffect } from 'react';
import './ShutdownScreen.css';

const ShutdownScreen = ({ onComplete }) => {
    const [phase, setPhase] = useState('saving'); // saving → shuttingdown → safe

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('shuttingdown'), 1500);
        const t2 = setTimeout(() => setPhase('safe'), 3500);
        const t3 = setTimeout(() => onComplete && onComplete(), 5000);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onComplete]);

    return (
        <div className={`shutdown-screen ${phase}`}>
            <div className="shutdown-content">
                {phase === 'saving' && (
                    <div className="shutdown-text">
                        <span className="shutdown-msg">Saving your settings...</span>
                    </div>
                )}
                {phase === 'shuttingdown' && (
                    <div className="shutdown-text">
                        <span className="shutdown-msg">Windows is shutting down...</span>
                    </div>
                )}
                {phase === 'safe' && (
                    <div className="shutdown-text safe">
                        <span className="shutdown-msg-safe">It is now safe to turn off<br />your computer.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShutdownScreen;
