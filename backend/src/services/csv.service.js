const Papa = require('papaparse');
const fs = require('fs');

/**
 * Parse a CSV file and return structured data with validation.
 *
 * @param {string} filePath - Path to the CSV file
 * @param {string[]} requiredFields - List of required column headers
 * @returns {{ data: object[], errors: object[], meta: object }}
 */
function parseCSV(filePath, requiredFields = []) {
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  const errors = [];

  // Check required fields
  if (requiredFields.length > 0) {
    const headers = result.meta.fields || [];
    const missingFields = requiredFields.filter(f => !headers.includes(f));
    if (missingFields.length > 0) {
      errors.push({
        row: 0,
        type: 'MissingFields',
        message: `Missing required columns: ${missingFields.join(', ')}`,
      });
    }
  }

  // Validate each row
  result.data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field] || String(row[field]).trim() === '') {
        errors.push({
          row: index + 2, // +2 because header is row 1, data starts at row 2
          type: 'MissingValue',
          field,
          message: `Row ${index + 2}: Missing value for "${field}"`,
        });
      }
    });
  });

  // Add PapaParse errors
  if (result.errors.length > 0) {
    result.errors.forEach(e => {
      errors.push({
        row: e.row ? e.row + 2 : 0,
        type: 'ParseError',
        message: e.message,
      });
    });
  }

  return {
    data: result.data,
    errors,
    meta: result.meta,
    totalRows: result.data.length,
    errorCount: errors.length,
  };
}

/**
 * Validate student CSV data.
 */
function validateStudentCSV(filePath) {
  return parseCSV(filePath, [
    'student_id', 'name', 'email', 'phone', 'batch', 'session', 'level', 'term',
  ]);
}

/**
 * Validate teacher CSV data.
 */
function validateTeacherCSV(filePath) {
  return parseCSV(filePath, [
    'teacher_code', 'name', 'email', 'designation',
  ]);
}

/**
 * Clean up uploaded file.
 */
function removeUploadedFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('Failed to remove uploaded file:', err.message);
  }
}

module.exports = { parseCSV, validateStudentCSV, validateTeacherCSV, removeUploadedFile };
