INSERT INTO users (name, email, password, role, active, schoolId, schoolName)
VALUES
  ('Super Admin', 'super@dilayakin.app', 'super123', 'super_admin', 1, NULL, NULL),
  ('Admin SD Negeri 1 Kranji', 'admin.kranji@dilayakin.app', 'kranji123', 'school_admin', 1, 1, 'SD NEGERI 1 KRANJI'),
  ('Admin SD Negeri 1 Sokanegara', 'admin.sokanegara@dilayakin.app', 'sokanegara123', 'school_admin', 1, 2, 'SD NEGERI 1 SOKANEGARA'),
  ('User', 'user@dilayakin.app', 'user123', 'user', 1, NULL, NULL)
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  password=VALUES(password),
  role=VALUES(role),
  active=VALUES(active),
  schoolId=VALUES(schoolId),
  schoolName=VALUES(schoolName);

INSERT INTO schools (
  id, name, district, address, contact, gps, accreditation, accreditationScore, capacity, graduationRate, avgExam,
  achievements, certifiedTeachers, rating, review, facilities, programs, extracurriculars, ratio, gallery
)
VALUES
  (
    1,
    'SD NEGERI 1 KRANJI',
    'Purwokerto Timur',
    'Jl. Jend. Sudirman Gg. Kranji No. 1, Purwokerto Timur',
    '(0281) 635-123',
    '-7.4251, 109.2432',
    'A',
    96,
    220,
    99,
    88,
    45,
    28,
    4.9,
    'Sekolah unggulan dengan program akademik dan non-akademik yang seimbang.',
    JSON_ARRAY('Lab Komputer', 'Perpustakaan Digital', 'Lapangan Olahraga Indoor'),
    JSON_ARRAY('Kelas Akselerasi', 'STEM', 'Program Kewirausahaan'),
    JSON_ARRAY('Robotik', 'Debat Bahasa Inggris', 'Orkestra'),
    '1:15',
    JSON_ARRAY('Foto Gedung', 'Foto Lab', 'Foto Kegiatan')
  ),
  (
    2,
    'SD NEGERI 1 SOKANEGARA',
    'Purwokerto Timur',
    'Jl. Dr. Soeparno No. 5, Sokanegara, Purwokerto Timur',
    '(0281) 632-789',
    '-7.4195, 109.2598',
    'A',
    94,
    200,
    97,
    86,
    38,
    25,
    4.8,
    'Lingkungan belajar yang nyaman dengan fokus pada pengembangan karakter.',
    JSON_ARRAY('Perpustakaan', 'Aula Serbaguna', 'Taman Belajar'),
    JSON_ARRAY('Pendidikan Karakter', 'Literasi', 'Seni dan Budaya'),
    JSON_ARRAY('Pramuka', 'Tari Tradisional', 'Paduan Suara'),
    '1:18',
    JSON_ARRAY('Foto Sekolah', 'Foto Perpustakaan', 'Foto Ekstrakurikuler')
  )
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  district=VALUES(district),
  address=VALUES(address),
  contact=VALUES(contact),
  gps=VALUES(gps),
  accreditation=VALUES(accreditation),
  accreditationScore=VALUES(accreditationScore),
  capacity=VALUES(capacity),
  graduationRate=VALUES(graduationRate),
  avgExam=VALUES(avgExam),
  achievements=VALUES(achievements),
  certifiedTeachers=VALUES(certifiedTeachers),
  rating=VALUES(rating),
  review=VALUES(review),
  facilities=VALUES(facilities),
  programs=VALUES(programs),
  extracurriculars=VALUES(extracurriculars),
  ratio=VALUES(ratio),
  gallery=VALUES(gallery);

INSERT INTO activity_logs (actorName, actorEmail, actorRole, type, description)
VALUES
  ('Super Admin', 'super@dilayakin.app', 'super_admin', 'login', 'Super Admin berhasil login'),
  ('Admin SD Negeri 1 Kranji', 'admin.kranji@dilayakin.app', 'school_admin', 'login', 'Admin SD Negeri 1 Kranji berhasil login')
ON DUPLICATE KEY UPDATE id=id;

