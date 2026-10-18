import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../Button.js';

export interface PatternLockCanvasProps {
  value?: number[];
  onChange?: (pattern: number[]) => void;
  readOnly?: boolean;
  size?: number; // Canvas size in pixels (default: 280)
  minNodes?: number;
  className?: string;
}

interface Point {
  x: number;
  y: number;
  index: number;
}

export function PatternLockCanvas({
  value = [],
  onChange,
  readOnly = false,
  size = 280,
  minNodes = 4,
  className = '',
}: PatternLockCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNodes, setSelectedNodes] = useState<number[]>(value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPointer, setCurrentPointer] = useState<{ x: number; y: number } | null>(null);

  // Sync with value prop if provided externally
  useEffect(() => {
    setSelectedNodes(value);
  }, [value]);

  // Generate 3x3 grid dot coordinates
  const getDotPoints = useCallback((): Point[] => {
    const points: Point[] = [];
    const padding = size * 0.18;
    const step = (size - padding * 2) / 2;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        points.push({
          x: padding + col * step,
          y: padding + row * step,
          index: row * 3 + col,
        });
      }
    }
    return points;
  }, [size]);

  // Render canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = getDotPoints();
    const dotRadius = size * 0.055;
    const activeRadius = size * 0.08;

    ctx.clearRect(0, 0, size, size);

    // Draw connecting lines between selected nodes
    if (selectedNodes.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = size * 0.018;
      ctx.strokeStyle = '#0D9488'; // Teal 600
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      selectedNodes.forEach((nodeIndex, i) => {
        const pt = points[nodeIndex];
        if (i === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      });

      // Draw line to current moving pointer if actively drawing
      if (isDrawing && currentPointer && selectedNodes.length > 0) {
        ctx.lineTo(currentPointer.x, currentPointer.y);
      }

      ctx.stroke();
    }

    // Draw 9 dots
    points.forEach((pt) => {
      const isSelected = selectedNodes.includes(pt.index);

      // Outer glow/ring for selected dots
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, activeRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(13, 148, 136, 0.25)'; // Teal glow
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, activeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#0D9488';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Inner dot center
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#14B8A6' : '#475569'; // Active Teal vs Inactive Slate
      ctx.fill();
    });
  }, [size, selectedNodes, isDrawing, currentPointer, getDotPoints]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer coordinate calculation relative to canvas bounding box
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Find if pointer is within dot detection radius
  const detectDot = (coords: { x: number; y: number } | null): number | null => {
    if (!coords) return null;
    const points = getDotPoints();
    const hitRadius = size * 0.12; // generous hit zone for touch targets

    for (const pt of points) {
      const dist = Math.hypot(pt.x - coords.x, pt.y - coords.y);
      if (dist <= hitRadius) {
        return pt.index;
      }
    }
    return null;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentPointer(coords);

    const hit = detectDot(coords);
    if (hit !== null) {
      setSelectedNodes([hit]);
    } else {
      setSelectedNodes([]);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || !isDrawing) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setCurrentPointer(coords);

    const hit = detectDot(coords);
    if (hit !== null && !selectedNodes.includes(hit)) {
      const updated = [...selectedNodes, hit];
      setSelectedNodes(updated);
    }
  };

  const handleEnd = () => {
    if (readOnly || !isDrawing) return;
    setIsDrawing(false);
    setCurrentPointer(null);

    if (onChange) {
      onChange(selectedNodes);
    }
  };

  const handleClear = () => {
    setSelectedNodes([]);
    setCurrentPointer(null);
    if (onChange) {
      onChange([]);
    }
  };

  const isValid = selectedNodes.length >= minNodes;

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl ${className}`}>
      <div className="relative touch-none select-none">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className={`rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-inner ${
            readOnly ? 'cursor-default' : 'cursor-pointer'
          }`}
          aria-label="3x3 Android Pattern Lock Canvas"
        />
      </div>

      {/* Status info & Reset Action */}
      <div className="w-full mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          {selectedNodes.length === 0 ? (
            <span className="text-slate-500">Draw customer pattern lock</span>
          ) : isValid ? (
            <span className="text-teal-400 flex items-center font-medium">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Pattern: {selectedNodes.length} nodes
            </span>
          ) : (
            <span className="text-amber-400 flex items-center font-medium">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              Min {minNodes} nodes required
            </span>
          )}
        </div>

        {!readOnly && selectedNodes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-slate-200 h-8 px-2"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}
