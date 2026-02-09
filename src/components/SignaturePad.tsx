import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    onClear: () => void;
}

const fonts = [
    { name: 'Dancing Script', family: "'Dancing Script', cursive" },
    { name: 'Great Vibes', family: "'Great Vibes', cursive" },
    { name: 'Pacifico', family: "'Pacifico', cursive" },
    { name: 'Sacramento', family: "'Sacramento', cursive" },
    { name: 'Allura', family: "'Allura', cursive" },
];

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear }) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mode, setMode] = useState<'draw' | 'type'>('draw');
    const [isDrawing, setIsDrawing] = useState(false);
    const [typedName, setTypedName] = useState('');
    const [selectedFont, setSelectedFont] = useState(fonts[0]);

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
            }
        }
    }, []);

    // Handle Type Mode Rendering
    useEffect(() => {
        if (mode === 'type') {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Clear and Draw Text
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    if (typedName) {
                        ctx.font = `50px ${selectedFont.family}`;
                        ctx.fillStyle = 'black';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

                        // Auto-save
                        onSave(canvas.toDataURL('image/png'));
                    } else {
                        onClear();
                    }
                }
            }
        }
    }, [mode, typedName, selectedFont, onSave, onClear]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== 'draw') return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || mode !== 'draw') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (mode !== 'draw') return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL('image/png'));
        }
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            onClear();
            if (mode === 'type') {
                setTypedName('');
            }
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Tabs */}
            <div className="flex bg-slate-700/50 p-1 rounded-lg mb-4">
                <button
                    onClick={() => { setMode('draw'); clearCanvas(); }}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'draw' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                    {t('processor.signature.draw')}
                </button>
                <button
                    onClick={() => { setMode('type'); clearCanvas(); }}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'type' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                    {t('processor.signature.type')}
                </button>
            </div>

            {/* Canvas Area */}
            <div className={`bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 mb-4 touch-none relative ${mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-48 block"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />

                {mode === 'type' && typedName.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-slate-300 text-2xl font-light">{t('processor.signature.previewArea')}</span>
                    </div>
                )}
            </div>

            {/* Type Controls */}
            {mode === 'type' && (
                <div className="space-y-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                        type="text"
                        placeholder={t('processor.signature.typePlaceholder')}
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-all"
                        maxLength={30}
                    />

                    <div className="grid grid-cols-5 gap-2">
                        {fonts.map((font, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedFont(font)}
                                className={`h-10 rounded-md bg-white text-slate-800 text-lg flex items-center justify-center transition-all ${selectedFont.name === font.name ? 'ring-2 ring-blue-500 transform scale-105' : 'opacity-70 hover:opacity-100'}`}
                                style={{ fontFamily: font.family }}
                                title={font.name}
                            >
                                Aa
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center text-sm text-slate-400">
                <span>{t(mode === 'draw' ? 'processor.signature.drawInstruction' : 'processor.signature.typeInstruction')}</span>
                <button
                    onClick={clearCanvas}
                    className="text-red-400 hover:text-red-300 transition-colors"
                >
                    {t('common.clear')}
                </button>
            </div>
        </div>
    );
};

export default SignaturePad;
