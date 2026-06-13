-- Database is provided by Aiven as 'defaultdb'

-- TABLE 1: department
CREATE TABLE department (
  dept_id   INT          NOT NULL AUTO_INCREMENT,
  dept_code VARCHAR(15)  NOT NULL,
  dept_name VARCHAR(150) NOT NULL,
  PRIMARY KEY (dept_id),
  UNIQUE KEY uq_dept_code (dept_code)
) ENGINE=InnoDB;


-- TABLE 2: admin
CREATE TABLE admin (
  admin_id   INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'super_admin',
  created_by INT          DEFAULT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id),
  UNIQUE KEY uq_admin_email (email),
  CONSTRAINT fk_admin_created_by FOREIGN KEY (created_by) REFERENCES admin(admin_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- TABLE 3: dept_staff
CREATE TABLE dept_staff (
  staff_id             INT          NOT NULL AUTO_INCREMENT,
  staff_code           VARCHAR(20)  NOT NULL,
  name                 VARCHAR(120) NOT NULL,
  email                VARCHAR(150) NOT NULL,
  phone                VARCHAR(20)           DEFAULT NULL,
  password             VARCHAR(255) NOT NULL,
  dept_id              INT          NOT NULL,
  designation          VARCHAR(100) DEFAULT 'Section Officer',
  last_login           TIMESTAMP    NULL DEFAULT NULL,
  login_count          INT          DEFAULT 0,
  login_attempts       INT          DEFAULT 0,
  locked_until         TIMESTAMP    NULL DEFAULT NULL,
  is_active            TINYINT(1)   NOT NULL DEFAULT 1,
  must_change_password TINYINT(1)   NOT NULL DEFAULT 1,
  login_attempts       INT          DEFAULT 0,
  locked_until         TIMESTAMP    NULL DEFAULT NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (staff_id),
  UNIQUE KEY uq_staff_code  (staff_code),
  UNIQUE KEY uq_staff_email (email),
  CONSTRAINT fk_staff_dept
    FOREIGN KEY (dept_id) REFERENCES department (dept_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;


-- TABLE 4: teacher
CREATE TABLE teacher (
  teacher_id           INT          NOT NULL AUTO_INCREMENT,
  teacher_code         VARCHAR(20)  NOT NULL,
  name                 VARCHAR(120) NOT NULL,
  email                VARCHAR(150) NOT NULL,
  phone                VARCHAR(20)           DEFAULT NULL,
  password             VARCHAR(255) NOT NULL,
  dept_id              INT          NOT NULL,
  designation          VARCHAR(80)  NOT NULL DEFAULT 'Lecturer',
  is_active            TINYINT(1)   NOT NULL DEFAULT 1,
  must_change_password TINYINT(1)   NOT NULL DEFAULT 1,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (teacher_id),
  UNIQUE KEY uq_teacher_code  (teacher_code),
  UNIQUE KEY uq_teacher_email (email),
  CONSTRAINT fk_teacher_dept
    FOREIGN KEY (dept_id) REFERENCES department (dept_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;


-- TABLE 5: student
CREATE TABLE student (
  student_id             VARCHAR(20)  NOT NULL,
  name                   VARCHAR(120) NOT NULL,
  email                  VARCHAR(150) NOT NULL,
  phone                  VARCHAR(20)  DEFAULT NULL,
  password               VARCHAR(255) NOT NULL,
  dept_id                INT          NOT NULL,
  batch                  YEAR         NOT NULL,
  session                VARCHAR(12)  NOT NULL,
  level                  TINYINT      NOT NULL,
  term                   TINYINT      NOT NULL,
  cgpa                   DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  total_credit_completed DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  address                TEXT                  DEFAULT NULL,
  login_attempts         INT                   DEFAULT 0,
  locked_until           TIMESTAMP             NULL DEFAULT NULL,
  is_active              TINYINT(1)   NOT NULL DEFAULT 1,
  must_change_password   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id),
  UNIQUE KEY uq_student_email (email),
  CONSTRAINT fk_student_dept
    FOREIGN KEY (dept_id) REFERENCES department (dept_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_student_level CHECK (level BETWEEN 1 AND 4),
  CONSTRAINT chk_student_term  CHECK (term  BETWEEN 1 AND 2),
  CONSTRAINT chk_student_cgpa  CHECK (cgpa  BETWEEN 0.00 AND 4.00)
) ENGINE=InnoDB;

-- TABLE 6: course
CREATE TABLE course (
  course_id     INT          NOT NULL AUTO_INCREMENT,
  course_code   VARCHAR(20)  NOT NULL,
  course_name   VARCHAR(180) NOT NULL,
  credit        DECIMAL(3,1) NOT NULL,
  dept_id       INT          NOT NULL,
  offered_level TINYINT      NOT NULL,
  offered_term  TINYINT      NOT NULL,
  course_type   ENUM('Theory','Lab','Project','Thesis') NOT NULL DEFAULT 'Theory',
  description   TEXT                  DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id),
  UNIQUE KEY uq_course_code (course_code),
  CONSTRAINT fk_course_dept
    FOREIGN KEY (dept_id) REFERENCES department (dept_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_course_credit CHECK (credit > 0),
  CONSTRAINT chk_course_level  CHECK (offered_level BETWEEN 1 AND 4),
  CONSTRAINT chk_course_term   CHECK (offered_term  BETWEEN 1 AND 2)
) ENGINE=InnoDB;

-- TABLE 7: semester
CREATE TABLE semester (
  semester_id   INT          NOT NULL AUTO_INCREMENT,
  dept_id       INT          NOT NULL,
  academic_year VARCHAR(10)  NOT NULL,
  level         TINYINT      NOT NULL,
  term          TINYINT      NOT NULL,
  reg_start     DATE         NOT NULL,
  reg_end       DATE         NOT NULL,
  min_credit    DECIMAL(3,1) NOT NULL DEFAULT  9.0,
  max_credit    DECIMAL(3,1) NOT NULL DEFAULT 24.0,
  result_published_at TIMESTAMP NULL DEFAULT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (semester_id),
  UNIQUE KEY uq_semester (dept_id, academic_year, level, term),
  CONSTRAINT fk_semester_dept
    FOREIGN KEY (dept_id) REFERENCES department (dept_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_sem_level   CHECK (level BETWEEN 1 AND 4),
  CONSTRAINT chk_sem_term    CHECK (term  BETWEEN 1 AND 2),
  CONSTRAINT chk_sem_credits CHECK (min_credit > 0 AND min_credit < max_credit),
  CONSTRAINT chk_sem_dates   CHECK (reg_end > reg_start)
) ENGINE=InnoDB;


-- TABLE 8: course_offering
CREATE TABLE course_offering (
  offering_id INT         NOT NULL AUTO_INCREMENT,
  course_id   INT         NOT NULL,
  semester_id INT         NOT NULL,
  teacher_id  INT                  DEFAULT NULL,
  class_time  VARCHAR(80)          DEFAULT NULL,
  room_no     VARCHAR(30)          DEFAULT NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (offering_id),
  UNIQUE KEY uq_offering (course_id, semester_id),
  CONSTRAINT fk_offering_course
    FOREIGN KEY (course_id)   REFERENCES course    (course_id)   ON UPDATE CASCADE,
  CONSTRAINT fk_offering_semester
    FOREIGN KEY (semester_id) REFERENCES semester   (semester_id) ON UPDATE CASCADE,
  CONSTRAINT fk_offering_teacher
    FOREIGN KEY (teacher_id)  REFERENCES teacher    (teacher_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- TABLE 9: enrollment
CREATE TABLE enrollment (
  enrollment_id INT          NOT NULL AUTO_INCREMENT,
  student_id    VARCHAR(20)  NOT NULL,
  offering_id   INT          NOT NULL,
  level         TINYINT      NOT NULL,
  term          TINYINT      NOT NULL,
  status        ENUM('Registered','Dropped','Completed') NOT NULL DEFAULT 'Registered',
  grade_point   DECIMAL(3,2)          DEFAULT NULL,
  grade_letter  VARCHAR(5)            DEFAULT NULL,
  registered_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (enrollment_id),
  UNIQUE KEY uq_student_offering (student_id, offering_id),
  CONSTRAINT fk_enroll_student
    FOREIGN KEY (student_id)  REFERENCES student         (student_id) ON UPDATE CASCADE,
  CONSTRAINT fk_enroll_offering
    FOREIGN KEY (offering_id) REFERENCES course_offering (offering_id) ON UPDATE CASCADE,
  CONSTRAINT chk_grade_point
    CHECK (grade_point IS NULL OR grade_point BETWEEN 0.00 AND 4.00)
) ENGINE=InnoDB;


-- TABLE 10: password_reset_tokens
CREATE TABLE password_reset_tokens (
  token_id   INT          NOT NULL AUTO_INCREMENT,
  user_type  ENUM('student','teacher','dept_staff','admin') NOT NULL,
  user_id    VARCHAR(20)  NOT NULL,
  token      VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  used       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_id),
  UNIQUE KEY uq_token (token)
) ENGINE=InnoDB;

-- SECTION 2 — INDEXES
CREATE INDEX idx_enroll_student_status ON enrollment      (student_id, status);
CREATE INDEX idx_enroll_offering        ON enrollment      (offering_id);
CREATE INDEX idx_course_dept_level_term ON course          (dept_id, offered_level, offered_term);
CREATE INDEX idx_semester_dept_active   ON semester        (dept_id, is_active);
CREATE INDEX idx_offering_semester      ON course_offering (semester_id);
CREATE INDEX idx_offering_teacher       ON course_offering (teacher_id);
CREATE INDEX idx_teacher_code           ON teacher         (teacher_code);
CREATE INDEX idx_teacher_dept           ON teacher         (dept_id);
CREATE INDEX idx_staff_dept             ON dept_staff      (dept_id);
CREATE INDEX idx_student_dept_batch     ON student         (dept_id, batch);

-- View 1: Full student transcript 
CREATE OR REPLACE VIEW vw_student_transcript AS
SELECT
  e.enrollment_id,
  e.student_id,
  s.name                       AS student_name,
  d.dept_code,
  d.dept_name,
  e.level,
  e.term,
  sem.academic_year,
  c.course_code,
  c.course_name,
  c.credit,
  c.course_type,
  COALESCE(t.name,  'TBA')     AS teacher_name,
  COALESCE(t.teacher_code,'')  AS teacher_code,
  co.class_time,
  co.room_no,
  e.grade_point,
  e.grade_letter,
  e.status,
  e.registered_at
FROM enrollment           e
JOIN student              s   ON e.student_id   = s.student_id
JOIN department           d   ON s.dept_id      = d.dept_id
JOIN course_offering      co  ON e.offering_id  = co.offering_id
JOIN course               c   ON co.course_id   = c.course_id
JOIN semester             sem ON co.semester_id = sem.semester_id
LEFT JOIN teacher         t   ON co.teacher_id  = t.teacher_id;

-- View 2: Available courses for student registration page
CREATE OR REPLACE VIEW vw_available_courses AS
SELECT
  co.offering_id,
  co.semester_id,
  sem.academic_year,
  sem.level        AS sem_level,
  sem.term         AS sem_term,
  sem.dept_id,
  sem.min_credit,
  sem.max_credit,
  sem.reg_start,
  sem.reg_end,
  c.course_id,
  c.course_code,
  c.course_name,
  c.credit,
  c.course_type,
  c.description,
  COALESCE(t.name, 'TBA')         AS teacher_name,
  COALESCE(t.designation, '')     AS teacher_designation,
  co.class_time,
  co.room_no
FROM course_offering co
JOIN semester    sem ON co.semester_id = sem.semester_id
JOIN course      c   ON co.course_id   = c.course_id
LEFT JOIN teacher t  ON co.teacher_id  = t.teacher_id
WHERE sem.is_active = 1;

-- View 3: Teacher course dashboard
CREATE OR REPLACE VIEW vw_teacher_courses AS
SELECT
  co.offering_id,
  co.teacher_id,
  t.name AS teacher_name,
  t.teacher_code,
  c.course_code,
  c.course_name,
  c.credit,
  c.course_type,
  sem.academic_year,
  sem.level,
  sem.term,
  sem.is_active,
  d.dept_code,
  co.class_time,
  co.room_no,
  COUNT(e.enrollment_id)                     AS enrolled_count,
  SUM(CASE WHEN e.grade_point IS NULL
           AND  e.status = 'Registered'
           THEN 1 ELSE 0 END)                AS pending_grades
FROM course_offering co
JOIN teacher         t   ON co.teacher_id  = t.teacher_id
JOIN course          c   ON co.course_id   = c.course_id
JOIN semester        sem ON co.semester_id = sem.semester_id
JOIN department      d   ON sem.dept_id    = d.dept_id
LEFT JOIN enrollment e   ON co.offering_id = e.offering_id
                        AND e.status != 'Dropped'
GROUP BY
  co.offering_id, co.teacher_id, t.name, t.teacher_code,
  c.course_code, c.course_name, c.credit, c.course_type,
  sem.academic_year, sem.level, sem.term, sem.is_active,
  d.dept_code, co.class_time, co.room_no;

-- View 4: Dept staff grade entry
CREATE OR REPLACE VIEW vw_dept_grade_entry AS
SELECT
  e.enrollment_id,
  e.student_id,
  s.name                   AS student_name,
  s.batch,
  e.level,
  e.term,
  c.course_code,
  c.course_name,
  c.credit,
  co.offering_id,
  COALESCE(t.name, 'TBA')  AS teacher_name,
  sem.academic_year,
  sem.dept_id,
  e.grade_point,
  e.grade_letter,
  e.status
FROM enrollment           e
JOIN student              s   ON e.student_id   = s.student_id
JOIN course_offering      co  ON e.offering_id  = co.offering_id
JOIN course               c   ON co.course_id   = c.course_id
JOIN semester             sem ON co.semester_id = sem.semester_id
LEFT JOIN teacher         t   ON co.teacher_id  = t.teacher_id
WHERE e.status = 'Registered';

-- View 5: Admin enrollment report
CREATE OR REPLACE VIEW vw_enrollment_report AS SELECT e.enrollment_id, e.student_id, s.name as student_name, c.course_code, c.course_name, co.semester_id, e.status, e.registered_at FROM enrollment e JOIN student s ON e.student_id = s.student_id JOIN course_offering co ON e.offering_id = co.offering_id JOIN course c ON co.course_id = c.course_id;

-- SECTION 4 — TRIGGER
DELIMITER $$

CREATE TRIGGER trg_recalculate_cgpa
AFTER UPDATE ON enrollment
FOR EACH ROW
BEGIN
  IF NEW.grade_point IS NOT NULL AND NEW.status = 'Completed' THEN
    UPDATE student
    SET
      cgpa = (
        SELECT ROUND(
          SUM(e2.grade_point * c2.credit) / NULLIF(SUM(c2.credit), 0), 2
        )
        FROM enrollment      e2
        JOIN course_offering co2 ON e2.offering_id = co2.offering_id
        JOIN course          c2  ON co2.course_id  = c2.course_id
        WHERE e2.student_id  = NEW.student_id
          AND e2.status      = 'Completed'
          AND e2.grade_point IS NOT NULL
      ),
      total_credit_completed = (
        SELECT COALESCE(SUM(c2.credit), 0)
        FROM enrollment      e2
        JOIN course_offering co2 ON e2.offering_id = co2.offering_id
        JOIN course          c2  ON co2.course_id  = c2.course_id
        WHERE e2.student_id  = NEW.student_id
          AND e2.status      = 'Completed'
          AND e2.grade_point IS NOT NULL
      )
    WHERE student_id = NEW.student_id;
  END IF;
END$$

DELIMITER ;





-- ADDITIONAL TABLES --

CREATE TABLE IF NOT EXISTS notice (
  notice_id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_audience ENUM('All', 'Students', 'Teachers', 'Staff') NOT NULL DEFAULT 'All',
  published_by INT NOT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notice_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS active_sessions (
  session_id VARCHAR(100) NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  browser_name VARCHAR(50),
  browser_version VARCHAR(50),
  os_name VARCHAR(50),
  os_version VARCHAR(50),
  device_type VARCHAR(50),
  device_vendor VARCHAR(50),
  user_agent TEXT,
  ip_address VARCHAR(50),
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_history (
  history_id INT NOT NULL AUTO_INCREMENT,
  user_type VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  browser_name VARCHAR(50),
  browser_version VARCHAR(50),
  os_name VARCHAR(50),
  os_version VARCHAR(50),
  device_type VARCHAR(50),
  ip_address VARCHAR(50),
  status VARCHAR(20),
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (history_id)
) ENGINE=InnoDB;








CREATE TABLE IF NOT EXISTS fee_structure (
  fee_id          INT            NOT NULL AUTO_INCREMENT,
  dept_id         INT            NOT NULL,
  level           TINYINT        NOT NULL,
  term            TINYINT        NOT NULL,
  base_amount     DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  per_course_fixed DECIMAL(10,2) NOT NULL DEFAULT 110.00,
  per_credit_fee  DECIMAL(10,2)  NOT NULL DEFAULT 80.00,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fee_id),
  UNIQUE KEY uq_fee (dept_id, level, term),
  CONSTRAINT fk_fee_dept FOREIGN KEY (dept_id) REFERENCES department(dept_id) ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment (
  payment_id       INT            NOT NULL AUTO_INCREMENT,
  student_id       VARCHAR(20)    NOT NULL,
  semester_id      INT            NOT NULL,
  base_amount      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  extra_fixed      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  extra_credit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount     DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  status           ENUM('Unpaid','Pending','Paid','Failed') NOT NULL DEFAULT 'Unpaid',
  gateway          VARCHAR(50)    DEFAULT NULL,
  transaction_id   VARCHAR(100)   DEFAULT NULL,
  gateway_ref      VARCHAR(100)   DEFAULT NULL,
  paid_at          TIMESTAMP      NULL DEFAULT NULL,
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payment (student_id, semester_id),
  CONSTRAINT fk_payment_student  FOREIGN KEY (student_id)  REFERENCES student(student_id)  ON UPDATE CASCADE,
  CONSTRAINT fk_payment_semester FOREIGN KEY (semester_id) REFERENCES semester(semester_id) ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_items (
  item_id     INT           NOT NULL AUTO_INCREMENT,
  payment_id  INT           NOT NULL,
  offering_id INT           NOT NULL,
  course_code VARCHAR(20)   NOT NULL,
  credit      DECIMAL(3,1)  NOT NULL,
  item_type   ENUM('Regular','Retake','Improvement') NOT NULL DEFAULT 'Regular',
  PRIMARY KEY (item_id),
  CONSTRAINT fk_pi_payment  FOREIGN KEY (payment_id)  REFERENCES payment(payment_id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_offering FOREIGN KEY (offering_id) REFERENCES course_offering(offering_id) ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_payment_student ON payment (student_id);
CREATE INDEX idx_payment_semester ON payment (semester_id, status);
CREATE INDEX idx_pi_payment ON payment_items (payment_id);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT NOT NULL AUTO_INCREMENT,
  user_type ENUM('student','teacher','dept_staff','admin','all') NOT NULL,
  user_id VARCHAR(20) DEFAULT NULL,   
  dept_id INT DEFAULT NULL,           
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','success','warning','error') DEFAULT 'info',
  link VARCHAR(300) DEFAULT NULL,     
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  INDEX idx_notif_user (user_type, user_id, is_read),
  INDEX idx_notif_dept (dept_id, user_type),
  CONSTRAINT fk_notif_dept FOREIGN KEY (dept_id) REFERENCES department(dept_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grading_scale (
  scale_id INT NOT NULL AUTO_INCREMENT,
  grade_letter VARCHAR(5) NOT NULL,
  grade_point DECIMAL(3,2) NOT NULL,
  min_marks DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (scale_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS marks_config (
  config_id INT NOT NULL AUTO_INCREMENT,
  course_type ENUM('Theory','Lab','Project','Thesis') NOT NULL,
  attendance_max INT NOT NULL DEFAULT 10,
  assignment_max INT NOT NULL DEFAULT 20,
  mid_max INT NOT NULL DEFAULT 30,
  final_max INT NOT NULL DEFAULT 40,
  PRIMARY KEY (config_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_log (
  log_id INT NOT NULL AUTO_INCREMENT,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  user_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_schedule (
  schedule_id INT NOT NULL AUTO_INCREMENT,
  offering_id INT NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  room_no VARCHAR(50) NOT NULL,
  PRIMARY KEY (schedule_id),
  CONSTRAINT fk_cs_offering FOREIGN KEY (offering_id) REFERENCES course_offering(offering_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS marks_breakdown (
  breakdown_id INT NOT NULL AUTO_INCREMENT,
  enrollment_id INT NOT NULL,
  attendance DECIMAL(5,2) DEFAULT 0,
  assignment DECIMAL(5,2) DEFAULT 0,
  mid DECIMAL(5,2) DEFAULT 0,
  final DECIMAL(5,2) DEFAULT 0,
  total_marks DECIMAL(5,2) DEFAULT 0,
  PRIMARY KEY (breakdown_id),
  UNIQUE KEY uq_mb_enrollment (enrollment_id),
  CONSTRAINT fk_mb_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollment(enrollment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grade_audit (
  audit_id INT NOT NULL AUTO_INCREMENT,
  enrollment_id INT NOT NULL,
  changed_by VARCHAR(50) NOT NULL,
  old_grade_point DECIMAL(3,2),
  new_grade_point DECIMAL(3,2),
  old_grade_letter VARCHAR(5),
  new_grade_letter VARCHAR(5),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  CONSTRAINT fk_ga_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollment(enrollment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exam_committee (
  id INT NOT NULL AUTO_INCREMENT,
  semester_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  role VARCHAR(100) NOT NULL,
  member_type VARCHAR(50) NOT NULL,
  sl_no INT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_ec_semester FOREIGN KEY (semester_id) REFERENCES semester(semester_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_id INT NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(50) NOT NULL,
  token VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_id),
  UNIQUE KEY uq_reset_token (token)
) ENGINE=InnoDB;
