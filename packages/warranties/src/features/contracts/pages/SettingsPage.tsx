import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirects to global Settings
export default function SettingsPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/settings', { replace: true }); }, [navigate]);
  return null;
}
