const pool = require('../config/db');

/**
 * Attach schedules array to each row that has an offering_id.
 * Mutates rows in place and returns them.
 */
async function attachSchedules(rows) {
  if (!rows || rows.length === 0) return rows;

  const offeringIds = [...new Set(rows.map(r => r.offering_id).filter(Boolean))];
  if (offeringIds.length === 0) return rows;

  const [schedules] = await pool.query(
    `SELECT schedule_id, offering_id, day_of_week, start_time, end_time, room_no, building
     FROM course_schedule
     WHERE offering_id IN (?)
     ORDER BY FIELD(day_of_week, 'Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'), start_time`,
    [offeringIds]
  );

  const scheduleMap = {};
  schedules.forEach(s => {
    if (!scheduleMap[s.offering_id]) scheduleMap[s.offering_id] = [];
    scheduleMap[s.offering_id].push(s);
  });

  rows.forEach(r => {
    r.schedules = scheduleMap[r.offering_id] || [];
  });

  return rows;
}

module.exports = { attachSchedules };
