import React, { useRef, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Type, Pen, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

const INK_COLORS = [
  { id: 'navy', label: 'Institutional Navy', token: '--slide-brand-navy' },
  { id: 'black', label: 'Classic Ink', token: '--slide-brand-ink' },
  { id: 'blue', label: 'Royal Blue', token: '--primary' },
];

const resolveInkColor = (token) => {
  const colorChannels = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return colorChannels ? `hsl(${colorChannels})` : getComputedStyle(document.documentElement).color;
};

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
  const [strokeColor, setStrokeColor] = useState(INK_COLORS[0].token);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState(defaultSignatoryName);
  const [typedFont, setTypedFont] = useState('cursive'); // 'cursive' | 'serif'
  const generatedId = React.useId().replaceAll(':', '');
  const typedNameId = `signature-name-${generatedId}`;
  const canvasHelpId = `signature-canvas-help-${generatedId}`;

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
    ctx.strokeStyle = resolveInkColor(strokeColor);
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
      ctx.fillStyle = resolveInkColor(color);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const fontFamily =
        fontChoice === 'serif'
          ? '"Times New Roman", Times, serif'
          : '"Dancing Script", "Caveat", "Brush Script MT", "Great Vibes", cursive';
      ctx.font = `italic 36px ${fontFamily}`;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      ctx.fillText(name.trim(), centerX, centerY, Math.max(1, rect.width - 24));
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
    ctx.strokeStyle = resolveInkColor(strokeColor);
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
        <div role="group" aria-label="Signature entry mode" className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant={mode === 'draw' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setMode('draw');
              handleClear();
            }}
            aria-pressed={mode === 'draw'}
            className="min-h-[44px] gap-1.5 sm:min-h-9"
          >
            <Pen className="size-3.5" aria-hidden="true" /> Draw Signature
          </Button>
          <Button
            type="button"
            variant={mode === 'type' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setMode('type');
              const nameToUse = typedName || defaultSignatoryName;
              setTypedName(nameToUse);
              renderTypedSignature(nameToUse, typedFont, strokeColor);
            }}
            aria-pressed={mode === 'type'}
            className="min-h-[44px] gap-1.5 sm:min-h-9"
          >
            <Type className="size-3.5" aria-hidden="true" /> Type to Sign
          </Button>
        </div>

        {/* Ink Colors & Clear */}
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Signature ink color" className="flex items-center gap-1">
            {INK_COLORS.map((c) => (
              <Button
                key={c.id}
                type="button"
                variant="outline"
                size="icon"
                title={c.label}
                aria-label={c.label}
                aria-pressed={strokeColor === c.token}
                onClick={() => handleColorChange(c.token)}
                className="h-[44px] w-[44px] rounded-full border-2 p-0 sm:size-9"
                style={{ backgroundColor: `hsl(var(${c.token}))` }}
              >
                {strokeColor === c.token && (
                  <Check className="size-3.5 text-primary-foreground" aria-hidden="true" />
                )}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="min-h-[44px] gap-1 px-2 text-xs text-muted-foreground hover:text-foreground sm:min-h-9"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Clear
          </Button>
        </div>
      </div>

      {/* Type to Sign Input Field */}
      {mode === 'type' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor={typedNameId} className="text-xs">
              Legal Full Name
            </Label>
            <Input
              id={typedNameId}
              value={typedName}
              onChange={handleTypedNameChange}
              placeholder="e.g. Sales G. Aribe Jr."
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Font Style</Label>
            <div role="group" aria-label="Signature font style" className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant={typedFont === 'cursive' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleFontChange('cursive')}
                aria-pressed={typedFont === 'cursive'}
                className="min-h-[44px] flex-1 font-serif text-xs italic sm:min-h-9"
              >
                Cursive
              </Button>
              <Button
                type="button"
                variant={typedFont === 'serif' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleFontChange('serif')}
                aria-pressed={typedFont === 'serif'}
                className="min-h-[44px] flex-1 font-serif text-xs sm:min-h-9"
              >
                Formal
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="relative overflow-hidden rounded-lg shadow-none">
        {/* Subtle Guideline */}
        <div className="pointer-events-none absolute inset-x-6 bottom-7 border-b border-dashed border-border/70" />
        <span className="pointer-events-none absolute bottom-1 right-3 select-none font-mono text-[10px] text-muted-foreground">
          Sign above the line • Transparent PNG export
        </span>

        <canvas
          ref={canvasRef}
          style={{ height: `${height}px` }}
          className="block w-full cursor-crosshair touch-none select-none bg-transparent"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label="Signature drawing canvas"
          aria-describedby={canvasHelpId}
        />

        <p
          id={canvasHelpId}
          className={
            !hasDrawn && mode === 'draw'
              ? 'pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center text-xs tracking-wide text-muted-foreground'
              : 'sr-only'
          }
        >
          Draw your signature here using mouse, stylus, or finger
        </p>
      </Card>
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
