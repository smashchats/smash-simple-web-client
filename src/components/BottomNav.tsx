import { Camera, Images, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useUIStore } from '../lib/uiStore';
import './BottomNav.css';

export default function BottomNav() {
    const show = useUIStore((s) => s.showBottomNav);
    const navigate = useNavigate();
    const location = useLocation();
    const isDarkMode = window.matchMedia(
        '(prefers-color-scheme: dark)',
    ).matches;

    if (!show) return null;

    return (
        <nav
            className="bottom-nav"
            style={{
                backgroundColor: isDarkMode
                    ? 'rgba(0,0,0,0.6)'
                    : 'rgba(230,230,230,0.6)',
            }}
        >
            <IconButton
                onClick={() => navigate('/chats', { replace: true })}
                active={location.pathname.startsWith('/chat')}
                isDarkMode={isDarkMode}
            >
                <MessageCircle
                    fill={
                        location.pathname.startsWith('/chat')
                            ? 'var(--color-primary)'
                            : 'transparent'
                    }
                />
            </IconButton>

            <IconButton
                onClick={() => navigate('/camera', { replace: true })}
                active={location.pathname === '/camera'}
                isDarkMode={isDarkMode}
            >
                <Camera />
            </IconButton>
            <IconButton
                onClick={() => navigate('/gallery', { replace: true })}
                active={location.pathname === '/gallery'}
                isDarkMode={isDarkMode}
            >
                <Images />
            </IconButton>
        </nav>
    );
}

function IconButton({
    children,
    onClick,
    active,
    isDarkMode,
}: Readonly<{
    children: React.ReactNode;
    onClick: () => void;
    active: boolean;
    isDarkMode: boolean;
}>) {
    const activeColor = 'var(--color-primary)';
    const inactiveColor = isDarkMode ? '#aaa' : '#666';
    const color = active ? activeColor : inactiveColor;

    return (
        <button
            className="bottom-nav-button"
            onClick={onClick}
            style={{
                color,
            }}
        >
            {children}
        </button>
    );
}
