-- ============================================================================
-- ECS740P Database Systems - MySQL Practice Environment Seed Script
-- ============================================================================

-- 1. Mile End Market App (Tutorials 2 & 3)
DROP DATABASE IF EXISTS mile_end_market;
CREATE DATABASE mile_end_market;
USE mile_end_market;

CREATE TABLE MEMBER (
    member_id VARCHAR(5) PRIMARY KEY,
    name      VARCHAR(60) NOT NULL
);

CREATE TABLE CATEGORY (
    category_id VARCHAR(5) PRIMARY KEY,
    name        VARCHAR(60) NOT NULL
);

CREATE TABLE ITEM (
    item_id     VARCHAR(5) PRIMARY KEY,
    title       VARCHAR(60) NOT NULL,
    seller_id   VARCHAR(5) NOT NULL,
    category_id VARCHAR(5),
    price       DECIMAL(6,2) NOT NULL CHECK (price >= 0),
    listed_at   DATE NOT NULL,
    FOREIGN KEY (seller_id) REFERENCES MEMBER(member_id),
    FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id)
);

CREATE TABLE SALE (
    sale_id   VARCHAR(5) PRIMARY KEY,
    item_id   VARCHAR(5) NOT NULL,
    buyer_id  VARCHAR(5) NOT NULL,
    price     DECIMAL(6,2) NOT NULL CHECK (price >= 0),
    sold_on   DATE NOT NULL,
    FOREIGN KEY (item_id) REFERENCES ITEM(item_id),
    FOREIGN KEY (buyer_id) REFERENCES MEMBER(member_id)
);

INSERT INTO MEMBER VALUES
('M1', 'Alice Smith'),
('M2', 'Bob Jones'),
('M3', 'Carol Brown'),
('M4', 'Dave Wilson');

INSERT INTO CATEGORY VALUES
('C1', 'Textbook'),
('C2', 'Electronics'),
('C3', 'Furniture'),
('C4', 'Clothing');

INSERT INTO ITEM VALUES
('I1', 'Desk lamp',           'M1', 'C3', 8.00,  DATE '2026-09-22'),
('I2', 'Database textbook',   'M3', 'C1', 25.00, DATE '2026-09-26'),
('I3', 'Calculator',          'M1', 'C2', 12.00, DATE '2026-09-25'),
('I4', 'Calculus textbook',   'M2', 'C1', 15.00, DATE '2026-09-21'),
('I5', 'Statistics textbook', 'M1', 'C1', 18.00, DATE '2026-09-27'),
('I6', 'Lab coat',            'M3', 'C4', 10.00, DATE '2026-09-24'),
('I7', 'Mystery box',         'M2', NULL, 5.00,  DATE '2026-09-29');

INSERT INTO SALE VALUES
('S1', 'I1', 'M2', 7.50,  DATE '2026-09-28'),
('S2', 'I3', 'M2', 11.00, DATE '2026-09-29'),
('S3', 'I6', 'M4', 10.00, DATE '2026-09-30');


-- 2. University & Library Database (SQL 1 Gentle Flow Lecture)
DROP DATABASE IF EXISTS university_db;
CREATE DATABASE university_db;
USE university_db;

CREATE TABLE Student (
    student_id  INTEGER PRIMARY KEY,
    name        VARCHAR(80) NOT NULL,
    programme   VARCHAR(40) NOT NULL,
    cohort_year INTEGER CHECK (cohort_year >= 2000)
);

CREATE TABLE Module (
    module_code VARCHAR(10) PRIMARY KEY,
    title       VARCHAR(120) NOT NULL,
    credits     INTEGER CHECK (credits IN (15, 30))
);

CREATE TABLE Enrolment (
    student_id  INTEGER,
    module_code VARCHAR(10),
    mark        INTEGER CHECK (mark BETWEEN 0 AND 100),
    PRIMARY KEY (student_id, module_code),
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (module_code) REFERENCES Module(module_code)
);

INSERT INTO Student VALUES
(1001, 'Amina', 'MSc DS', 2026),
(1002, 'Leo',   'MSc IS', 2025),
(1003, 'Nora',  'MSc DS', 2026);

INSERT INTO Module VALUES
('ECS7004', 'Databases',   15),
('ECS740P', 'Databases',   15),
('ECS726P', 'Data Mining', 15);

INSERT INTO Enrolment VALUES
(1001, 'ECS7004', 72),
(1002, 'ECS7004', 61),
(1003, 'ECS726P', 84);

CREATE TABLE Book (
    book_id  INTEGER PRIMARY KEY,
    title    VARCHAR(80) NOT NULL,
    category VARCHAR(20) NOT NULL,
    price    DECIMAL(6,2) CHECK (price >= 0)
);

CREATE TABLE Member (
    member_id INTEGER PRIMARY KEY,
    name      VARCHAR(60) NOT NULL
);

CREATE TABLE Loan (
    loan_id   INTEGER PRIMARY KEY,
    member_id INTEGER NOT NULL,
    book_id   INTEGER NOT NULL,
    FOREIGN KEY (member_id) REFERENCES Member(member_id),
    FOREIGN KEY (book_id) REFERENCES Book(book_id)
);

INSERT INTO Book VALUES
(101, 'Small Worlds', 'Fiction', 12.00),
(102, 'Ocean Life',   'Science', 18.00),
(103, 'Night Sky',    'Science', 15.00),
(104, 'Poems',        'Poetry',  9.00),
(105, 'City Tales',   'Fiction', NULL);

INSERT INTO Member VALUES
(1, 'Aisha'),
(2, 'Ben'),
(3, 'Chen'),
(4, 'Dina');

INSERT INTO Loan VALUES
(1, 1, 101),
(2, 1, 102),
(3, 2, 102),
(4, 3, 103),
(5, 2, 105);


-- 3. Classic Lab Tables: EMP, DEPT, SALGRADE, BONUS (Lab Exercises)
DROP DATABASE IF EXISTS lab_db;
CREATE DATABASE lab_db;
USE lab_db;

CREATE TABLE DEPT (
    DEPTNO INT PRIMARY KEY,
    DNAME  VARCHAR(14),
    LOC    VARCHAR(13)
);

CREATE TABLE EMP (
    EMPNO    INT PRIMARY KEY,
    ENAME    VARCHAR(10),
    JOB      VARCHAR(9),
    MGR      INT,
    HIREDATE DATE,
    SAL      DECIMAL(7,2),
    COMM     DECIMAL(7,2),
    DEPTNO   INT,
    FOREIGN KEY (DEPTNO) REFERENCES DEPT(DEPTNO)
);

CREATE TABLE SALGRADE (
    GRADE INT PRIMARY KEY,
    LOSAL DECIMAL(7,2),
    HISAL DECIMAL(7,2)
);

CREATE TABLE BONUS (
    ENAME VARCHAR(10),
    JOB   VARCHAR(9),
    SAL   DECIMAL(7,2),
    COMM  DECIMAL(7,2)
);

INSERT INTO DEPT VALUES
(10, 'ACCOUNTING', 'NEW YORK'),
(20, 'RESEARCH',   'DALLAS'),
(30, 'SALES',      'CHICAGO'),
(40, 'OPERATIONS', 'BOSTON');

INSERT INTO EMP VALUES
(7369, 'SMITH',  'CLERK',     7902, DATE '1980-12-17',  800.00, NULL,    20),
(7499, 'ALLEN',  'SALESMAN',  7698, DATE '1981-02-20', 1600.00,  300.00, 30),
(7521, 'WARD',   'SALESMAN',  7698, DATE '1981-02-22', 1250.00,  500.00, 30),
(7566, 'JONES',  'MANAGER',   7839, DATE '1981-04-02', 2975.00, NULL,    20),
(7654, 'MARTIN', 'SALESMAN',  7698, DATE '1981-09-28', 1250.00, 1400.00, 30),
(7698, 'BLAKE',  'MANAGER',   7839, DATE '1981-05-01', 2850.00, NULL,    30),
(7782, 'CLARK',  'MANAGER',   7839, DATE '1981-06-09', 2450.00, NULL,    10),
(7788, 'SCOTT',  'ANALYST',   7566, DATE '1982-12-09', 3000.00, NULL,    20),
(7839, 'KING',   'PRESIDENT', NULL, DATE '1981-11-17', 5000.00, NULL,    10),
(7844, 'TURNER', 'SALESMAN',  7698, DATE '1981-09-08', 1500.00,    0.00, 30),
(7876, 'ADAMS',  'CLERK',     7788, DATE '1983-01-12', 1100.00, NULL,    20),
(7900, 'JAMES',  'CLERK',     7698, DATE '1981-12-03',  950.00, NULL,    30),
(7902, 'FORD',   'ANALYST',   7566, DATE '1981-12-03', 3000.00, NULL,    20),
(7934, 'MILLER', 'CLERK',     7782, DATE '1982-01-23', 1300.00, NULL,    10);

INSERT INTO SALGRADE VALUES
(1,  700, 1200),
(2, 1201, 1400),
(3, 1401, 2000),
(4, 2001, 3000),
(5, 3001, 9999);
