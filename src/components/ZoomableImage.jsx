import { useState, useRef, useEffect } from 'react';

/**
 * A zoomable image component that supports anchored pinch-to-zoom and panning on mobile.
 */
export default function ZoomableImage({ src, alt, style }) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const imageRef = useRef(null);

    // Gesture state tracking
    const lastDistance = useRef(0);
    const lastPoint = useRef({ x: 0, y: 0 });
    const lastTap = useRef(0);
    const initialDistance = useRef(0);
    const initialScale = useRef(1);

    // For anchored zoom
    const getMidpoint = (touches) => {
        return {
            x: (touches[0].pageX + touches[1].pageX) / 2,
            y: (touches[0].pageY + touches[1].pageY) / 2
        };
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const distance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            lastDistance.current = distance;
            initialDistance.current = distance;
            initialScale.current = scale;
            
            const mid = getMidpoint(e.touches);
            lastPoint.current = mid;
        } else if (e.touches.length === 1) {
            lastPoint.current = { x: e.touches[0].pageX, y: e.touches[0].pageY };
            
            // Handle double tap
            const now = Date.now();
            if (now - lastTap.current < 300) {
                handleDoubleTap(e.touches[0].pageX, e.touches[0].pageY);
                lastTap.current = 0;
            } else {
                lastTap.current = now;
            }
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const distance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            
            const mid = getMidpoint(e.touches);
            const deltaScale = distance / lastDistance.current;
            const newScale = Math.min(Math.max(1, scale * deltaScale), 4);
            
            if (newScale !== scale) {
                // Calculate how much to Move to keep the midpoint fixed
                const rect = containerRef.current.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Position relative to image center
                const currentRelX = (mid.x - centerX - position.x) / scale;
                const currentRelY = (mid.y - centerY - position.y) / scale;

                const nextX = mid.x - centerX - currentRelX * newScale;
                const nextY = mid.y - centerY - currentRelY * newScale;

                setScale(newScale);
                setPosition({ x: nextX, y: nextY });
            }
            
            lastDistance.current = distance;
            lastPoint.current = mid;
        } else if (e.touches.length === 1 && scale > 1) {
            e.preventDefault();
            const deltaX = e.touches[0].pageX - lastPoint.current.x;
            const deltaY = e.touches[0].pageY - lastPoint.current.y;
            
            setPosition(prev => {
                const newX = prev.x + deltaX;
                const newY = prev.y + deltaY;
                
                // Optional: add bounds checking here. 
                // For now, free panning is often preferred by users who want to "see everywhere"
                return { x: newX, y: newY };
            });
            
            lastPoint.current = { x: e.touches[0].pageX, y: e.touches[0].pageY };
        }
    };

    const handleTouchEnd = (e) => {
        if (e.touches.length < 2) {
            lastDistance.current = 0;
        }
        if (e.touches.length === 1) {
            lastPoint.current = { x: e.touches[0].pageX, y: e.touches[0].pageY };
        }
        
        if (scale <= 1) {
            setPosition({ x: 0, y: 0 });
        }
    };

    const handleDoubleTap = (touchX, touchY) => {
        if (scale > 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        } else {
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const newScale = 2.5;
            const nextX = (centerX - touchX) * (newScale - 1);
            const nextY = (centerY - touchY) * (newScale - 1);

            setScale(newScale);
            setPosition({ x: nextX, y: nextY });
        }
    };

    return (
        <div 
            ref={containerRef}
            style={{ 
                width: '100%', 
                height: '100%',
                overflow: 'hidden', 
                touchAction: scale === 1 ? 'pan-y' : 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                background: 'rgba(0,0,0,0.1)',
                minHeight: '300px'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <img
                ref={imageRef}
                src={src}
                alt={alt}
                draggable={false}
                style={{
                    ...style,
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: scale === 1 ? 'transform 0.3s ease' : 'none',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                }}
            />
            {scale > 1 && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>
                    Double-tap pour réinitialiser
                </div>
            )}
        </div>
    );
}
