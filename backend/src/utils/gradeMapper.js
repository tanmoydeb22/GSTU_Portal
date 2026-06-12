/**
 * Maps numeric grade point to letter grade.
 *
 * 4.00       → A+
 * 3.75–3.99  → A
 * 3.50–3.74  → A-
 * 3.25–3.49  → B+
 * 3.00–3.24  → B
 * 2.75–2.99  → B-
 * 2.50–2.74  → C+
 * 2.25–2.49  → C
 * 2.00–2.24  → D
 * 0.00–1.99  → F
 */
function gradePointToLetter(gp) {
  if (gp === null || gp === undefined) return null;
  const point = parseFloat(gp);
  if (isNaN(point)) return null;

  if (point === 4.00) return 'A+';
  if (point >= 3.75) return 'A';
  if (point >= 3.50) return 'A-';
  if (point >= 3.25) return 'B+';
  if (point >= 3.00) return 'B';
  if (point >= 2.75) return 'B-';
  if (point >= 2.50) return 'C+';
  if (point >= 2.25) return 'C';
  if (point >= 2.00) return 'D';
  return 'F';
}

/**
 * Returns all grade tiers for reference.
 */
function getGradeScale() {
  return [
    { letter: 'A+', min: 4.00, max: 4.00 },
    { letter: 'A',  min: 3.75, max: 3.99 },
    { letter: 'A-', min: 3.50, max: 3.74 },
    { letter: 'B+', min: 3.25, max: 3.49 },
    { letter: 'B',  min: 3.00, max: 3.24 },
    { letter: 'B-', min: 2.75, max: 2.99 },
    { letter: 'C+', min: 2.50, max: 2.74 },
    { letter: 'C',  min: 2.25, max: 2.49 },
    { letter: 'D',  min: 2.00, max: 2.24 },
    { letter: 'F',  min: 0.00, max: 1.99 },
  ];
}

module.exports = { gradePointToLetter, getGradeScale };
