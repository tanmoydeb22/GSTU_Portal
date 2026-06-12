const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const FULL_TO_ABBR = { Saturday:'Sat', Sunday:'Sun', Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri' };
const START_HOUR = 8; // 8:00 AM
const END_HOUR = 18; // 6:00 PM
const HOUR_HEIGHT = 50; // px per hour

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.substring(0, 5).split(':').map(Number);
  return h * 60 + (m || 0);
}

export default function ScheduleGrid({ courses, selectedCourseIds = [] }) {
  const blocks = [];

  courses.forEach(c => {
    const isSelected = selectedCourseIds.includes(c.offering_id);
    const isEnrolled = !!c.my_enrollment_id;
    if (!isSelected && !isEnrolled) return;

    const scheds = c.schedules || [];
    scheds.forEach(s => {
      const dayAbbr = FULL_TO_ABBR[s.day_of_week];
      const dayIndex = DAYS.indexOf(dayAbbr);
      if (dayIndex === -1) return;

      const startMin = parseTimeToMinutes(s.start_time);
      const endMin = parseTimeToMinutes(s.end_time);

      const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;

      blocks.push({
        id: `${c.offering_id}-${s.day_of_week}`,
        course_code: c.course_code,
        room_no: s.room_no,
        dayIndex,
        top,
        height,
        isSelected,
        isEnrolled,
        isConflict: c.isConflict
      });
    });
  });

  const hours = [];
  for (let i = START_HOUR; i <= END_HOUR; i++) {
    hours.push(i > 12 ? `${i - 12} PM` : i === 12 ? '12 PM' : `${i} AM`);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-6">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Weekly Schedule</h3>
        <div className="flex gap-3 text-[10px] font-bold uppercase text-gray-500">
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-brand-500"></div> Enrolled</span>
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded border border-dashed border-brand-500 bg-brand-50"></div> Selected</span>
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500"></div> Conflict</span>
        </div>
      </div>
      
      <div className="overflow-x-auto p-4">
        <div className="min-w-[700px]">
          {/* Header row (Days) */}
          <div className="flex border-b border-gray-200 pl-16">
            {DAYS.map(day => (
              <div key={day} className="flex-1 text-center py-2 text-xs font-bold text-gray-500 uppercase">{day}</div>
            ))}
          </div>

          {/* Grid body */}
          <div className="flex relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
            {/* Time labels column */}
            <div className="w-16 shrink-0 border-r border-gray-200">
              {hours.map((h, i) => (
                <div key={h} className="text-[10px] text-gray-400 font-medium text-right pr-2 relative -top-2" style={{ height: HOUR_HEIGHT }}>
                  {i < hours.length - 1 && h}
                </div>
              ))}
            </div>

            {/* Grid lines & Days columns */}
            {DAYS.map((day, i) => (
              <div key={day} className="flex-1 border-r border-gray-100 relative">
                {/* Horizontal grid lines */}
                {hours.slice(0, -1).map((_, j) => (
                  <div key={j} className="border-b border-gray-50 w-full" style={{ height: HOUR_HEIGHT }} />
                ))}

                {/* Blocks for this day */}
                {blocks.filter(b => b.dayIndex === i).map(b => (
                  <div
                    key={b.id}
                    className={`absolute w-[90%] left-[5%] rounded border p-1 overflow-hidden transition-all duration-200 
                      ${b.isConflict ? 'bg-red-50 border-red-500 text-red-700 shadow-sm z-10' : 
                        b.isSelected ? 'bg-brand-50 border-brand-400 border-dashed text-brand-700' : 
                        'bg-brand-500 border-brand-600 text-white shadow-sm'}`}
                    style={{ top: b.top, height: b.height }}
                  >
                    <div className="text-[10px] font-bold leading-tight">{b.course_code}</div>
                    {b.height > 30 && <div className={`text-[8px] mt-0.5 ${b.isEnrolled && !b.isConflict ? 'text-brand-100' : 'text-gray-500'}`}>{b.room_no}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
