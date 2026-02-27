import React, { useState, useEffect, useCallback } from 'react';
import './Solitaire.css';

// Suit Symbols & Colors
const SUITS = {
    HEARTS: { symbol: '♥', color: 'red' },
    DIAMONDS: { symbol: '♦', color: 'red' },
    CLUBS: { symbol: '♣', color: 'black' },
    SPADES: { symbol: '♠', color: 'black' }
};

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Create a full deck of 52 cards
const createDeck = () => {
    const deck = [];
    Object.keys(SUITS).forEach((suitKey) => {
        VALUES.forEach((value, index) => {
            deck.push({
                id: `${value}-${suitKey}`,
                suit: SUITS[suitKey],
                value,
                rank: index + 1,
                isFaceUp: false,
            });
        });
    });
    return deck;
};

// Shuffle deck
const shuffle = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const Solitaire = () => {
    // Game State
    const [stock, setStock] = useState([]);
    const [waste, setWaste] = useState([]);
    const [foundations, setFoundations] = useState([[], [], [], []]); // 4 foundations
    const [tableau, setTableau] = useState([[], [], [], [], [], [], []]); // 7 columns

    // Interaction State
    const [selectedCards, setSelectedCards] = useState(null); // { source: 'tableau', colIndex: 0, cardIndex: 3 }
    const [won, setWon] = useState(false);

    const initGame = useCallback(() => {
        const newDeck = shuffle(createDeck());

        const newTableau = [[], [], [], [], [], [], []];
        let cardIndex = 0;

        // Deal to tableau (Klondike style: col 0 has 1 card, col 1 has 2...)
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = { ...newDeck[cardIndex++] };
                if (row === col) {
                    card.isFaceUp = true; // Top card is face up
                }
                newTableau[col].push(card);
            }
        }

        setTableau(newTableau);
        setStock(newDeck.slice(cardIndex));
        setWaste([]);
        setFoundations([[], [], [], []]);
        setSelectedCards(null);
        setWon(false);
    }, []);

    useEffect(() => {
        initGame();
    }, [initGame]);

    // Check Win Condition
    useEffect(() => {
        if (foundations.every(f => f.length === 13)) {
            setWon(true);
        }
    }, [foundations]);

    const drawCard = () => {
        setSelectedCards(null);
        if (stock.length > 0) {
            const drawn = { ...stock[stock.length - 1], isFaceUp: true };
            setWaste([...waste, drawn]);
            setStock(stock.slice(0, -1));
        } else {
            // Recycle waste into stock
            const recycled = waste.map(c => ({ ...c, isFaceUp: false })).reverse();
            setStock(recycled);
            setWaste([]);
        }
    };

    // Helper to flip the top card of a tableau column if needed
    const flipTopCards = (newTableau) => {
        return newTableau.map(col => {
            if (col.length > 0 && !col[col.length - 1].isFaceUp) {
                const newCol = [...col];
                newCol[newCol.length - 1] = { ...newCol[newCol.length - 1], isFaceUp: true };
                return newCol;
            }
            return col;
        });
    };

    const handleDoubleClick = (source, colIndex, cardIndex, card) => {
        if (!card.isFaceUp) return;

        let topCard = null;
        let fromCol = colIndex;

        if (source === 'waste') {
            if (cardIndex !== waste.length - 1) return;
            topCard = card;
        } else if (source === 'tableau') {
            if (cardIndex !== tableau[colIndex].length - 1) return;
            topCard = card;
        } else {
            return; // foundations or empty shouldn't auto-move
        }

        for (let i = 0; i < 4; i++) {
            const foundation = foundations[i];
            const isValidMove =
                (foundation.length === 0 && topCard.rank === 1) ||
                (foundation.length > 0 &&
                    foundation[foundation.length - 1].suit.symbol === topCard.suit.symbol &&
                    foundation[foundation.length - 1].rank + 1 === topCard.rank);

            if (isValidMove) {
                const newFoundations = [...foundations];
                newFoundations[i] = [...foundation, topCard];
                setFoundations(newFoundations);

                if (source === 'waste') {
                    setWaste(waste.slice(0, -1));
                } else if (source === 'tableau') {
                    const newTableau = [...tableau];
                    newTableau[fromCol] = newTableau[fromCol].slice(0, -1);
                    setTableau(flipTopCards(newTableau));
                }

                setSelectedCards(null);
                return;
            }
        }
    };

    const handleCardClick = (source, colIndex, cardIndex, card) => {
        if (!card.isFaceUp && source === 'tableau' && cardIndex === tableau[colIndex].length - 1) {
            // If a top face-down card was somehow clicked, do nothing because the flipTopCards handles automatic flipping
            return;
        }

        // Deselect if clicking the same thing
        if (selectedCards && selectedCards.source === source && selectedCards.colIndex === colIndex && selectedCards.cardIndex === cardIndex) {
            setSelectedCards(null);
            return;
        }

        // If nothing is selected, select the card(s)
        if (!selectedCards) {
            // Can only select top card from waste or foundations
            if ((source === 'waste' && cardIndex !== waste.length - 1) ||
                (source === 'foundation' && cardIndex !== foundations[colIndex].length - 1)) {
                return;
            }
            if (card.isFaceUp) {
                setSelectedCards({ source, colIndex, cardIndex, card });
            }
            return;
        }

        // --- Move Logic ---
        const { source: fromSource, colIndex: fromCol, cardIndex: fromRow } = selectedCards;
        let movingCards = [];

        if (fromSource === 'waste') {
            movingCards = [waste[waste.length - 1]];
        } else if (fromSource === 'foundation') {
            movingCards = [foundations[fromCol][foundations[fromCol].length - 1]];
        } else if (fromSource === 'tableau') {
            movingCards = tableau[fromCol].slice(fromRow);
        }

        const topMovingCard = movingCards[0];

        // 1. Move to Foundation
        if (source === 'foundation') {
            if (movingCards.length > 1) {
                setSelectedCards(null); // Cannot move multiple cards to foundation
                return;
            }

            const foundation = foundations[colIndex];
            const isValidMove =
                (foundation.length === 0 && topMovingCard.rank === 1) || // Ace on empty
                (foundation.length > 0 &&
                    foundation[foundation.length - 1].suit.symbol === topMovingCard.suit.symbol &&
                    foundation[foundation.length - 1].rank + 1 === topMovingCard.rank); // Next ascending card same suit

            if (isValidMove) {
                const newFoundations = [...foundations];
                newFoundations[colIndex] = [...foundation, topMovingCard];
                setFoundations(newFoundations);

                if (fromSource === 'waste') {
                    setWaste(waste.slice(0, -1));
                } else if (fromSource === 'tableau') {
                    const newTableau = [...tableau];
                    newTableau[fromCol] = newTableau[fromCol].slice(0, fromRow);
                    setTableau(flipTopCards(newTableau));
                }
                setSelectedCards(null);
                return;
            }
        }

        // 2. Move to Tableau
        if (source === 'tableau') {
            const targetCol = tableau[colIndex];
            const targetTopCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : null;

            const isValidMove =
                (!targetTopCard && topMovingCard.rank === 13) || // King on empty
                (targetTopCard &&
                    targetTopCard.suit.color !== topMovingCard.suit.color && // Alternating colors
                    targetTopCard.rank - 1 === topMovingCard.rank); // Descending rank

            if (isValidMove) {
                const newTableau = [...tableau];
                newTableau[colIndex] = [...targetCol, ...movingCards];

                if (fromSource === 'waste') {
                    setWaste(waste.slice(0, -1));
                } else if (fromSource === 'foundation') {
                    const newFoundations = [...foundations];
                    newFoundations[fromCol] = newFoundations[fromCol].slice(0, -1);
                    setFoundations(newFoundations);
                } else if (fromSource === 'tableau') {
                    newTableau[fromCol] = newTableau[fromCol].slice(0, fromRow);
                }

                setTableau(flipTopCards(newTableau));
                setSelectedCards(null);
                return;
            }
        }

        // If move was invalid, change selection instead of clearing
        if (card.isFaceUp) {
            setSelectedCards({ source, colIndex, cardIndex, card });
        } else {
            setSelectedCards(null);
        }
    };

    const isSelected = (source, colIndex, cardIndex) => {
        if (!selectedCards) return false;
        if (selectedCards.source === 'tableau' && source === 'tableau') {
            return selectedCards.colIndex === colIndex && cardIndex >= selectedCards.cardIndex;
        }
        return selectedCards.source === source && selectedCards.colIndex === colIndex && selectedCards.cardIndex === cardIndex;
    };

    // Render a card
    const Card = ({ card, source, colIndex, cardIndex, onClick, onDoubleClick, style = {} }) => {
        if (!card) return <div className="card empty" onClick={onClick} style={style}></div>;

        return (
            <div
                className={`card ${card.isFaceUp ? 'face-up' : 'face-down'} ${card.suit ? card.suit.color : ''} ${isSelected(source, colIndex, cardIndex) ? 'selected' : ''}`}
                onClick={(e) => { e.stopPropagation(); onClick(source, colIndex, cardIndex, card); }}
                onDoubleClick={(e) => { e.stopPropagation(); if (onDoubleClick) onDoubleClick(source, colIndex, cardIndex, card); }}
                style={style}
            >
                {card.isFaceUp && (
                    <>
                        <div className="card-top-left">
                            <div>{card.value}</div>
                            <div>{card.suit.symbol}</div>
                        </div>
                        <div className="card-center">
                            {card.suit.symbol}
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="solitaire-app">
            <div className="solitaire-top-bar">
                <button onClick={initGame}>New Game</button>
            </div>

            {won && (
                <div className="solitaire-win-banner">
                    <h2>You Won!</h2>
                    <button onClick={initGame}>Play Again</button>
                </div>
            )}

            <div className="solitaire-board">
                <div className="solitaire-top-row">
                    {/* Stock & Waste */}
                    <div className="solitaire-deck-area">
                        <div className={`card stock ${stock.length === 0 ? 'empty-stock' : 'face-down'}`} onClick={drawCard}>
                            {stock.length === 0 && '↺'}
                        </div>
                        <div className="waste-pile">
                            {waste.length > 0 && (
                                <Card
                                    card={waste[waste.length - 1]}
                                    source="waste"
                                    colIndex={0}
                                    cardIndex={waste.length - 1}
                                    onClick={handleCardClick}
                                    onDoubleClick={handleDoubleClick}
                                />
                            )}
                        </div>
                    </div>

                    {/* Foundations */}
                    <div className="solitaire-foundations">
                        {foundations.map((foundation, colIndex) => (
                            <div key={colIndex} className="foundation-pile">
                                {foundation.length > 0 ? (
                                    <Card
                                        card={foundation[foundation.length - 1]}
                                        source="foundation"
                                        colIndex={colIndex}
                                        cardIndex={foundation.length - 1}
                                        onClick={handleCardClick}
                                    />
                                ) : (
                                    <div className="card empty" onClick={() => handleCardClick('foundation', colIndex, 0, {})}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tableau */}
                <div className="solitaire-tableau">
                    {tableau.map((col, colIndex) => (
                        <div
                            key={colIndex}
                            className="tableau-col"
                            onClick={col.length === 0 ? () => handleCardClick('tableau', colIndex, 0, {}) : undefined}
                        >
                            {col.length === 0 && <div className="card empty tableau-empty"></div>}
                            {col.map((card, cardIndex) => {
                                const isTop = cardIndex === 0;
                                const prevFaceUp = cardIndex > 0 ? col[cardIndex - 1].isFaceUp : false;
                                const marginOffset = isTop ? '0px' : (prevFaceUp ? '-82px' : '-102px');

                                return (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        source="tableau"
                                        colIndex={colIndex}
                                        cardIndex={cardIndex}
                                        onClick={handleCardClick}
                                        onDoubleClick={handleDoubleClick}
                                        style={{ marginTop: marginOffset, zIndex: cardIndex }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Solitaire;
