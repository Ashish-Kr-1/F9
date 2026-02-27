import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Clippy.css";

export default function Clippy() {
    const { api, user } = useAuth();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat, isThinking]);

    const sendMessage = useCallback(async (userMessage = message, isContextOnly = false) => {
        if (!userMessage && !isContextOnly) return;
        if (isThinking) return;

        if (!isContextOnly) {
            setChat(prev => [...prev, { role: "user", text: userMessage }]);
            setMessage("");
        }
        setIsThinking(true);

        try {
            const payload = isContextOnly
                ? { message: "", context: userMessage }
                : { message: userMessage };

            const response = await api.post("/clippy", payload);

            setChat(prev => [
                ...prev,
                { role: "assistant", text: response.data.reply }
            ]);
        } catch (error) {
            setChat(prev => [
                ...prev,
                { role: "assistant", text: "I'm having trouble connecting to my brain! Is the server running?" }
            ]);
        } finally {
            setIsThinking(false);
        }
    }, [message, isThinking]);

    // Listen for contextual OS events (e.g., User opens Notepad)
    useEffect(() => {
        const handleContextEvent = async (e) => {
            const action = e.detail?.action;
            if (!action) return;

            // Pop open clippy and send proactive context message
            setOpen(true);
            await sendMessage(action, true);
        };

        window.addEventListener('clippyContext', handleContextEvent);
        return () => window.removeEventListener('clippyContext', handleContextEvent);
    }, [sendMessage]);


    // Only render Clippy if user is logged in
    if (!user) return null;

    return (
        <div className="clippy-container">
            {open && (
                <div className="clippy-bubble">
                    <button
                        className="clippy-close-bubble"
                        onClick={() => setOpen(false)}
                        title="Close bubble"
                    >
                        ×
                    </button>
                    <div className="clippy-chat-history">
                        {chat.length === 0 && (
                            <div style={{ color: "#666", fontStyle: "italic" }}>
                                Hey You yes YOU!!. Need some help?
                            </div>
                        )}
                        {chat.map((msg, i) => (
                            <div key={i} style={{ marginBottom: "8px" }}>
                                <b>{msg.role === "user" ? "You:" : "Clippy:"}</b> {msg.text}
                            </div>
                        ))}
                        {isThinking && (
                            <div style={{ color: "#666", fontStyle: "italic" }}>
                                Clippy is thinking...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="clippy-input-group">
                        <input
                            className="clippy-input"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendMessage(message, false)}
                            placeholder="Type here..."
                        />
                        <button className="clippy-button" onClick={() => sendMessage(message, false)} disabled={isThinking}>
                            Send
                        </button>
                    </div>
                </div>
            )}

            <img
                src="/clippy.png"
                alt="Clippy"
                className="clippy-mascot"
                onClick={() => setOpen(!open)}
            />
        </div>
    );
}