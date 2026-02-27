import React, { useState } from 'react';
import './Calculator.css';

const BUTTONS = [
    ['MC', 'MR', 'MS', 'M+'],
    ['←', 'CE', 'C', '±', '√'],
    ['7', '8', '9', '/', '%'],
    ['4', '5', '6', '*', '1/x'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
];

const Calculator = () => {
    const [display, setDisplay] = useState('0');
    const [prev, setPrev] = useState(null);
    const [op, setOp] = useState(null);
    const [reset, setReset] = useState(false);
    const [memory, setMemory] = useState(0);

    const handleBtn = (val) => {
        if ('0123456789'.includes(val)) {
            setDisplay(d => (d === '0' || reset) ? val : d + val);
            setReset(false);
            return;
        }
        if (val === '.') {
            setDisplay(d => reset ? '0.' : d.includes('.') ? d : d + '.');
            setReset(false);
            return;
        }
        const curr = parseFloat(display);

        if (val === 'C' || val === 'CE') { setDisplay('0'); setPrev(null); setOp(null); setReset(false); return; }
        if (val === '←') { setDisplay(d => d.length > 1 ? d.slice(0, -1) : '0'); return; }
        if (val === '±') { setDisplay(d => d.startsWith('-') ? d.slice(1) : '-' + d); return; }
        if (val === '√') { setDisplay(String(parseFloat(Math.sqrt(curr).toFixed(10)))); setReset(true); return; }
        if (val === '1/x') { setDisplay(String(parseFloat((1 / curr).toFixed(10)))); setReset(true); return; }
        if (val === '%') { setDisplay(String(parseFloat((curr / 100).toFixed(10)))); setReset(true); return; }

        if (val === 'MC') { setMemory(0); return; }
        if (val === 'MR') { setDisplay(String(memory)); setReset(true); return; }
        if (val === 'MS') { setMemory(curr); return; }
        if (val === 'M+') { setMemory(m => m + curr); return; }

        if (val === '=') {
            if (op && prev !== null) {
                let result;
                if (op === '+') result = prev + curr;
                else if (op === '-') result = prev - curr;
                else if (op === '*') result = prev * curr;
                else if (op === '/') result = prev / curr;
                setDisplay(String(parseFloat(result.toFixed(10))));
                setPrev(null); setOp(null); setReset(true);
            }
            return;
        }

        // operator
        if (op && prev !== null && !reset) {
            let result;
            if (op === '+') result = prev + curr;
            else if (op === '-') result = prev - curr;
            else if (op === '*') result = prev * curr;
            else if (op === '/') result = prev / curr;
            setPrev(result);
            setDisplay(String(parseFloat(result.toFixed(10))));
        } else {
            setPrev(curr);
        }
        setOp(val);
        setReset(true);
    };

    const isOp = (v) => ['/', '*', '-', '+'].includes(v);
    const isSpecial = (v) => ['MC', 'MR', 'MS', 'M+', '←', 'CE', 'C', '±', '√', '1/x', '%'].includes(v);

    return (
        <div className="calculator">
            <div className="calc-display">{display}</div>
            <div className="calc-buttons">
                {BUTTONS.flat().map((btn, i) => (
                    <button
                        key={i}
                        className={`calc-btn ${isOp(btn) ? 'op-btn' : ''} ${isSpecial(btn) ? 'special-btn' : ''} ${btn === '=' ? 'eq-btn' : ''}`}
                        onClick={() => handleBtn(btn)}
                    >
                        {btn}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Calculator;
