import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState({ x: 5, y: 5 });
    const [direction, setDirection] = useState({ x: 0, y: -1 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

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
                    setGameOver(true);
                    return prevSnake;
                }

                // Check self collision
                if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
                    setGameOver(true);
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

    return (
        <div className="snake-app">
            <div className="snake-header">
                <div className="score">Score: {score}</div>
                <div className="controls">Use Arrows to Move, Space to Pause</div>
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
                {gameOver && (
                    <div className="game-over-overlay">
                        <h2>Game Over!</h2>
                        <p>Score: {score}</p>
                        <button onClick={initGame}>Play Again</button>
                    </div>
                )}
                {isPaused && !gameOver && (
                    <div className="paused-overlay">
                        <h2>Paused</h2>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Snake;
