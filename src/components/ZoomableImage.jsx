import { useState, useRef } from 'react';

/**
 * A zoomable image component that supports pinch-to-zoom and panning on mobile.
 */
export default function ZoomableImage({ src, alt, style }) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Gesture state tracking
    const lastDistance = useRef(0);
    const lastPoint = useRef({ x: 0, y: 0 });
    const lastTap = useRef(0);

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const distance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            lastDistance.current = distance;
        } else if (e.touches.length === 1) {
            lastPoint.current = { x: e.touches[0].pageX, y: e.touches[0].pageY };

            // Handle double tap
            const now = Date.now();
            if (now - lastTap.current < 300) {
                handleDoubleTap();
                lastTap.current = 0;
            } else {
                lastTap.current = now;
            }
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            // Prevent scrolling while pinching
            e.preventDefault();
            const distance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );

            if (lastDistance.current > 0) {
                const delta = distance / lastDistance.current;
                setScale(prev => {
                    const newScale = Math.min(Math.max(1, prev * delta), 4);
                    return newScale;
                });
            }
            lastDistance.current = distance;
        } else if (e.touches.length === 1 && scale > 1) {
            // Prevent scrolling while panning
            e.preventDefault();
            const deltaX = e.touches[0].pageX - lastPoint.current.x;
            const deltaY = e.touches[0].pageY - lastPoint.current.y;

            setPosition(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));

            lastPoint.current = { x: e.touches[0].pageX, y: e.touches[0].pageY };
        }
    };

    const handleTouchEnd = () => {
        lastDistance.current = 0;
        if (scale <= 1) {
            setPosition({ x: 0, y: 0 });
        }
    };

    const handleDoubleTap = () => {
        if (scale > 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        } else {
            setScale(2);
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                overflow: 'hidden',
                touchAction: scale === 1 ? 'pan-y' : 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <img
                src={src}
                alt={alt}
                draggable={false}
                style={{
                    ...style,
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: scale === 1 && position.x === 0 ? 'transform 0.3s ease' : 'none',
                    userSelect: 'none',
                    pointerEvents: 'none'
                }}
            />
            {scale > 1 && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    pointerEvents: 'none'
                }}>
                    Double-tap pour réinitialiser
                </div>
            )}
        </div>
    );
}
