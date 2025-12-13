import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface MenuPosition {
  x: number;
  y: number;
}

function ContextMenu() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const navigate = useNavigate();

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    
    // Position the menu at the cursor, but keep it within viewport
    const x = Math.min(e.clientX, window.innerWidth - 160);
    const y = Math.min(e.clientY, window.innerHeight - 50);
    
    setPosition({ x, y });
    setVisible(true);
  }, []);

  const handleClick = useCallback(() => {
    setVisible(false);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setVisible(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setVisible(false);
    navigate(-1);
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleContextMenu, handleClick, handleKeyDown]);

  if (!visible) return null;

  return (
    <div 
      className="context-menu"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <button className="context-menu-item" onClick={handleBack}>
        <span className="context-menu-icon">◀</span>
        <span>Back</span>
      </button>
    </div>
  );
}

export default ContextMenu;


