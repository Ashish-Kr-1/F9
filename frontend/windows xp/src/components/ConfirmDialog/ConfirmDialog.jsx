import React from 'react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ icon, title, message, onYes, onNo }) => {
    return (
        <div className="xp-confirm-overlay" onClick={onNo}>
            <div className="xp-confirm-dialog" onClick={e => e.stopPropagation()}>
                {/* Title bar */}
                <div className="xp-confirm-titlebar">
                    <span>{title || 'Confirm'}</span>
                    <button className="xp-confirm-close" onClick={onNo}>✕</button>
                </div>
                {/* Body */}
                <div className="xp-confirm-body">
                    <img
                        src={icon || 'https://win32.run/images/xp/icons/RecycleBinempty.png'}
                        alt=""
                        className="xp-confirm-icon"
                    />
                    <p className="xp-confirm-message">{message}</p>
                </div>
                {/* Buttons */}
                <div className="xp-confirm-buttons">
                    <button className="xp-confirm-btn" onClick={onYes}>Yes</button>
                    <button className="xp-confirm-btn" onClick={onNo}>No</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
