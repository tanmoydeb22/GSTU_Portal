import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { differenceInSeconds, differenceInDays, isPast } from 'date-fns';

export default function SemesterCountdown({ regEnd }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const endDate = new Date(regEnd);
    const update = () => {
      if (isPast(endDate)) { setExpired(true); setTimeLeft('Registration Closed'); return; }
      const totalSecs = differenceInSeconds(endDate, new Date());
      const days = differenceInDays(endDate, new Date());
      const hrs = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setTimeLeft(days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs}h ${mins}m ${secs}s`);
      setUrgent(totalSecs < 86400);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [regEnd]);

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
      expired ? 'bg-gray-100 text-gray-500' : urgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-brand-100 text-brand-700'
    }`}>
      <Clock className="h-3.5 w-3.5" />
      {expired ? 'Registration Closed' : `Closes in ${timeLeft}`}
    </div>
  );
}
