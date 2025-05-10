import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomeScreen() {
    const navigate = useNavigate();
    useEffect(() => {
        navigate('/chats', { replace: true });
    }, [navigate]);
    return null;
}
