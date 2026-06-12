INSERT INTO department (dept_id, dept_code, dept_name) VALUES
( 1, 'CSE', 'Computer Science and Engineering'),
( 2, 'EEE', 'Electrical and Electronic Engineering'),
( 3, 'ETE', 'Electronics and Telecommunication Engineering'),
( 4, 'CE',  'Civil Engineering'),
( 5, 'ACCE', 'Applied Chemistry and Chemical Engineering'),
( 6, 'FE', 'Food Engineering'),
( 7, 'BGE', 'Biotechnology and Genetic Engineering'),
( 8, 'BMB', 'Biochemistry and Molecular Biology'),
( 9, 'FMB', 'Fisheries and Marine Bioscience'),
(10, 'AGR', 'Agriculture'),
(11, 'ASVM', 'Animal Science and Veterinary Medicine'),
(12, 'PHY', 'Physics'),
(13, 'MATH', 'Mathematics'),
(14, 'STAT', 'Statistics'),
(15, 'CHE', 'Chemistry'),
(16, 'BOT', 'Botany'),
(17, 'PAD', 'Public Administration'),
(18, 'IR', 'International Relations'),
(19, 'ECO', 'Economics'),
(20, 'SOC', 'Sociology'),
(21, 'MGT', 'Management Studies'),
(22, 'FNB', 'Finance and Banking'),
(23, 'AIS', 'Accounting and Information Systems'),
(24, 'MKT', 'Marketing'),
(25, 'HIS', 'History'),
(26, 'BAN', 'Bangla'),
(27, 'ENG', 'English'),
(28, 'PS', 'Political Science'),
(29, 'PSY', 'Psycology'),
(30, 'PHAR', 'Pharmacy'),
(31, 'THM','Tourism and Hospitality Management'),
(32, 'LAW', 'Law'),
(33, 'ESD', 'Environmental Science and Disaster Management'),
(34, 'ARCH', 'Architecture');

-- 5B. ADMIN
INSERT INTO admin (name, email, password) VALUES
('Admin1', 'admin@gstuportal.com', '$2a$10$yeOoTBTqYO7cj2LTcS0gm.0RSUrU6.StMLyuNMtslIs60UyTLZtTe');

-- 5C. TEACHERS
INSERT INTO teacher
  (teacher_code, name, email, phone, password, dept_id, designation)
VALUES

-- CSE — dept_id = 1
('CSE-001','Dr. Saleh Ahmed','sumon.edu@gmail.com', '+8801717487506', '$2a$10$JO6QMgMd1PU6qPpS0fKvY.4aFY177lOk42Uib6kTmfmWyXLMLh/H.', 1,'Associate Professor'),
('CSE-002','Dr. Mrinal Kanti Baowaly', 'baowaly@gmail.com', '+8801913912066', '$2a$10$JO6QMgMd1PU6qPpS0fKvY.4aFY177lOk42Uib6kTmfmWyXLMLh/H.', 1,'Associate Professor'),
('CSE-003','Md. Monowar Hossain', 'murad0904045@gmail.com', '+8801675158031', '$2a$10$JO6QMgMd1PU6qPpS0fKvY.4aFY177lOk42Uib6kTmfmWyXLMLh/H.', 1,'Assistant Professor'),
('CSE-004','Abu Bakar Muhammad Abdullah', 'abdullahcse09@gmail.com', '+8801556321671', '$2a$10$JO6QMgMd1PU6qPpS0fKvY.4aFY177lOk42Uib6kTmfmWyXLMLh/H.', 1,'Assistant Professor'),
('CSE-005','Faruk Hossen', 'faruk.08.cse@gmail.com', '+8801743349878', '$2a$10$JO6QMgMd1PU6qPpS0fKvY.4aFY177lOk42Uib6kTmfmWyXLMLh/H.', 1,'Assistant Professor'),
('CSE-006','Dr. Saiful Islam', 'saifulcse@gmail.com', '+8801718745365', '$2a$10$JO6QMgMd1PU6qPpS0fKvY.4aFY177lOk42Uib6kTmfmWyXLMLh/H.', 1,'Associate Professor'),
('CSE-007','Md. Ferdous', 'md.ferdous.kuet@gmail.com', '+8801721250385', '$2a$10$JO6QMgMd1PU6qPpS0fKvY.4aFY177lOk42Uib6kTmfmWyXLMLh/H.', 1,'Lecturer');
