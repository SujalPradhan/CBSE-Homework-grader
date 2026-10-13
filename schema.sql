-- Only a class code and roll numbers are stored. No names, photos or contact details.
CREATE TABLE IF NOT EXISTS classes (code TEXT PRIMARY KEY, key TEXT NOT NULL, name TEXT, size INTEGER NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS predictions (code TEXT, roll INTEGER, task TEXT, value TEXT, ts INTEGER, PRIMARY KEY (code, roll, task));
CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, roll INTEGER, task TEXT, vals TEXT, ok INTEGER, ts INTEGER, meta TEXT);
CREATE INDEX IF NOT EXISTS attempts_k ON attempts (code, task, roll);
CREATE TABLE IF NOT EXISTS reveals (code TEXT, task TEXT, ts INTEGER, PRIMARY KEY (code, task));
-- Each student sets a 4-digit PIN the first time they open a task; the teacher can reset it.
CREATE TABLE IF NOT EXISTS students (code TEXT, roll INTEGER, pin TEXT, ts INTEGER, PRIMARY KEY (code, roll));
-- Limit how many classes one network can create per day (stops using the server as a free answer checker).
CREATE TABLE IF NOT EXISTS makers (ip TEXT, day TEXT, n INTEGER, PRIMARY KEY (ip, day));
-- Wrong-PIN counter per roll: after 10 wrong tries the roll is locked until the teacher resets it.
CREATE TABLE IF NOT EXISTS pinfails (code TEXT, roll INTEGER, n INTEGER, PRIMARY KEY (code, roll));
