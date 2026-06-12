const FULL_TO_ABBR = { Saturday:'Sat', Sunday:'Sun', Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri' };

/**
 * Parse a course's schedules array into a format compatible with the old interface.
 * Accepts either a schedules array (new) or a class_time string (legacy fallback).
 */
export function parseClassTime(classTimeOrSchedules) {
  // New format: array of schedule objects
  if (Array.isArray(classTimeOrSchedules)) {
    if (classTimeOrSchedules.length === 0) return null;
    const days = classTimeOrSchedules.map(s => FULL_TO_ABBR[s.day_of_week] || s.day_of_week?.substring(0, 3));
    const firstStart = parseTime(classTimeOrSchedules[0].start_time);
    const firstEnd = parseTime(classTimeOrSchedules[0].end_time);
    return {
      days,
      start: firstStart,
      end: firstEnd,
      schedules: classTimeOrSchedules,
      original: classTimeOrSchedules.map(s => `${FULL_TO_ABBR[s.day_of_week]} ${fmtTime(s.start_time)}-${fmtTime(s.end_time)}`).join(', ')
    };
  }

  // Legacy format: "Sun/Tue 10:00-11:30"
  if (typeof classTimeOrSchedules !== 'string' || !classTimeOrSchedules) return null;
  try {
    const [daysPart, timePart] = classTimeOrSchedules.split(' ');
    if (!daysPart || !timePart) return null;

    const days = daysPart.split('/');
    const [startStr, endStr] = timePart.split('-');
    if (!startStr || !endStr) return null;

    return {
      days,
      start: parseTime(startStr),
      end: parseTime(endStr),
      original: classTimeOrSchedules
    };
  } catch (e) {
    return null;
  }
}

function parseTime(str) {
  if (!str) return 0;
  const clean = str.substring(0, 5);
  const [h, m] = clean.split(':').map(Number);
  return h * 60 + (m || 0);
}

function fmtTime(t) {
  return t ? t.substring(0, 5) : '';
}

/**
 * Check if two courses conflict in schedule.
 * Works with both new schedules array and legacy class_time string.
 */
export function checkConflict(courseA, courseB) {
  const schedsA = courseA?.schedules || [];
  const schedsB = courseB?.schedules || [];

  // If both have schedules arrays, compare directly
  if (schedsA.length > 0 && schedsB.length > 0) {
    for (const a of schedsA) {
      for (const b of schedsB) {
        if (a.day_of_week !== b.day_of_week) continue;
        const aStart = parseTime(a.start_time);
        const aEnd = parseTime(a.end_time);
        const bStart = parseTime(b.start_time);
        const bEnd = parseTime(b.end_time);
        if (aStart < bEnd && bStart < aEnd) return true;
      }
    }
    return false;
  }

  // Fallback to legacy parsing
  const parsedA = parseClassTime(courseA?.class_time || courseA?.schedules);
  const parsedB = parseClassTime(courseB?.class_time || courseB?.schedules);
  if (!parsedA || !parsedB) return false;

  const overlappingDays = parsedA.days.filter(day => parsedB.days.includes(day));
  if (overlappingDays.length === 0) return false;

  if (parsedA.start < parsedB.end && parsedB.start < parsedA.end) return true;
  return false;
}
