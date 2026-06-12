-- =============================================
-- GSTU Portal — Fee & Payment Module Migration
-- =============================================

USE gstuportal;

-- TABLE: fee_structure
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

-- TABLE: payment
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

-- TABLE: payment_items
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

-- Indexes
CREATE INDEX idx_payment_student ON payment (student_id);
CREATE INDEX idx_payment_semester ON payment (semester_id, status);
CREATE INDEX idx_pi_payment ON payment_items (payment_id);
