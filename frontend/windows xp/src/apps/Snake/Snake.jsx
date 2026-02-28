import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Snake.css';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

const createFood = (snake) => {
    let newFood;
    while (true) {
        newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
        };
        // Make sure food is not on the snake
        if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
            break;
        }
    }
    return newFood;
};

const Snake = () => {
    const { api, user } = useAuth();

    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState({ x: 5, y: 5 });
    const [direction, setDirection] = useState({ x: 0, y: -1 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    const directionRef = useRef(direction);

    useEffect(() => {
        directionRef.current = direction;
    }, [direction]);

    const initGame = useCallback(() => {
        const initialSnake = [{ x: 10, y: 10 }];
        setSnake(initialSnake);
        setDirection({ x: 0, y: -1 });
        setScore(0);
        setGameOver(false);
        setIsPaused(false);
        setFood(createFood(initialSnake));
        gameOverRef.current = false;
    }, []);

    useEffect(() => {
        initGame();
    }, [initGame]);

    const handleKeyDown = useCallback((e) => {
        if (gameOver) return;

        switch (e.key) {
            case 'ArrowUp':
                if (directionRef.current.y !== 1) setDirection({ x: 0, y: -1 });
                break;
            case 'ArrowDown':
                if (directionRef.current.y !== -1) setDirection({ x: 0, y: 1 });
                break;
            case 'ArrowLeft':
                if (directionRef.current.x !== 1) setDirection({ x: -1, y: 0 });
                break;
            case 'ArrowRight':
                if (directionRef.current.x !== -1) setDirection({ x: 1, y: 0 });
                break;
            case ' ':
            case 'Spacebar':
                setIsPaused(prev => !prev);
                break;
            default:
                break;
        }
    }, [gameOver]);

    useEffect(() => {
        // Only listen when the snake app is focused or we can just bind to window 
        // since windows xp clone probably puts this inside a window that handles focus,
        // but globally for now is okay, we can rely on standard window events.
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (gameOver || isPaused) return;

        const moveSnake = () => {
            setSnake((prevSnake) => {
                const head = prevSnake[0];
                const newHead = {
                    x: head.x + directionRef.current.x,
                    y: head.y + directionRef.current.y,
                };

                // Check wall collision
                if (
                    newHead.x < 0 ||
                    newHead.x >= GRID_SIZE ||
                    newHead.y < 0 ||
                    newHead.y >= GRID_SIZE
                ) {
                    handleGameOver(score);
                    return prevSnake;
                }

                // Check self collision
                if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
                    handleGameOver(score);
                    return prevSnake;
                }

                const newSnake = [newHead, ...prevSnake];

                // Check food collision
                if (newHead.x === food.x && newHead.y === food.y) {
                    setScore((s) => s + 10);
                    setFood(createFood(newSnake));
                    // Do not pop tail
                } else {
                    newSnake.pop();
                }

                return newSnake;
            });
        };

        const interval = setInterval(moveSnake, INITIAL_SPEED);
        return () => clearInterval(interval);
    }, [gameOver, isPaused, food]);

    const gameOverRef = useRef(false);

    const handleGameOver = async (finalScore) => {
        if (gameOverRef.current) return; // prevent double-fire
        gameOverRef.current = true;
        setGameOver(true);
        if (user && finalScore > 0) {
            try {
                await api.post('/scores', { game_name: 'snake', score: finalScore });
                fetchLeaderboard();
            } catch (error) {
                console.error("Failed to submit score", error);
            }
        }
    };

    const fetchLeaderboard = async () => {
        if (!user) return;
        try {
            const res = await api.get('/scores/snake');
            setLeaderboard(res.data);
            setShowLeaderboard(true);
        } catch (error) {
            console.error("Failed to fetch leaderboard", error);
        }
    };

    return (
        <div className="snake-app">
            <div className="snake-header">
                <div className="score">Score: {score}</div>
                <div className="controls">
                    Use Arrows to Move, Space to Pause<br />
                    {user && <button onClick={fetchLeaderboard} style={{ marginTop: '5px', fontSize: '0.8rem' }}>Leaderboard</button>}
                </div>
            </div>
            <div className="snake-board-container">
                <div className="snake-board">
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                        const x = i % GRID_SIZE;
                        const y = Math.floor(i / GRID_SIZE);
                        const isSnake = snake.some((segment) => segment.x === x && segment.y === y);
                        const isHead = snake[0].x === x && snake[0].y === y;
                        const isFood = food.x === x && food.y === y;

                        let cellClass = 'snake-cell';
                        if (isHead) cellClass += ' snake-head';
                        else if (isSnake) cellClass += ' snake-body';
                        else if (isFood) cellClass += ' snake-food';

                        return <div key={i} className={cellClass} />;
                    })}
                </div>
                {gameOver && !showLeaderboard && (
                    <div className="game-over-overlay">
                        <h2>Game Over!</h2>
                        <p>Score: {score}</p>
                        <button onClick={initGame}>Play Again</button>
                        {user && <button onClick={fetchLeaderboard} style={{ marginTop: '10px' }}>View Leaderboard</button>}
                    </div>
                )}
                {showLeaderboard && (
                    <div className="game-over-overlay">
                        <h2>Top 10 Scores</h2>
                        <div style={{ background: '#222', padding: '10px', borderRadius: '5px', marginBottom: '15px', width: '80%', maxHeight: '150px', overflowY: 'auto' }}>
                            {leaderboard.length === 0 ? <p style={{ fontSize: '1rem' }}>No scores yet!</p> : (
                                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '1.2rem', textAlign: 'left' }}>
                                    {leaderboard.map((entry, idx) => (
                                        <li key={idx} style={{ marginBottom: '5px' }}>
                                            <span style={{ color: '#0f0' }}>{entry.username}</span> - {entry.score}
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                        <button onClick={() => setShowLeaderboard(false)}>Close</button>
                    </div>
                )}
                {isPaused && !gameOver && !showLeaderboard && (
                    <div className="paused-overlay">
                        <h2>Paused</h2>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Snake;
