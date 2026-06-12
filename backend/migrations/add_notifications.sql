-- Migration: Add real-time notifications table
-- Run against: gstuportal database

USE gstuportal;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT NOT NULL AUTO_INCREMENT,
  user_type ENUM('student','teacher','dept_staff','admin','all') NOT NULL,
  user_id VARCHAR(20) DEFAULT NULL,   -- NULL means broadcast to all of user_type
  dept_id INT DEFAULT NULL,           -- NULL means all departments
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','success','warning','error') DEFAULT 'info',
  link VARCHAR(300) DEFAULT NULL,     -- Optional redirect link
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  INDEX idx_notif_user (user_type, user_id, is_read),
  INDEX idx_notif_dept (dept_id, user_type),
  CONSTRAINT fk_notif_dept FOREIGN KEY (dept_id) REFERENCES department(dept_id) ON DELETE SET NULL
) ENGINE=InnoDB;
