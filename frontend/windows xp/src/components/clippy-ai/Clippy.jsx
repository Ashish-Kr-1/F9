import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./Clippy.css";

export default function Clippy() {
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

    const sendMessage = async () => {
        if (!message || isThinking) return;

        const userMessage = message;
        setChat(prev => [...prev, { role: "user", text: userMessage }]);
        setMessage("");
        setIsThinking(true);

        try {
            const response = await axios.post("http://localhost:8000/clippy", {
                message: userMessage
            });

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
    };

    return (
        <div className="clippy-container">
            {open && (
                <div className="clippy-bubble">
                    <div className="clippy-chat-history">
                        {chat.length === 0 && (
                            <div style={{ color: "#666", fontStyle: "italic" }}>
                                It looks like you're writing a letter. Need some help?
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
                            onKeyDown={e => e.key === "Enter" && sendMessage()}
                            placeholder="Type here..."
                        />
                        <button className="clippy-button" onClick={sendMessage} disabled={isThinking}>
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