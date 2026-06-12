import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const TopProgressBar = () => {
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(0);
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    setWidth(0);
    
    // Animate to 90%
    const t1 = setTimeout(() => setWidth(30), 50);
    const t2 = setTimeout(() => setWidth(60), 200);
    const t3 = setTimeout(() => setWidth(90), 500);
    
    // Complete after short delay
    const t4 = setTimeout(() => {
      setWidth(100);
      setTimeout(() => {
        setLoading(false);
        setWidth(0);
      }, 300);
    }, 800);

    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [location.pathname]);

  if (!loading && width === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div
        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(22,163,74,0.7)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

export default TopProgressBar;
