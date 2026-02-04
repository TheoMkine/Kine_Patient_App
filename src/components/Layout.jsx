import { useState, useEffect } from 'react';
import { handleSignoutClick } from '../services/googleAuth';

export default function Layout({ children, onSignout }) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleLogout = () => {
        handleSignoutClick();
        if (onSignout) onSignout();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header */}
            <header style={{
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                padding: 'var(--spacing-md)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--accent)' }}>
                        🏥 Kiné App
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="btn btn-secondary"
                        style={{ minHeight: '44px', padding: '8px 16px' }}
                    >
                        Déconnexion
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, overflow: 'auto' }}>
                {children}
            </main>


        </div>
    );
}
