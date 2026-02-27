import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Minesweeper.css';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 10;
const MINES_COUNT = 10;

// Cell states:
// { isMine: bool, isRevealed: bool, isFlagged: bool, neighborMines: number }

const createBoard = () => {
    const board = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
        const row = [];
        for (let c = 0; c < BOARD_WIDTH; c++) {
            row.push({
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
                r,
                c,
            });
        }
        board.push(row);
    }

    // Plant mines
    let minesPlanted = 0;
    while (minesPlanted < MINES_COUNT) {
        const r = Math.floor(Math.random() * BOARD_HEIGHT);
        const c = Math.floor(Math.random() * BOARD_WIDTH);
        if (!board[r][c].isMine) {
            board[r][c].isMine = true;
            minesPlanted++;
        }
    }

    // Calculate neighbors
    for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
            if (!board[r][c].isMine) {
                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (r + i >= 0 && r + i < BOARD_HEIGHT && c + j >= 0 && c + j < BOARD_WIDTH) {
                            if (board[r + i][c + j].isMine) count++;
                        }
                    }
                }
                board[r][c].neighborMines = count;
            }
        }
    }

    return board;
};

const Minesweeper = () => {
    const { api, user } = useAuth();

    const [board, setBoard] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [minesLeft, setMinesLeft] = useState(MINES_COUNT);
    const [timePassed, setTimePassed] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    const initGame = useCallback(() => {
        setBoard(createBoard());
        setGameOver(false);
        setGameWon(false);
        setMinesLeft(MINES_COUNT);
        setTimePassed(0);
        setTimerRunning(false);
    }, []);

    useEffect(() => {
        initGame();
    }, [initGame]);

    useEffect(() => {
        let interval;
        if (timerRunning && !gameOver && !gameWon) {
            interval = setInterval(() => {
                setTimePassed((prev) => Math.min(prev + 1, 999));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerRunning, gameOver, gameWon]);

    const revealCell = (r, c) => {
        if (gameOver || gameWon || board[r][c].isRevealed || board[r][c].isFlagged) return;

        if (!timerRunning) setTimerRunning(true);

        const newBoard = [...board.map(row => [...row])];

        if (newBoard[r][c].isMine) {
            // Game Over
            newBoard[r][c].isRevealed = true;
            setBoard(newBoard);
            setGameOver(true);
            revealAllMines(newBoard);
            return;
        }

        // Flood fill
        const stack = [[r, c]];
        while (stack.length > 0) {
            const [currR, currC] = stack.pop();
            if (!newBoard[currR][currC].isRevealed && !newBoard[currR][currC].isFlagged) {
                newBoard[currR][currC].isRevealed = true;
                if (newBoard[currR][currC].neighborMines === 0) {
                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            if (currR + i >= 0 && currR + i < BOARD_HEIGHT && currC + j >= 0 && currC + j < BOARD_WIDTH) {
                                stack.push([currR + i, currC + j]);
                            }
                        }
                    }
                }
            }
        }

        setBoard(newBoard);
        checkWin(newBoard);
    };

    const toggleFlag = (e, r, c) => {
        e.preventDefault();
        if (gameOver || gameWon || board[r][c].isRevealed) return;

        if (!timerRunning) setTimerRunning(true);

        const newBoard = [...board.map(row => [...row])];
        const cell = newBoard[r][c];

        if (!cell.isFlagged && minesLeft > 0) {
            cell.isFlagged = true;
            setMinesLeft(prev => prev - 1);
        } else if (cell.isFlagged) {
            cell.isFlagged = false;
            setMinesLeft(prev => prev + 1);
        }

        setBoard(newBoard);
    };

    const revealAllMines = (currentBoard) => {
        const revealedBoard = currentBoard.map(row =>
            row.map(cell => {
                if (cell.isMine) return { ...cell, isRevealed: true };
                return cell;
            })
        );
        setBoard(revealedBoard);
    };

    const checkWin = (currentBoard) => {
        let unrevealedSafeCells = 0;
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                if (!currentBoard[r][c].isMine && !currentBoard[r][c].isRevealed) {
                    unrevealedSafeCells++;
                }
            }
        }
        if (unrevealedSafeCells === 0) {
            setGameWon(true);
            setTimerRunning(false);
            setMinesLeft(0);
            // Auto flag remaining mines
            const finalBoard = currentBoard.map(row =>
                row.map(cell => cell.isMine ? { ...cell, isFlagged: true } : cell)
            );
            setBoard(finalBoard);
            handleGameWon(timePassed);
        }
    };

    const handleGameWon = async (finalTime) => {
        if (user) {
            try {
                // For Minesweeper, we want to submit the time. A lower time is better.
                await api.post('/scores', { game_name: 'minesweeper', score: finalTime });
                fetchLeaderboard();
            } catch (error) {
                console.error("Failed to submit score", error);
            }
        }
    };

    const fetchLeaderboard = async () => {
        if (!user) return;
        try {
            const res = await api.get('/scores/minesweeper');
            setLeaderboard(res.data);
            setShowLeaderboard(true);
        } catch (error) {
            console.error("Failed to fetch leaderboard", error);
        }
    };

    if (!board) return null;

    const formatNumber = (num) => num.toString().padStart(3, '0');

    let face = '🙂';
    if (gameOver) face = '😵';
    if (gameWon) face = '😎';

    return (
        <div className="minesweeper-app">
            <div className="minesweeper-header">
                {user && (
                    <button
                        onClick={fetchLeaderboard}
                        style={{ position: 'absolute', top: '-25px', right: '0', fontSize: '0.8rem', padding: '2px 5px' }}
                    >
                        Leaderboard
                    </button>
                )}
                <div className="digital-display">{formatNumber(minesLeft)}</div>
                <button className="face-button" onClick={initGame}>{face}</button>
                <div className="digital-display">{formatNumber(timePassed)}</div>
            </div>

            <div className="minesweeper-board" style={{ position: 'relative' }}>
                {showLeaderboard && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', color: 'white'
                    }}>
                        <h2 style={{ color: 'gold', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Fastest Times</h2>
                        <div style={{ background: '#222', padding: '5px', borderRadius: '5px', marginBottom: '10px', width: '80%', maxHeight: '150px', overflowY: 'auto' }}>
                            {leaderboard.length === 0 ? <p style={{ fontSize: '0.9rem', margin: 0 }}>No times yet!</p> : (
                                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '1rem', textAlign: 'left' }}>
                                    {leaderboard.map((entry, idx) => (
                                        <li key={idx} style={{ marginBottom: '2px' }}>
                                            <span style={{ color: '#0f0' }}>{entry.username}</span> - {entry.score}s
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                        <button onClick={() => setShowLeaderboard(false)} style={{ padding: '5px 15px', cursor: 'pointer' }}>Close</button>
                    </div>
                )}

                {board.map((row, r) => (
                    <div key={r} className="minesweeper-row">
                        {row.map((cell, c) => {
                            let cellClass = 'minesweeper-cell';
                            let content = '';

                            if (cell.isRevealed) {
                                cellClass += ' revealed';
                                if (cell.isMine) {
                                    cellClass += ' mine';
                                    content = '💣';
                                    if (gameOver && board[r][c].isRevealed && board[r][c].isMine) {
                                        cellClass += ' exploded';
                                    }
                                } else if (cell.neighborMines > 0) {
                                    cellClass += ` num-${cell.neighborMines}`;
                                    content = cell.neighborMines;
                                }
                            } else if (cell.isFlagged) {
                                content = '🚩';
                            }

                            // Show crossed flag if wrongly flagged on game over
                            if (gameOver && cell.isFlagged && !cell.isMine) {
                                content = '❌';
                            }

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={cellClass}
                                    onClick={() => revealCell(r, c)}
                                    onContextMenu={(e) => toggleFlag(e, r, c)}
                                >
                                    {content}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Minesweeper;
