import React, { useState, useCallback, useEffect } from 'react';
// import { useDropzone } from 'react-dropzone'; // Unused
import { ArrowLeft, Upload, File as FileIcon, Loader2, Download, AlertCircle, Lock, Unlock, Wrench, Droplet, Moon, Eraser, EyeOff } from 'lucide-react';
import { OrbitPDFEngine } from '../lib/pdf-engine';
import PageGrid from './PageGrid';
import AdSpace from './AdSpace';

import SignaturePad from './SignaturePad';

interface ToolProcessorProps {
    toolId: string;
    toolName: string;
    onBack: () => void;
}

import { useTranslation } from 'react-i18next';

const ToolProcessor: React.FC<ToolProcessorProps> = ({ toolId, toolName, onBack }) => {
    const { t } = useTranslation();
    const [files, setFiles] = useState<File[]>([]);
    const [status, setStatus] = useState<'idle' | 'processing' | 'organizing' | 'done' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [resultUrl, setResultUrl] = useState<string | null>(null);

    // Organize State
    const [thumbnails, setThumbnails] = useState<string[]>([]);

    // Extra inputs for specific tools
    // We repurpose 'password' as a generic 'string value' holder for compression quality too (defaults to 0.6)
    // For OCR, it holds the language code (default 'eng')
    const [password, setPassword] = useState(toolId === 'compress' ? '0.6' : (toolId === 'ocr' ? 'eng' : ''));
    const [forceRebuild, setForceRebuild] = useState(false);
    const [watermark, setWatermark] = useState('OrbitPDF');

    // Signature Options
    const [signatureOptions, setSignatureOptions] = useState<{
        alignmentX: 'left' | 'center' | 'right';
        alignmentY: 'top' | 'center' | 'bottom';
        pageIndex: 'first' | 'last' | 'all';
    }>({ alignmentX: 'right', alignmentY: 'bottom', pageIndex: 'last' });
    const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
    const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
    const [watermarkPosition, setWatermarkPosition] = useState('center');
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
    const [watermarkRotation, setWatermarkRotation] = useState(45);

    // Reset state on tool change
    useEffect(() => {
        window.scrollTo(0, 0); // Reset scroll to top
        setResultUrl(null);
        setErrorMessage('');
        // ... reset specific tool states
        setPassword('');
        setWatermark('OrbitPDF');
        setWatermarkType('text');
        setWatermarkImage(null);
        setWatermarkPosition('center');
        setWatermarkOpacity(0.3);
        setWatermarkRotation(45);
    }, [toolId]);

    // Metadata State
    const [metadata, setMetadata] = useState({
        title: '',
        author: '',
        subject: '',
        keywords: '',
        creator: '',
        producer: ''
    });

    // Split State
    const [splitMode, setSplitMode] = useState<'extract' | 'burst'>('extract');

    // Trim State
    const [trimMargins, setTrimMargins] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
    const [draggingSide, setDraggingSide] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
    const startYRef = React.useRef(0);
    const startXRef = React.useRef(0);
    const startValRef = React.useRef(0);

    // Determine accepted file types
    const acceptType = toolId === 'word-to-pdf' ? '.docx,.doc' :
        (toolId === 'excel-to-pdf' ? '.xlsx,.xls,.csv' :
            (toolId === 'ppt-to-pdf' ? '.pptx' :
                (toolId === 'html-to-pdf' ? '.html,.htm' :
                    ((toolId === 'img-to-pdf') ? 'image/*' : '.pdf'))));
    // Determine output extension
    // Split returns ZIP only if in 'burst' mode
    const isZipResult = (toolId === 'split' && splitMode === 'burst') || toolId === 'pdf-to-img' || toolId === 'pdf-to-png';
    const isDocxResult = toolId === 'pdf-to-word';
    const isExcelResult = toolId === 'pdf-to-excel';
    const isPptResult = toolId === 'pdf-to-ppt';
    const isTxtResult = toolId === 'extract-text';
    const downloadExt = isZipResult ? 'zip' : (isDocxResult ? 'docx' : (isExcelResult ? 'xlsx' : (isPptResult ? 'pptx' : (isTxtResult ? 'txt' : 'pdf'))));

    /* 
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles((prev) => [...prev, ...acceptedFiles]);
        setStatus('idle');
        setResultUrl(null);
    }, []);
    */

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);

            // For multi-file tools, append. For others, replace.
            if (toolId === 'merge' || toolId === 'img-to-pdf') {
                setFiles(prev => [...prev, ...newFiles]);
            } else if (toolId === 'compare' && files.length < 2) {
                // Special case for compare, max 2
                setFiles(prev => [...prev, ...newFiles].slice(0, 2));
            } else {
                setFiles(newFiles);
            }
            setStatus('idle');
        }
    };

    // Load thumbnails for Trim or Organize
    useEffect(() => {
        if (toolId === 'trim' && files.length > 0) {
            OrbitPDFEngine.getThumbnails(files[0])
                .then(thumbs => setThumbnails(thumbs))
                .catch(err => console.error("Failed to load thumbnail for trim", err));
        }
    }, [toolId, files]);

    // Pre-process for Organize (Thumbnails)
    const prepareOrganize = async () => {
        if (files.length === 0) return;
        setStatus('processing');
        try {
            const thumbs = await OrbitPDFEngine.getThumbnails(files[0]);
            setThumbnails(thumbs);
            setStatus('organizing');
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(t('processor.errors.loadPagesFailed', { error: err.message }));
        }
    };

    // Trim Drag Logic
    const handleDragStart = (e: React.MouseEvent, side: 'top' | 'bottom' | 'left' | 'right') => {
        e.preventDefault();
        setDraggingSide(side);
        startYRef.current = e.clientY;
        startXRef.current = e.clientX;
        startValRef.current = trimMargins[side];

        // Add global listeners
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
    };

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!draggingSide) return;

        let delta = 0;
        const scale = 4; // 1px on screen = 4 points

        if (draggingSide === 'top') {
            delta = (e.clientY - startYRef.current) * scale;
            setTrimMargins(prev => ({ ...prev, top: Math.max(0, startValRef.current + delta) }));
        } else if (draggingSide === 'bottom') {
            delta = (startYRef.current - e.clientY) * scale;
            setTrimMargins(prev => ({ ...prev, bottom: Math.max(0, startValRef.current + delta) }));
        } else if (draggingSide === 'left') {
            delta = (e.clientX - startXRef.current) * scale;
            setTrimMargins(prev => ({ ...prev, left: Math.max(0, startValRef.current + delta) }));
        } else if (draggingSide === 'right') {
            delta = (startXRef.current - e.clientX) * scale;
            setTrimMargins(prev => ({ ...prev, right: Math.max(0, startValRef.current + delta) }));
        }
    }, [draggingSide]); // re-bind when draggingSide changes (though it's ref based for values)

    const handleDragEnd = useCallback(() => {
        setDraggingSide(null);
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
    }, [handleDragMove]);

    // Cleanup listeners
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        }
    }, [handleDragMove, handleDragEnd]);

    const moveFile = (index: number, direction: 'up' | 'down') => {
        const newFiles = [...files];
        if (direction === 'up') {
            if (index === 0) return;
            [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
        } else {
            if (index === newFiles.length - 1) return;
            [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
        }
        setFiles(newFiles);
    };

    const processFiles = async () => {
        if (files.length === 0) return;

        // If Organize, redirect to prepare first
        if (toolId === 'organize' && status !== 'organizing') {
            await prepareOrganize();
            return;
        }

        setStatus('processing');
        setErrorMessage('');
        setResultUrl(null);

        try {
            let resultBytes: Uint8Array | null = null;
            const firstFile = files[0];

            // Delay slightly to allow UI to update to "processing"
            await new Promise(resolve => setTimeout(resolve, 100));

            switch (toolId) {
                case 'merge':
                    if (files.length < 2) throw new Error(t('processor.errors.mergeMinFiles'));
                    resultBytes = await OrbitPDFEngine.mergePDFs(files);
                    break;
                case 'compare':
                    if (files.length !== 2) throw new Error(t('processor.errors.compareCount'));
                    resultBytes = await OrbitPDFEngine.comparePDFs(files, {
                        page: t('pdfEngine.page'),
                        noPageInFile1: t('pdfEngine.noPageInFile1'),
                        noPageInFile2: t('pdfEngine.noPageInFile2')
                    });
                    break;
                case 'split':
                    if (splitMode === 'extract') {
                        if (!password) throw new Error(t('processor.errors.pageRange'));
                        resultBytes = await OrbitPDFEngine.splitPDF(firstFile, password);
                    } else {
                        // Burst mode
                        resultBytes = await OrbitPDFEngine.splitPDF(firstFile, undefined);
                    }
                    break;
                case 'compress':
                    const quality = parseFloat(password) || 0.7; // Default to 0.7 if parsing fails
                    resultBytes = await OrbitPDFEngine.compressPDF(firstFile, quality);
                    break;
                case 'rotate':
                    const degrees = parseInt(password) || 90;
                    resultBytes = await OrbitPDFEngine.rotatePDF(firstFile, degrees);
                    break;
                case 'page-number':
                    const position = password === 'top' ? 'top' : 'bottom';
                    resultBytes = await OrbitPDFEngine.addPageNumbers(firstFile, position, {
                        pageOverview: t('pdfEngine.pageOverview')
                    });
                    break;
                case 'sign':
                    if (!watermark) throw new Error(t('processor.errors.signatureMissing'));
                    resultBytes = await OrbitPDFEngine.signPDF(firstFile, watermark, signatureOptions);
                    break;
                case 'watermark':
                    resultBytes = await OrbitPDFEngine.watermarkPDF(firstFile, watermark, watermarkType, watermarkImage || undefined, {
                        position: watermarkPosition,
                        opacity: watermarkOpacity,
                        rotation: watermarkRotation
                    });
                    break;
                case 'pdf-to-img':
                    resultBytes = await OrbitPDFEngine.pdfToJpg(firstFile);
                    break;
                case 'pdf-to-png':
                    resultBytes = await OrbitPDFEngine.pdfToPng(firstFile);
                    break;
                case 'ocr':
                    // Reuse password state for language, default 'eng'
                    const lang = password || 'eng';
                    resultBytes = await OrbitPDFEngine.ocrPDF(firstFile, lang, () => {
                        // Optional: You could add a specialized state for detailed progress messages 
                        // For now, simpler is fine or we can just log
                        // console.log(progress);
                    });
                    break;
                case 'img-to-pdf':
                    if (files.length < 1) throw new Error(t('processor.errors.imageMissing'));
                    resultBytes = await OrbitPDFEngine.imagesToPDF(files);
                    break;
                case 'word-to-pdf':
                    resultBytes = await OrbitPDFEngine.convertToPDF(firstFile);
                    break;
                case 'pdf-to-word':
                    resultBytes = await OrbitPDFEngine.pdfToDocx(firstFile, {
                        convertedBy: t('pdfEngine.convertedBy')
                    });
                    break;
                case 'pdf-to-excel':
                    resultBytes = await OrbitPDFEngine.pdfToExcel(firstFile);
                    break;
                case 'edit-metadata':
                    resultBytes = await OrbitPDFEngine.editMetadata(firstFile, {
                        ...metadata,
                        keywords: metadata.keywords ? metadata.keywords.split(',').map(k => k.trim()) : undefined
                    });
                    break;
                case 'flatten':
                    resultBytes = await OrbitPDFEngine.flattenPDF(firstFile);
                    break;
                case 'trim':
                    // Convert points if needed, assuming user enters points directly for now (72 pts = 1 inch)
                    resultBytes = await OrbitPDFEngine.trimPDF(firstFile, trimMargins);
                    break;
                case 'protect':
                    if (!password) throw new Error(t('processor.errors.passwordMissing'));
                    resultBytes = await OrbitPDFEngine.protectPDF(firstFile, password);
                    break;
                case 'unlock':
                    if (!password) throw new Error(t('processor.errors.passwordUnlockMissing'));
                    resultBytes = await OrbitPDFEngine.unlockPDF(firstFile, password);
                    break;
                case 'repair':
                    resultBytes = await OrbitPDFEngine.repairPDF(firstFile, forceRebuild);
                    break;
                case 'grayscale':
                    resultBytes = await OrbitPDFEngine.grayscalePDF(firstFile);
                    break;
                case 'invert-colors':
                    resultBytes = await OrbitPDFEngine.invertPDF(firstFile);
                    break;
                case 'extract-text':
                    resultBytes = await OrbitPDFEngine.extractText(firstFile);
                    break;
                case 'remove-annotations':
                    resultBytes = await OrbitPDFEngine.removeAnnotations(firstFile);
                    break;
                case 'redact':
                    const terms = password.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    // forceRebuild holds the boolean for numbers
                    resultBytes = await OrbitPDFEngine.redactPDF(firstFile, terms, forceRebuild);
                    break;
                case 'pdf-to-ppt':
                    resultBytes = await OrbitPDFEngine.pdfToPowerPoint(firstFile);
                    break;
                case 'excel-to-pdf':
                    resultBytes = await OrbitPDFEngine.excelToPDF(firstFile);
                    break;
                case 'ppt-to-pdf':
                    resultBytes = await OrbitPDFEngine.pptxToPDF(firstFile);
                    break;
                case 'html-to-pdf':
                    resultBytes = await OrbitPDFEngine.htmlToPDF(firstFile);
                    break;
                // Organize is handled via handleOrganizeSave, but if we fall here:
                default:
                    throw new Error(t('processor.errors.notImplemented', { toolName }));
            }

            if (resultBytes) {
                const mimeType = isZipResult ? 'application/zip' : (isDocxResult ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : (isExcelResult ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : (isTxtResult ? 'text/plain' : 'application/pdf')));
                const blob = new Blob([resultBytes as any], { type: mimeType });
                const url = URL.createObjectURL(blob);
                setResultUrl(url);
                setStatus('done');
            }

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message || t('processor.errors.unexpected'));
        }
    };

    const handleOrganizeSave = async (newOrder: number[]) => {
        setStatus('processing');
        try {
            const resultBytes = await OrbitPDFEngine.organizePDF(files[0], newOrder);
            const blob = new Blob([resultBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setStatus('done');
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(t('processor.errors.organizeFailed', { error: err.message }));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(Array.from(e.dataTransfer.files));
            setStatus('idle');
        }
    };

    return (
        <div className="w-full flex justify-center gap-6 px-4">
            {/* Left Sidebar Ad (PC Only) */}
            <div className="hidden xl:block w-[160px] flex-shrink-0 pt-20">
                <div className="sticky top-24">
                    <AdSpace placement="sidebar" />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-4xl min-h-[500px] flex flex-col">


                {/* Top Ad Banner */}
                <div className="mb-8">
                    <AdSpace placement="header" className="w-full" />
                </div>

                {/* Header */}
                <div className="flex items-center mb-8">

                    <button
                        onClick={onBack}
                        className="mr-4 p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        {toolName}
                    </h2>
                </div>

                {/* Main Workspace */}
                <div className="glass-panel rounded-3xl p-8 flex-grow flex flex-col items-center justify-center relative overflow-hidden">

                    {/* State: Idle / Input */}
                    {status === 'idle' && (
                        <div className="w-full max-w-xl text-center space-y-8 animate-in fade-in zoom-in duration-300">
                            <div
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className="border-2 border-dashed border-slate-600 rounded-2xl p-10 hover:border-blue-500 hover:bg-white/5 transition-all text-center"
                            >
                                <input
                                    type="file"
                                    id="file-upload"
                                    multiple={toolId === 'merge' || toolId === 'img-to-pdf' || toolId === 'compare'}
                                    accept={acceptType}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 text-blue-400">
                                        <Upload size={40} />
                                    </div>
                                    <p className="text-xl font-medium text-white mb-2">
                                        {files.length > 0 ? t('processor.filesSelected', { count: files.length }) :
                                            t('processor.dragDrop')}
                                    </p>
                                    <p className="text-slate-500 text-sm">{t('processor.processedLocally')}</p>
                                </label>
                            </div>

                            {/* Tool Specific Inputs */}
                            {files.length > 0 && (
                                <div className="space-y-4">
                                    {toolId === 'merge' && (
                                        <div className="w-full max-w-2xl mx-auto mb-8">
                                            <h3 className="text-lg font-medium text-white mb-4 text-left">{t('processor.reorderFiles')}</h3>
                                            <div className="space-y-2">
                                                {files.map((file, idx) => (
                                                    <div key={`${file.name}-${idx}`} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center justify-between group hover:border-blue-500/50 transition-all">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex flex-col text-left overflow-hidden">
                                                                <span className="text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                                                                    {t('processor.processedLocally')}
                                                                </span>
                                                                <span className="text-slate-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => moveFile(idx, 'up')}
                                                                disabled={idx === 0}
                                                                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                                                            >
                                                                ↑
                                                            </button>
                                                            <button
                                                                onClick={() => moveFile(idx, 'down')}
                                                                disabled={idx === files.length - 1}
                                                                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                                                            >
                                                                ↓
                                                            </button>
                                                            <button
                                                                onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 ml-1"
                                                                title="Remove"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {toolId === 'word-to-pdf' && (
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                            <div className="text-sm text-blue-200">
                                                <p className="font-semibold mb-1">{t('processor.clientSideConversion')}</p>
                                                <p className="opacity-80">
                                                    {t('processor.clientSideDesc')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {toolId === 'pdf-to-word' && (
                                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                            <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                            <div className="text-sm text-purple-200">
                                                <p className="font-semibold mb-1">{t('processor.textExtraction')}</p>
                                                <p className="opacity-80">
                                                    {t('processor.textExtractionDesc')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {toolId === 'rotate' && (
                                        <div className="flex gap-4 mb-4">
                                            {[90, 180, 270].map(deg => (
                                                <button
                                                    key={deg}
                                                    onClick={() => setPassword(deg.toString())} // Reuse password state for rotation
                                                    className={`px-4 py-2 rounded-lg border ${password === deg.toString() ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600 text-slate-300 hover:bg-white/5'}`}
                                                >
                                                    {deg}°
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {toolId === 'page-number' && (
                                        <div className="flex gap-4 mb-4">
                                            <button
                                                onClick={() => setPassword('bottom')}
                                                className={`px-4 py-2 rounded-lg border ${password !== 'top' ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600 text-slate-300 hover:bg-white/5'}`}
                                            >
                                                {t('processor.positionOptions.bottomFooter')}
                                            </button>
                                            <button
                                                onClick={() => setPassword('top')}
                                                className={`px-4 py-2 rounded-lg border ${password === 'top' ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600 text-slate-300 hover:bg-white/5'}`}
                                            >
                                                {t('processor.positionOptions.topHeader')}
                                            </button>
                                        </div>
                                    )}
                                    {toolId === 'sign' && (
                                        <div className="mb-6 space-y-4">
                                            <SignaturePad
                                                onSave={(dataUrl) => setWatermark(dataUrl)} // Reusing watermark state for signature data dataURL
                                                onClear={() => setWatermark('')}
                                            />

                                            {/* Position Controls */}
                                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <label className="text-sm font-medium text-slate-300">{t('processor.signaturePosition')}</label>
                                                    <select
                                                        value={signatureOptions.pageIndex}
                                                        onChange={(e) => setSignatureOptions(prev => ({ ...prev, pageIndex: e.target.value as any }))}
                                                        className="px-3 py-1.5 rounded-lg bg-black/20 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                                                    >
                                                        <option value="last">{t('processor.positionOptions.lastPage')}</option>
                                                        <option value="first">{t('processor.positionOptions.firstPage')}</option>
                                                        <option value="all">{t('processor.positionOptions.everyPage')}</option>
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                                                    {/* Top Row */}
                                                    <button onClick={() => setSignatureOptions(prev => ({ ...prev, alignmentY: 'top', alignmentX: 'left' }))}
                                                        className={`h-12 rounded-lg border flex items-center justify-center transition-all ${signatureOptions.alignmentY === 'top' && signatureOptions.alignmentX === 'left'
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                            : 'border-white/10 hover:bg-white/5 text-slate-400'
                                                            }`} title={t('processor.tooltips.topLeft')}>↖</button>
                                                    <button onClick={() => setSignatureOptions(prev => ({ ...prev, alignmentY: 'top', alignmentX: 'center' }))}
                                                        className={`h-12 rounded-lg border flex items-center justify-center transition-all ${signatureOptions.alignmentY === 'top' && signatureOptions.alignmentX === 'center'
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                            : 'border-white/10 hover:bg-white/5 text-slate-400'
                                                            }`} title={t('processor.tooltips.topCenter')}>↑</button>
                                                    <button onClick={() => setSignatureOptions(prev => ({ ...prev, alignmentY: 'top', alignmentX: 'right' }))}
                                                        className={`h-12 rounded-lg border flex items-center justify-center transition-all ${signatureOptions.alignmentY === 'top' && signatureOptions.alignmentX === 'right'
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                            : 'border-white/10 hover:bg-white/5 text-slate-400'
                                                            }`} title={t('processor.tooltips.topRight')}>↗</button>

                                                    {/* Center Row */}
                                                    <button onClick={() => setSignatureOptions(prev => ({ ...prev, alignmentY: 'center', alignmentX: 'left' }))}
                                                        className={`h-12 rounded-lg border flex items-center justify-center transition-all ${signatureOptions.alignmentY === 'center' && signatureOptions.alignmentX === 'left'
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                            : 'border-white/10 hover:bg-white/5 text-slate-400'
                                                            }`} title={t('processor.tooltips.centerLeft')}>←</button>
                                                    <button onClick={() => setSignatureOptions(prev => ({ ...prev, alignmentY: 'center', alignmentX: 'center' }))}
                                                        className={`h-12 rounded-lg border flex items-center justify-center transition-all ${signatureOptions.alignmentY === 'center' && signatureOptions.alignmentX === 'center'
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                            : 'border-white/10 hover:bg-white/5 text-slate-400'
                                                            }`} title={t('processor.tooltips.center')}>✛</button>
                                                    <button onClick={() => setSignatureOptions(prev => ({ ...prev, alignmentY: 'center', alignmentX: 'right' }))}
                                                        className={`h-12 rounded-lg border flex items-center justify-center transition-all ${signatureOptions.alignmentY === 'center' && signatureOptions.alignmentX === 'right'
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                            : 'border-white/10 hover:bg-white/5 text-slate-400'
                                                            }`} title={t('processor.tooltips.centerRight')}>→</button>

                                                    {/* Bottom Row */}
                                                    <button onClick={() => setSignatureOptions(prev => ({ ...prev, alignmentY: 'bottom', alignmentX: 'left' }))}
                                                        className={`h-12 rounded-lg border flex items-center justify-center transition-all ${signatureOptions.alignmentY === 'bottom' && signatureOptions.alignmentX === 'left'
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                            : 'border-white/10 hover:bg-white/5 text-slate-400'
                                                            }`} title={t('processor.tooltips.bottomLeft')}>↙</button>
                                                    <button onClick={() => setSignatureOptions(prev => ({ ...prev, alignmentY: 'bottom', alignmentX: 'center' }))}
                                                        className={`h-12 rounded-lg border flex items-center justify-center transition-all ${signatureOptions.alignmentY === 'bottom' && signatureOptions.alignmentX === 'center'
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                            : 'border-white/10 hover:bg-white/5 text-slate-400'
                                                            }`} title={t('processor.tooltips.bottomCenter')}>↓</button>
                                                    <button onClick={() => setSignatureOptions(prev => ({ ...prev, alignmentY: 'bottom', alignmentX: 'right' }))}
                                                        className={`h-12 rounded-lg border flex items-center justify-center transition-all ${signatureOptions.alignmentY === 'bottom' && signatureOptions.alignmentX === 'right'
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                            : 'border-white/10 hover:bg-white/5 text-slate-400'
                                                            }`} title={t('processor.tooltips.bottomRight')}>↘</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {toolId === 'watermark' && (
                                        <div className="w-full max-w-sm mx-auto space-y-4">
                                            <div className="flex bg-slate-800 p-1 rounded-lg">
                                                <button
                                                    onClick={() => setWatermarkType('text')}
                                                    className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${watermarkType === 'text' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    {t('processor.watermarkText')}
                                                </button>
                                                <button
                                                    onClick={() => setWatermarkType('image')}
                                                    className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${watermarkType === 'image' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    {t('processor.uploadedLogo')}
                                                </button>
                                            </div>

                                            {watermarkType === 'text' ? (
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-1 ml-1 text-left">{t('processor.watermarkText')}</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-slate-700 rounded p-2 text-white border border-slate-600 focus:border-blue-500 focus:outline-none"
                                                        placeholder={t('processor.watermarkPlaceholder')}
                                                        value={watermark}
                                                        onChange={(e) => setWatermark(e.target.value)}
                                                    />
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-1 ml-1 text-left">{t('processor.uploadLogo')}</label>
                                                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors relative">
                                                        <input
                                                            type="file"
                                                            accept="image/png, image/jpeg"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    setWatermarkImage(e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                        {watermarkImage ? (
                                                            <div className="flex items-center justify-center space-x-2 text-indigo-400">
                                                                <FileIcon size={20} />
                                                                <span className="truncate max-w-[200px]">{watermarkImage.name}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-500 text-sm">
                                                                <p>{t('processor.clickToSelectLogo')}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Custom Options Grid */}
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700 mt-4">
                                                {/* Position Grid */}
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2 text-left">{t('processor.position')}</label>
                                                    <div className="grid grid-cols-3 gap-1 w-full max-w-[150px]">
                                                        {['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(pos => (
                                                            <button
                                                                key={pos}
                                                                onClick={() => setWatermarkPosition(pos)}
                                                                className={`h-8 rounded-md border transition-all ${watermarkPosition === pos ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                                                                title={t(`processor.tooltips.${pos.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`)}
                                                            />
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => setWatermarkPosition('tiled')}
                                                        className={`mt-2 w-full max-w-[150px] py-1 text-xs rounded border ${watermarkPosition === 'tiled' ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 text-slate-400'}`}
                                                    >
                                                        {t('processor.tiled')}
                                                    </button>
                                                </div>

                                                {/* Sliders */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm text-slate-400 mb-1 text-left flex justify-between">
                                                            <span>{t('processor.opacity')}</span>
                                                            <span>{Math.round(watermarkOpacity * 100)}%</span>
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="0.1"
                                                            max="1"
                                                            step="0.1"
                                                            value={watermarkOpacity}
                                                            onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                                                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-slate-400 mb-1 text-left flex justify-between">
                                                            <span>{t('processor.rotation')}</span>
                                                            <span>{watermarkRotation}°</span>
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="-180"
                                                            max="180"
                                                            step="45"
                                                            value={watermarkRotation}
                                                            onChange={(e) => setWatermarkRotation(parseInt(e.target.value))}
                                                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {toolId === 'split' && (
                                        <div className="w-full max-w-sm mx-auto space-y-4 mb-4">
                                            <div className="flex bg-slate-800 p-1 rounded-lg">
                                                <button
                                                    onClick={() => setSplitMode('extract')}
                                                    className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${splitMode === 'extract' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    {t('processor.extractPages')}
                                                </button>
                                                <button
                                                    onClick={() => setSplitMode('burst')}
                                                    className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${splitMode === 'burst' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    {t('processor.burstAll')}
                                                </button>
                                            </div>

                                            {splitMode === 'extract' && (
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-1 ml-1 text-left">{t('processor.pageRange')}</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 1-5, 8, 10-12"
                                                        value={password} // Using password state for range
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="w-full bg-slate-800 border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                    <p className="text-xs text-slate-500 mt-1 text-left">{t('processor.singlePdf')}</p>
                                                </div>
                                            )}
                                            {splitMode === 'burst' && (
                                                <p className="text-sm text-slate-400">{t('processor.separatePdf')}</p>
                                            )}
                                        </div>
                                    )}

                                </div>
                            )}

                            {toolId === 'ocr' && (
                                <div className="w-full max-w-sm mx-auto space-y-4 mb-4">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3 mb-4">
                                        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-200">
                                            <p className="font-semibold mb-1">{t('processor.ocrLanguage')}</p>
                                            <p className="opacity-80">
                                                {t('processor.ocrDesc')}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1 ml-1 text-left">{t('processor.documentLanguage')}</label>
                                        <select
                                            value={password || 'eng'} // Default to 'eng'
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-800 border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="eng">English (eng)</option>
                                            <option value="spa">Spanish (spa)</option>
                                            <option value="fra">French (fra)</option>
                                            <option value="deu">German (deu)</option>
                                            <option value="ita">Italian (ita)</option>
                                            <option value="por">Portuguese (por)</option>
                                            <option value="chi_sim">Chinese - Simplified (chi_sim)</option>
                                            <option value="jpn">Japanese (jpn)</option>
                                            <option value="ara">Arabic (ara)</option>
                                            <option value="hin">Hindi (hin)</option>
                                            <option value="rus">Russian (rus)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Compression Quality Selector */}
                            {toolId === 'compress' && (
                                <div className="space-y-4">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3 mb-4">
                                        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-200">
                                            <p className="font-semibold mb-1">{t('processor.compressionMode')}</p>
                                            <p className="opacity-80">
                                                {t('processor.compressionDesc')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { label: 'Extreme', val: '0.4', desc: 'Smallest Size', color: 'border-orange-500 text-orange-400' },
                                            { label: 'Recommended', val: '0.7', desc: 'Good Balance', color: 'border-blue-500 text-blue-400' },
                                            { label: 'High Quality', val: '0.9', desc: 'Best Fidelity', color: 'border-emerald-500 text-emerald-400' }
                                        ].map((preset) => (
                                            <button
                                                key={preset.label}
                                                onClick={() => setPassword(preset.val)}
                                                className={`relative p-4 rounded-xl border-2 transition-all text-left ${password === preset.val
                                                    ? `${preset.color} bg-white/5 shadow-lg`
                                                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-white/5'
                                                    }`}
                                            >
                                                <div className="font-bold text-lg mb-1">
                                                    {preset.label === 'Extreme' ? t('processor.extreme') :
                                                        preset.label === 'Recommended' ? t('processor.recommended') :
                                                            t('processor.highQuality')}
                                                </div>
                                                <div className="text-xs opacity-70">
                                                    {preset.desc === 'Smallest Size' ? t('processor.smallestSize') :
                                                        preset.desc === 'Good Balance' ? t('processor.goodBalance') :
                                                            t('processor.bestFidelity')}
                                                </div>
                                                {password === preset.val && (
                                                    <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {toolId === 'protect' && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <Lock className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-red-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.encryptPdf')}</p>
                                            <p className="opacity-80">
                                                {t('processor.encryptDesc')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-yellow-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.importantNote')}</p>
                                            <p className="opacity-80">
                                                {t('processor.encryptWarning')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-left">
                                        <label className="text-sm text-slate-400 ml-1">{t('processor.setPassword')}</label>
                                        <div className="relative mt-1">
                                            <input
                                                type="text" // Simple text for visibility, or password? Let's use text for user ease as requested in similar apps usually, or password type.
                                                // Let's use text to avoid confusion since there is no confirmation field.
                                                placeholder={t('processor.enterStrongPassword')}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                                            />
                                            <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {toolId === 'unlock' && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <Unlock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.unlockPdf')}</p>
                                            <p className="opacity-80">
                                                {t('processor.unlockDesc')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-yellow-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.textConversionWarning')}</p>
                                            <p className="opacity-80">
                                                {t('processor.unlockWarning')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-left">
                                        <label className="text-sm text-slate-400 ml-1">{t('processor.password')}</label>
                                        <div className="relative mt-1">
                                            <input
                                                type="password"
                                                placeholder={t('processor.enterFilePassword')}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                                            />
                                            <Unlock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                        </div>
                                    </div>
                                </div>
                            )}



                            {toolId === 'repair' && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <Wrench className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.repairPdf')}</p>
                                            <p className="opacity-80">
                                                {t('processor.repairDesc')}
                                            </p>
                                        </div>
                                    </div>

                                    <div onClick={() => setForceRebuild(!forceRebuild)} className="cursor-pointer bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800 transition-colors">
                                        <div className="text-left">
                                            <p className="font-semibold text-slate-200">{t('processor.deepRepair')}</p>
                                            <p className="text-xs text-slate-400">{t('processor.deepRepairDesc')}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${forceRebuild ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                                            {forceRebuild && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {toolId === 'grayscale' && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-slate-500/10 border border-slate-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <Droplet className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-slate-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.convertToGrayscale')}</p>
                                            <p className="opacity-80">
                                                {t('processor.grayscaleDesc')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-yellow-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.textConversionWarning')}</p>
                                            <p className="opacity-80">
                                                {t('processor.grayscaleWarning')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}



                            {toolId === 'invert-colors' && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-slate-500/10 border border-slate-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <Moon className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-slate-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.invertColors')}</p>
                                            <p className="opacity-80">
                                                {t('processor.invertDesc')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-yellow-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.textConversionWarning')}</p>
                                            <p className="opacity-80">
                                                {t('processor.invertWarning')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {toolId === 'ocr' && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <FileIcon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.makePdfSearchable')}</p>
                                            <p className="opacity-80">
                                                {t('processor.ocrDesc2')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-left">
                                        <label className="text-sm text-slate-400 ml-1">{t('processor.documentLanguage')}</label>
                                        <select
                                            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                                            value={password} // Using password state for language code
                                            onChange={(e) => setPassword(e.target.value)}
                                        >
                                            <option value="eng">English</option>
                                            <option value="fra">French (Français)</option>
                                            <option value="spa">Spanish (Español)</option>
                                            <option value="deu">German (Deutsch)</option>
                                            <option value="ita">Italian (Italiano)</option>
                                            <option value="por">Portuguese (Português)</option>
                                            <option value="rus">Russian (Русский)</option>
                                            <option value="chi_sim">Chinese (Simplified)</option>
                                            <option value="ara">Arabic (العربية)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {toolId === 'extract-text' && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <FileIcon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.extractPlainText')}</p>
                                            <p className="opacity-80">
                                                {t('processor.extractTextDesc')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}



                            {toolId === 'remove-annotations' && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <Eraser className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-red-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.removeAllAnnotations')}</p>
                                            <p className="opacity-80">
                                                {t('processor.removeAnnotationsDesc')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {toolId === 'redact' && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <EyeOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-red-200 text-left">
                                            <p className="font-semibold mb-1">{t('processor.permanentRedaction')}</p>
                                            <p className="opacity-80">
                                                {t('processor.redactionDesc')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 text-left">
                                        <div>
                                            <label className="text-sm text-slate-400 ml-1">{t('processor.textToRedact')}</label>
                                            <textarea
                                                placeholder="e.g. John Doe, Confidential, 123-456"
                                                value={password} // Reusing password state
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full px-4 py-3 mt-1 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-red-500 transition-all min-h-[100px]"
                                            />
                                        </div>

                                        <div onClick={() => setForceRebuild(!forceRebuild)} className="cursor-pointer bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800 transition-colors">
                                            <div className="text-left">
                                                <p className="font-semibold text-slate-200">{t('processor.redactAllNumbers')}</p>
                                                <p className="text-xs text-slate-400">{t('processor.redactNumbersDesc')}</p>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${forceRebuild ? 'bg-red-500 border-red-500' : 'border-slate-500'}`}>
                                                {forceRebuild && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {toolId === 'edit-metadata' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                    <div>
                                        <label className="text-xs text-slate-400 ml-1">{t('processor.title')}</label>
                                        <input type="text" placeholder={t('processor.title')} value={metadata.title} onChange={e => setMetadata({ ...metadata, title: e.target.value })}
                                            className="w-full px-4 py-2 mt-1 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 ml-1">{t('processor.author')}</label>
                                        <input type="text" placeholder={t('processor.author')} value={metadata.author} onChange={e => setMetadata({ ...metadata, author: e.target.value })}
                                            className="w-full px-4 py-2 mt-1 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 ml-1">{t('processor.subject')}</label>
                                        <input type="text" placeholder={t('processor.subject')} value={metadata.subject} onChange={e => setMetadata({ ...metadata, subject: e.target.value })}
                                            className="w-full px-4 py-2 mt-1 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 ml-1">{t('processor.keywords')}</label>
                                        <input type="text" placeholder={t('processor.keywords')} value={metadata.keywords} onChange={e => setMetadata({ ...metadata, keywords: e.target.value })}
                                            className="w-full px-4 py-2 mt-1 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 ml-1">{t('processor.creator')}</label>
                                        <input type="text" placeholder={t('processor.creator')} value={metadata.creator} onChange={e => setMetadata({ ...metadata, creator: e.target.value })}
                                            className="w-full px-4 py-2 mt-1 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 ml-1">{t('processor.producer')}</label>
                                        <input type="text" placeholder={t('processor.producer')} value={metadata.producer} onChange={e => setMetadata({ ...metadata, producer: e.target.value })}
                                            className="w-full px-4 py-2 mt-1 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                </div>

                            )}

                            {toolId === 'trim' && (
                                <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h4 className="text-white font-medium">{t('processor.trimMargins')}</h4>
                                            <p className="text-xs text-slate-400">{t('processor.trimDesc')}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setTrimMargins({ top: 0, bottom: 0, left: 0, right: 0 })}
                                                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-all">{t('processor.reset')}</button>
                                            <button onClick={() => setTrimMargins({ top: 36, bottom: 36, left: 36, right: 36 })}
                                                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-all">0.5"</button>
                                            <button onClick={() => setTrimMargins({ top: 72, bottom: 72, left: 72, right: 72 })}
                                                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-all">1.0"</button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center justify-center gap-4">
                                        {/* Top Input */}
                                        <div className="w-32">
                                            <div className="relative">
                                                <input type="number" min="0" value={trimMargins.top} onChange={e => setTrimMargins({ ...trimMargins, top: Number(e.target.value) })}
                                                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-center focus:border-blue-500 transition-all" />
                                                <span className="absolute left-3 top-2 text-slate-500 text-xs">T</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Left Input */}
                                            <div className="w-24">
                                                <div className="relative">
                                                    <input type="number" min="0" value={trimMargins.left} onChange={e => setTrimMargins({ ...trimMargins, left: Number(e.target.value) })}
                                                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-center focus:border-blue-500 transition-all" />
                                                    <span className="absolute left-3 top-2 text-slate-500 text-xs">L</span>
                                                </div>
                                            </div>

                                            {/* Visual Preview */}
                                            <div className="relative w-40 h-56 bg-white rounded-lg shadow-xl overflow-hidden flex items-center justify-center">
                                                <div className="absolute inset-0 bg-slate-200 border border-slate-300 m-1 rounded-sm"
                                                    style={{
                                                        backgroundImage: thumbnails[0] ? `url(${thumbnails[0]})` : undefined,
                                                        backgroundSize: 'contain',
                                                        backgroundPosition: 'center',
                                                        backgroundRepeat: 'no-repeat'
                                                    }}
                                                ></div>
                                                {/* Content Zone */}
                                                <div className="absolute bg-blue-500/20 border-2 border-dashed border-blue-500/50 transition-all duration-75 flex items-center justify-center group"
                                                    style={{
                                                        top: `${Math.min(trimMargins.top / 4, 100)}px`,
                                                        bottom: `${Math.min(trimMargins.bottom / 4, 100)}px`,
                                                        left: `${Math.min(trimMargins.left / 4, 70)}px`,
                                                        right: `${Math.min(trimMargins.right / 4, 70)}px`
                                                    }}>

                                                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider bg-white/50 px-1 rounded select-none pointer-events-none">{t('processor.safeArea')}</span>

                                                    {/* Handles */}
                                                    {/* Top Handle */}
                                                    <div onMouseDown={(e) => handleDragStart(e, 'top')} className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-blue-500/50 transition-colors"></div>
                                                    {/* Bottom Handle */}
                                                    <div onMouseDown={(e) => handleDragStart(e, 'bottom')} className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-blue-500/50 transition-colors"></div>
                                                    {/* Left Handle */}
                                                    <div onMouseDown={(e) => handleDragStart(e, 'left')} className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-blue-500/50 transition-colors"></div>
                                                    {/* Right Handle */}
                                                    <div onMouseDown={(e) => handleDragStart(e, 'right')} className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-blue-500/50 transition-colors"></div>

                                                    {/* Corner Handles Visuals (Optional) */}
                                                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                                </div>
                                            </div>

                                            {/* Right Input */}
                                            <div className="w-24">
                                                <div className="relative">
                                                    <input type="number" min="0" value={trimMargins.right} onChange={e => setTrimMargins({ ...trimMargins, right: Number(e.target.value) })}
                                                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-center focus:border-blue-500 transition-all" />
                                                    <span className="absolute left-3 top-2 text-slate-500 text-xs">R</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Input */}
                                        <div className="w-32">
                                            <div className="relative">
                                                <input type="number" min="0" value={trimMargins.bottom} onChange={e => setTrimMargins({ ...trimMargins, bottom: Number(e.target.value) })}
                                                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-center focus:border-blue-500 transition-all" />
                                                <span className="absolute left-3 top-2 text-slate-500 text-xs">B</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={processFiles}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                            >
                                {toolId === 'organize' ? t('processor.preparePages') : toolName} <ArrowLeft className="rotate-180" size={20} />
                            </button>

                            {/* List selected files */}
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                {files.map((f, i) => (
                                    <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-xs text-slate-300 flex items-center">
                                        <FileIcon size={12} className="mr-1" /> {f.name}
                                    </span>
                                ))}
                                <button onClick={() => setFiles([])} className="text-xs text-red-400 hover:text-red-300 underline">{t('common.clear')}</button>
                            </div>
                        </div>
                    )}


                    {/* State: Organizing */}
                    {status === 'organizing' && (
                        <PageGrid
                            files={files}
                            thumbnails={thumbnails}
                            onSave={handleOrganizeSave}
                        />
                    )}

                    {/* State: Processing */}
                    {status === 'processing' && (
                        <div className="text-center space-y-6">
                            <Loader2 size={60} className="text-blue-500 animate-spin mx-auto" />
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">{t('common.processing')}</h3>
                                <p className="text-slate-400">{t('processor.processingDesc')}</p>
                            </div>
                        </div>
                    )}

                    {/* State: Done */}
                    {status === 'done' && resultUrl && (
                        <div className="text-center space-y-8 animate-in zoom-in duration-300">
                            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                                <Download size={48} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-2">{t('common.done')}</h3>
                                <p className="text-slate-400">{t('processor.readyDesc')}</p>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <a
                                    href={resultUrl}
                                    download={`orbitpdf_${toolId}_result.${downloadExt}`}
                                    className="px-8 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg shadow-lg hover:shadow-green-500/25 transition-all flex items-center gap-2"
                                >
                                    <Download size={20} /> {t('common.download', { ext: downloadExt.toUpperCase() })}
                                </a>
                                <button
                                    onClick={() => {
                                        setStatus('idle');
                                        setFiles([]);
                                        setResultUrl(null);
                                        setPassword('');
                                        setThumbnails([]);
                                    }}
                                    className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
                                >
                                    {t('common.startOver')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* State: Error */}
                    {status === 'error' && (
                        <div className="text-center space-y-6 animate-in shake duration-300">
                            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
                                <AlertCircle size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">{t('processor.oops')}</h3>
                                <p className="text-red-300 max-w-md mx-auto">{errorMessage}</p>
                            </div>
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
                            >
                                {t('common.tryAgain')}
                            </button>
                        </div>
                    )}

                </div>

                {/* Bottom Ad Banner */}
                <div className="mt-8">
                    <AdSpace placement="footer" className="w-full" />
                </div>
            </div>

            {/* Right Sidebar Ad (PC Only) */}
            <div className="hidden xl:block w-[160px] flex-shrink-0 pt-20" >
                <div className="sticky top-24">
                    <AdSpace placement="sidebar" />
                </div>
            </div>
        </div>
    );
};




export default ToolProcessor;


