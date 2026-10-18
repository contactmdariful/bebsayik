import React, { useState, useRef, useEffect, UIEvent } from 'react';

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  keyExtractor?: (item: T, index: number) => string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 4,
  className = '',
  keyExtractor = (_, index) => `virt-item-${index}`,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + height) / itemHeight) + overscan);

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height, overflowY: 'auto', position: 'relative' }}
      className={`w-full rounded-lg border border-slate-800 bg-slate-950 ${className}`}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
          }}
        >
          {visibleItems.map((item, localIndex) => {
            const actualIndex = startIndex + localIndex;
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                style={{ height: itemHeight }}
                className="overflow-hidden"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
