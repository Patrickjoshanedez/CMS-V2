import React, { useRef, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Type, Pen, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const INK_COLORS = [
  { id: 'navy', label: 'Institutional Navy', value: '#1e3a8a' },
  { id: 'black', label: 'Classic Black', value: '#09090b' },
  { id: 'blue', label: 'Royal Blue', value: '#2563eb' },
];

/**
 * SignaturePad component
 * Clean white canvas for signing documents digitally.
 * Exports a transparent PNG data URL to ensure seamless rendering across light/dark themes.
 */
export function SignaturePad({
  value = null,
  onChange,
  onClear,
  defaultSignatoryName = '',
  height = 160,
  className = '',
}) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('draw'); // 'draw' | 'type'
  const [strokeColor, setStrokeColor] = useState('#1e3a8a');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState(defaultSignatoryName);
  const [typedFont, setTypedFont] = useState('cursive'); // 'cursive' | 'serif'

  // Initialize canvas coordinates & high-DPR scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;

    // If there's an initial value (image URL or data URL) and we haven't drawn yet, paint it
    if (value && !hasDrawn && mode === 'draw') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, (rect.width - 240) / 2, (rect.height - 80) / 2, 240, 80);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, [strokeColor, value, hasDrawn, mode]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  // Export current canvas state as transparent PNG data URL
  const emitSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      onChange?.(dataUrl);
    } catch {
      // Ignore security errors if external tainted image
    }
  }, [onChange]);

  // Draw typed signature onto canvas
  const renderTypedSignature = useCallback(
    (name, fontChoice, color) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setHasDrawn(Boolean(name && name.trim()));
        return;
      }

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!name || !name.trim()) {
        setHasDrawn(false);
        onChange?.(null);
        return;
      }

      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const fontFamily =
        fontChoice === 'serif'
          ? '"Times New Roman", Times, serif'
          : '"Dancing Script", "Caveat", "Brush Script MT", "Great Vibes", cursive';
      ctx.font = `italic 36px ${fontFamily}`;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      ctx.fillText(name.trim(), centerX, centerY);
      ctx.restore();

      setHasDrawn(true);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        onChange?.(dataUrl);
      } catch {
        // Safe fallback
      }
    },
    [onChange],
  );

  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (mode === 'type') {
      setTypedName('');
    }
    onChange?.(null);
    onClear?.();
  };

  // Pointer event handlers for drawing (Unified mouse, stylus, touch)
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture fallback
    }

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {
      // Fallback
    }
    emitSignature();
  };

  const handleColorChange = (color) => {
    setStrokeColor(color);
    if (mode === 'type') {
      renderTypedSignature(typedName, typedFont, color);
    }
  };

  const handleTypedNameChange = (e) => {
    const val = e.target.value;
    setTypedName(val);
    renderTypedSignature(val, typedFont, strokeColor);
  };

  const handleFontChange = (font) => {
    setTypedFont(font);
    renderTypedSignature(typedName, font, strokeColor);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mode Switcher & Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('draw');
              handleClear();
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors',
              mode === 'draw'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Pen className="h-3.5 w-3.5" /> Draw Signature
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('type');
              const nameToUse = typedName || defaultSignatoryName;
              setTypedName(nameToUse);
              renderTypedSignature(nameToUse, typedFont, strokeColor);
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors',
              mode === 'type'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Type className="h-3.5 w-3.5" /> Type to Sign
          </button>
        </div>

        {/* Ink Colors & Clear */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {INK_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => handleColorChange(c.value)}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center',
                  strokeColor === c.value
                    ? 'border-primary scale-110 shadow-xs'
                    : 'border-transparent opacity-80 hover:opacity-100',
                )}
                style={{ backgroundColor: c.value }}
              >
                {strokeColor === c.value && <Check className="h-3 w-3 text-white stroke-[3]" />}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Clear
          </Button>
        </div>
      </div>

      {/* Type to Sign Input Field */}
      {mode === 'type' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="type-sig-input" className="text-xs">
              Legal Full Name
            </Label>
            <Input
              id="type-sig-input"
              value={typedName}
              onChange={handleTypedNameChange}
              placeholder="e.g. Sales G. Aribe Jr."
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Font Style</Label>
            <div className="flex rounded-md border border-input h-8 p-0.5 bg-background">
              <button
                type="button"
                onClick={() => handleFontChange('cursive')}
                className={cn(
                  'flex-1 text-xs font-serif italic rounded px-2 transition-colors',
                  typedFont === 'cursive'
                    ? 'bg-muted font-bold text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                Cursive
              </button>
              <button
                type="button"
                onClick={() => handleFontChange('serif')}
                className={cn(
                  'flex-1 text-xs font-serif rounded px-2 transition-colors',
                  typedFont === 'serif'
                    ? 'bg-muted font-bold text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                Formal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean White Canvas Container */}
      <div className="relative rounded-xl border border-border bg-white shadow-xs overflow-hidden">
        {/* Subtle Guideline */}
        <div className="absolute inset-x-6 bottom-7 border-b border-dashed border-slate-300 pointer-events-none" />
        <span className="absolute bottom-1 right-3 text-[10px] text-slate-400 select-none pointer-events-none font-mono">
          Sign above the line • Transparent PNG Export
        </span>

        <canvas
          ref={canvasRef}
          style={{ height: `${height}px` }}
          className="w-full block cursor-crosshair touch-none select-none bg-transparent"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {!hasDrawn && mode === 'draw' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <p className="text-xs text-slate-400 font-sans tracking-wide">
              Draw your signature here using mouse, stylus, or finger
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

SignaturePad.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onClear: PropTypes.func,
  defaultSignatoryName: PropTypes.string,
  height: PropTypes.number,
  className: PropTypes.string,
};

export default SignaturePad;
