const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function autoMigrate() {
  try {
    console.log('Running auto-migrations...');

    // 1. Run all CREATE TABLE statements from schema.sql first!
    // This ensures that all base tables (like department, student) exist before altering them.
    try {
      const schemaPath = path.join(__dirname, '../../schema.sql');
      let schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      // Inject IF NOT EXISTS into any CREATE TABLE that doesn't have it
      schemaSql = schemaSql.replace(/CREATE TABLE\s+(?!IF NOT EXISTS)/gi, 'CREATE TABLE IF NOT EXISTS ');

      // Split by ';' to execute them one by one.
      const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      
      for (const stmt of statements) {
        if (stmt.toUpperCase().startsWith('CREATE TABLE')) {
          try {
            await pool.query(stmt);
          } catch(err) {
            console.error('Error executing table creation:', err.message);
          }
        } else if (stmt.toUpperCase().startsWith('CREATE INDEX')) {
           try {
            await pool.query(stmt);
           } catch(err) {
             // Ignore duplicate index errors
           }
        }
      }
      console.log('Checked and created all tables from schema.sql');
    } catch (err) {
      console.error('Failed to read or parse schema.sql:', err.message);
    }

    // 2. Add new columns to 'student' table
    const studentCols = [
      { name: 'session', type: "VARCHAR(12) NOT NULL DEFAULT ''" },
      { name: 'tour_completed', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'permanent_address', type: 'TEXT DEFAULT NULL' },
      { name: 'guardian_name', type: 'VARCHAR(120) DEFAULT NULL' },
      { name: 'guardian_phone', type: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'guardian_relation', type: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'blood_group', type: 'VARCHAR(5) DEFAULT NULL' },
      { name: 'student_status', type: "VARCHAR(20) DEFAULT 'Regular'" },
      { name: 'date_of_birth', type: 'DATE DEFAULT NULL' },
      { name: 'degree', type: "VARCHAR(100) DEFAULT 'BSc. in Engg.'" },
      { name: 'hall_name', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'id_issue_date', type: 'DATE DEFAULT NULL' },
      { name: 'id_expire_date', type: 'DATE DEFAULT NULL' }
    ];

    for (const col of studentCols) {
      try {
        await pool.query(`ALTER TABLE student ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to student table`);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.error(`Error adding column ${col.name} to student:`, err.message);
        }
      }
    }

    // 3. Add new columns to 'enrollment' table
    const enrollmentCols = [
      { name: 'enrollment_type', type: "ENUM('Regular','Retake','Improvement') NOT NULL DEFAULT 'Regular'" },
      { name: 'retake_of', type: 'INT DEFAULT NULL' },
      { name: 'attempt_number', type: 'TINYINT DEFAULT 1' },
      { name: 'is_published', type: 'TINYINT(1) NOT NULL DEFAULT 0' },
      { name: 'published_at', type: 'TIMESTAMP NULL DEFAULT NULL' },
      { name: 'published_by', type: 'INT DEFAULT NULL' }
    ];

    for (const col of enrollmentCols) {
      try {
        await pool.query(`ALTER TABLE enrollment ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to enrollment table`);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.error(`Error adding column ${col.name} to enrollment:`, err.message);
        }
      }
    }

    // 4. Add course_type default to marks_config and course (just in case missing)
    try {
      await pool.query(`ALTER TABLE course MODIFY COLUMN course_type ENUM('Theory', 'Lab', 'Project', 'Thesis', 'Viva') NOT NULL`);
    } catch(err) { /* ignore */ }

    // 5. Seed marks_config if empty
    try {
      await pool.query(`INSERT IGNORE INTO marks_config (course_type, attendance_pct, assignment_pct, mid_pct, final_pct) VALUES 
        ('Theory', 10.0, 20.0, 30.0, 40.0),
        ('Lab', 10.0, 30.0, 20.0, 40.0),
        ('Project', 0.0, 40.0, 20.0, 40.0),
        ('Thesis', 0.0, 50.0, 0.0, 50.0),
        ('Viva', 0.0, 0.0, 0.0, 100.0)`);
    } catch (err) { /* ignore */ }

    console.log('Auto-migrations completed successfully.');
  } catch (err) {
    console.error('Auto-migration fatal error:', err);
  }
}

module.exports = autoMigrate;
