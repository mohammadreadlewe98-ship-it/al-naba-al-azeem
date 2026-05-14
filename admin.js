// ==========================================
// النبأ العظيم - لوحة التحكم الإدارية
// ==========================================

let adminToken = null;
let adminStudents = [];
let adminTeachers = [];
let adminAdmins = [];
let attendanceData = {};

// ==========================================
// تسجيل الدخول
// ==========================================
async function doLogin() {
  const password = document.getElementById('adminPassword').value;
  if (!password) { adminToast('أدخل كلمة المرور', 'warning'); return; }
  
  try {
    const url = `${CONFIG.API_URL}?action=verifyAdmin&password=${encodeURIComponent(password)}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.success) {
      adminToken = data.token;
      sessionStorage.setItem('adminToken', adminToken);
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
      initAdminPanel();
    } else {
      adminToast('كلمة المرور غير صحيحة', 'error');
    }
  } catch(err) {
    adminToast('خطأ في الاتصال', 'error');
  }
}

function doLogout() {
  adminToken = null;
  sessionStorage.removeItem('adminToken');
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
}

// تحقق من الجلسة المحفوظة
document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('adminToken');
  if (saved) {
    adminToken = saved;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    initAdminPanel();
  }
  
  // إظهار زر القائمة في الموبايل
  if (window.innerWidth <= 768) {
    document.getElementById('menuToggle').style.display = 'block';
  }
});

function initAdminPanel() {
  loadAdminStats();
  loadAllTeachers();
  updateLastUpdate();
  
  // تحديث تلقائي كل دقيقة
  setInterval(() => {
    loadAdminStats();
    updateLastUpdate();
  }, 60000);
}

function updateLastUpdate() {
  const el = document.getElementById('lastUpdate');
  if (el) el.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-SA');
}

// ==========================================
// API Calls
// ==========================================
async function adminApiGet(params) {
  showAdminLoader(true);
  try {
    const url = new URL(CONFIG.API_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    const res = await fetch(url.toString());
    return await res.json();
  } catch(err) {
    adminToast('خطأ في الاتصال', 'error');
    return {success: false};
  } finally {
    showAdminLoader(false);
  }
}

async function adminApiPost(data) {
  showAdminLoader(true);
  try {
    data.adminToken = adminToken;
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch(err) {
    adminToast('خطأ في الاتصال', 'error');
    return {success: false};
  } finally {
    showAdminLoader(false);
  }
}

// ==========================================
// Dashboard
// ==========================================
async function loadAdminStats() {
  const result = await adminApiGet({action: 'getStats'});
  if (!result.success) return;
  
  const stats = result.stats;
  document.getElementById('adminStatsGrid').innerHTML = `
    <div class="stat-card fade-in">
      <div class="stat-icon">👨‍🎓</div>
      <div class="stat-info">
        <h3>${stats.totalStudents || 0}</h3>
        <p>إجمالي الطلاب</p>
        <small style="color:var(--success)">${stats.activeStudents || 0} نشط</small>
      </div>
    </div>
    <div class="stat-card green fade-in">
      <div class="stat-icon">👨‍🏫</div>
      <div class="stat-info">
        <h3>${stats.totalTeachers || 0}</h3>
        <p>إجمالي المعلمين</p>
        <small style="color:var(--success)">${stats.activeTeachers || 0} نشط</small>
      </div>
    </div>
    <div class="stat-card gold fade-in">
      <div class="stat-icon">👔</div>
      <div class="stat-info">
        <h3>${stats.totalAdmins || 0}</h3>
        <p>الإداريون</p>
      </div>
    </div>
    <div class="stat-card fade-in">
      <div class="stat-icon">✅</div>
      <div class="stat-info">
        <h3>${stats.attendanceRate || 0}%</h3>
        <p>نسبة الحضور</p>
        <small>${stats.totalPresent || 0} / ${(stats.totalPresent||0)+(stats.totalAbsent||0)}</small>
      </div>
    </div>
  `;
  
  renderAdminRegionsGrid(stats.regionStats);
}

function renderAdminRegionsGrid(regionStats) {
  const grid = document.getElementById('adminRegionsGrid');
  const icons = {'دمشق':'🏛️','ريف دمشق':'🌿','حمص':'🏙️','حماة':'⚙️','دير الزور':'🌊','إدلب':'🌺','درعا':'🌾'};
  
  grid.innerHTML = CONFIG.REGIONS.map(region => {
    const s = regionStats[region] || {};
    return `
      <div class="region-card fade-in">
        <div class="region-card-header">
          <h3>${icons[region]||'📍'} ${region}</h3>
        </div>
        <div class="region-card-body">
          <div class="region-stat"><div class="num">${s.students||0}</div><div class="lbl">طالب</div></div>
          <div class="region-stat"><div class="num" style="color:var(--secondary)">${s.teachers||0}</div><div class="lbl">معلم</div></div>
          <div class="region-stat"><div class="num" style="color:var(--gold)">${s.admins||0}</div><div class="lbl">إداري</div></div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// إدارة الطلاب
// ==========================================
async function adminLoadStudents() {
  const region = document.getElementById('adminStudentRegion').value;
  const result = await adminApiGet({action: 'getStudents', region});
  if (!result.success) return;
  adminStudents = result.data;
  renderAdminStudents(adminStudents);
}

function renderAdminStudents(students) {
  const wrapper = document.getElementById('adminStudentsTable');
  if (!students.length) {
    wrapper.innerHTML = `<div class="loading"><p>لا توجد بيانات. أضف طلاباً جدداً.</p></div>`;
    return;
  }
  
  const rows = students.map(s => `
    <tr>
      <td><code style="font-size:11px">${s['المعرف']||'-'}</code></td>
      <td><strong>${s['الاسم']||'-'}</strong></td>
      <td>${s['الجنس']||'-'}</td>
      <td><span style="background:#EBF5FB;padding:3px 10px;border-radius:20px;font-size:12px;color:var(--primary)">📍${s['المنطقة']||'-'}</span></td>
      <td>${s['اسم المعلم']||'-'}</td>
      <td>${s['المستوى']||'-'}</td>
      <td><span class="status-badge ${s['الحالة']==='نشط'?'status-active':'status-inactive'}">${s['الحالة']||'-'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editStudent('${s['المعرف']}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="confirmDelete('student','${s['المعرف']}','${s['الاسم']}')">🗑️</button>
      </td>
    </tr>
  `).join('');
  
  wrapper.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>الرقم</th><th>الاسم</th><th>الجنس</th><th>المنطقة</th><th>المعلم</th><th>المستوى</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:15px 20px;color:var(--text-gray);font-size:13px">الإجمالي: <strong>${students.length}</strong></div>
  `;
}

function filterAdminStudents() {
  const q = document.getElementById('adminStudentSearch').value.toLowerCase();
  const filtered = adminStudents.filter(s =>
    (s['الاسم']||'').toLowerCase().includes(q) ||
    (s['المنطقة']||'').toLowerCase().includes(q) ||
    (s['اسم المعلم']||'').toLowerCase().includes(q)
  );
  renderAdminStudents(filtered);
}

function openAddStudentModal() {
  clearStudentForm();
  document.getElementById('studentModalTitle').textContent = '➕ إضافة طالب جديد';
  document.getElementById('studentId').value = '';
  openAdminModal('studentModal');
}

function editStudent(id) {
  const s = adminStudents.find(s => s['المعرف'] === id);
  if (!s) return;
  
  document.getElementById('studentModalTitle').textContent = '✏️ تعديل بيانات الطالب';
  document.getElementById('studentId').value = id;
  document.getElementById('studentName').value = s['الاسم'] || '';
  document.getElementById('studentGender').value = s['الجنس'] || '';
  document.getElementById('studentRegion').value = s['المنطقة'] || '';
  document.getElementById('studentLevel').value = s['المستوى'] || '';
  document.getElementById('studentPhone').value = s['الهاتف'] || '';
  document.getElementById('studentParentPhone').value = s['هاتف ولي الأمر'] || '';
  document.getElementById('studentAddress').value = s['العنوان'] || '';
  document.getElementById('studentStatus').value = s['الحالة'] || 'نشط';
  document.getElementById('studentNotes').value = s['ملاحظات'] || '';
  
  // تعيين المعلم
  const teacherSelect = document.getElementById('studentTeacher');
  teacherSelect.value = s['معرف المعلم'] || '';
  
  openAdminModal('studentModal');
}

async function saveStudent() {
  const id = document.getElementById('studentId').value;
  const name = document.getElementById('studentName').value.trim();
  const region = document.getElementById('studentRegion').value;
  
  if (!name) { adminToast('اسم الطالب مطلوب', 'warning'); return; }
  if (!region) { adminToast('المنطقة مطلوبة', 'warning'); return; }
  
  const teacherSelect = document.getElementById('studentTeacher');
  const teacherOption = teacherSelect.options[teacherSelect.selectedIndex];
  
  const data = {
    action: id ? 'updateStudent' : 'addStudent',
    id, name, region,
    gender: document.getElementById('studentGender').value,
    level: document.getElementById('studentLevel').value,
    phone: document.getElementById('studentPhone').value,
    parentPhone: document.getElementById('studentParentPhone').value,
    address: document.getElementById('studentAddress').value,
    status: document.getElementById('studentStatus').value,
    notes: document.getElementById('studentNotes').value,
    teacherId: teacherSelect.value,
    teacherName: teacherOption?.text || '',
    birthDate: document.getElementById('studentBirthDate').value,
    enrollDate: document.getElementById('studentEnrollDate').value
  };
  
  const result = await adminApiPost(data);
  if (result.success) {
    adminToast(result.message, 'success');
    closeAdminModal('studentModal');
    adminLoadStudents();
    loadAdminStats();
  } else {
    adminToast(result.message || 'حدث خطأ', 'error');
  }
}

function clearStudentForm() {
  ['studentName','studentPhone','studentParentPhone','studentAddress','studentLevel','studentNotes']
    .forEach(id => document.getElementById(id).value = '');
  ['studentGender','studentRegion','studentTeacher'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('studentStatus').value = 'نشط';
  document.getElementById('studentEnrollDate').value = new Date().toISOString().split('T')[0];
}

// ==========================================
// إدارة المعلمين
// ==========================================
async function adminLoadTeachers() {
  const region = document.getElementById('adminTeacherRegion').value;
  const result = await adminApiGet({action: 'getTeachers', region});
  if (!result.success) return;
  adminTeachers = result.data;
  renderAdminTeachers(adminTeachers);
}

async function loadAllTeachers() {
  const result = await adminApiGet({action: 'getTeachers', region: 'all'});
  if (!result.success) return;
  adminTeachers = result.data;
  
  // تعبئة قائمة المعلمين في نموذج الطالب
  const select = document.getElementById('studentTeacher');
  select.innerHTML = '<option value="">-- اختر المعلم --</option>';
  adminTeachers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t['المعرف'];
    opt.textContent = `${t['الاسم']} - ${t['المنطقة']}`;
    select.appendChild(opt);
  });
}

function renderAdminTeachers(teachers) {
  const wrapper = document.getElementById('adminTeachersTable');
  if (!teachers.length) {
    wrapper.innerHTML = `<div class="loading"><p>لا توجد بيانات. أضف معلمين جدداً.</p></div>`;
    return;
  }
  
  const rows = teachers.map(t => `
    <tr>
      <td><code style="font-size:11px">${t['المعرف']||'-'}</code></td>
      <td><strong>${t['الاسم']||'-'}</strong></td>
      <td>${t['الجنس']||'-'}</td>
      <td><span style="background:#EBF5FB;padding:3px 10px;border-radius:20px;font-size:12px;color:var(--primary)">📍${t['المنطقة']||'-'}</span></td>
      <td>${t['التخصص']||'-'}</td>
      <td>${t['المؤهل']||'-'}</td>
      <td>${t['الهاتف']||'-'}</td>
      <td><span class="status-badge ${t['الحالة']==='نشط'?'status-active':'status-inactive'}">${t['الحالة']||'-'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editTeacher('${t['المعرف']}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="confirmDelete('teacher','${t['المعرف']}','${t['الاسم']}')">🗑️</button>
      </td>
    </tr>
  `).join('');
  
  wrapper.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>الرقم</th><th>الاسم</th><th>الجنس</th><th>المنطقة</th><th>التخصص</th><th>المؤهل</th><th>الهاتف</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:15px 20px;color:var(--text-gray);font-size:13px">الإجمالي: <strong>${teachers.length}</strong></div>
  `;
}

function filterAdminTeachers() {
  const q = document.getElementById('adminTeacherSearch').value.toLowerCase();
  const filtered = adminTeachers.filter(t =>
    (t['الاسم']||'').toLowerCase().includes(q) ||
    (t['التخصص']||'').toLowerCase().includes(q) ||
    (t['المنطقة']||'').toLowerCase().includes(q)
  );
  renderAdminTeachers(filtered);
}

function openAddTeacherModal() {
  document.getElementById('teacherModalTitle').textContent = '➕ إضافة معلم جديد';
  document.getElementById('teacherId').value = '';
  ['teacherName','teacherPhone','teacherSpecialty','teacherQualification','teacherNotes']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('teacherStatus').value = 'نشط';
  document.getElementById('teacherJoinDate').value = new Date().toISOString().split('T')[0];
  openAdminModal('teacherModal');
}

function editTeacher(id) {
  const t = adminTeachers.find(t => t['المعرف'] === id);
  if (!t) return;
  
  document.getElementById('teacherModalTitle').textContent = '✏️ تعديل بيانات المعلم';
  document.getElementById('teacherId').value = id;
  document.getElementById('teacherName').value = t['الاسم'] || '';
  document.getElementById('teacherGender').value = t['الجنس'] || '';
  document.getElementById('teacherRegion').value = t['المنطقة'] || '';
  document.getElementById('teacherPhone').value = t['الهاتف'] || '';
  document.getElementById('teacherSpecialty').value = t['التخصص'] || '';
  document.getElementById('teacherQualification').value = t['المؤهل'] || '';
  document.getElementById('teacherStatus').value = t['الحالة'] || 'نشط';
  document.getElementById('teacherNotes').value = t['ملاحظات'] || '';
  
  openAdminModal('teacherModal');
}

async function saveTeacher() {
  const id = document.getElementById('teacherId').value;
  const name = document.getElementById('teacherName').value.trim();
  const region = document.getElementById('teacherRegion').value;
  
  if (!name) { adminToast('اسم المعلم مطلوب', 'warning'); return; }
  if (!region) { adminToast('المنطقة مطلوبة', 'warning'); return; }
  
  const data = {
    action: id ? 'updateTeacher' : 'addTeacher',
    id, name, region,
    gender: document.getElementById('teacherGender').value,
    phone: document.getElementById('teacherPhone').value,
    specialty: document.getElementById('teacherSpecialty').value,
    qualification: document.getElementById('teacherQualification').value,
    status: document.getElementById('teacherStatus').value,
    notes: document.getElementById('teacherNotes').value,
    joinDate: document.getElementById('teacherJoinDate').value
  };
  
  const result = await adminApiPost(data);
  if (result.success) {
    adminToast(result.message, 'success');
    closeAdminModal('teacherModal');
    adminLoadTeachers();
    loadAllTeachers();
    loadAdminStats();
  } else {
    adminToast(result.message || 'حدث خطأ', 'error');
  }
}

// ==========================================
// إدارة الإداريين
// ==========================================
async function adminLoadAdmins() {
  const result = await adminApiGet({action: 'getAdmins', region: 'all'});
  if (!result.success) return;
  adminAdmins = result.data;
  renderAdminAdmins(adminAdmins);
}

function renderAdminAdmins(admins) {
  const wrapper = document.getElementById('adminAdminsTable');
  if (!admins.length) {
    wrapper.innerHTML = `<div class="loading"><p>لا توجد بيانات.</p></div>`;
    return;
  }
  
  const rows = admins.map(a => `
    <tr>
      <td><strong>${a['الاسم']||'-'}</strong></td>
      <td>${a['الجنس']||'-'}</td>
      <td><span style="background:#EBF5FB;padding:3px 10px;border-radius:20px;font-size:12px;color:var(--primary)">📍${a['المنطقة']||'-'}</span></td>
      <td>${a['الدور']||'-'}</td>
      <td>${a['الهاتف']||'-'}</td>
      <td><span class="status-badge ${a['الحالة']==='نشط'?'status-active':'status-inactive'}">${a['الحالة']||'-'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editAdminUser('${a['المعرف']}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="confirmDelete('admin','${a['المعرف']}','${a['الاسم']}')">🗑️</button>
      </td>
    </tr>
  `).join('');
  
  wrapper.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>الاسم</th><th>الجنس</th><th>المنطقة</th><th>الدور</th><th>الهاتف</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function openAddAdminModal() {
  document.getElementById('adminUserModalTitle').textContent = '➕ إضافة إداري جديد';
  document.getElementById('adminUserId').value = '';
  ['adminUserName','adminUserPhone','adminUserRole','adminUserNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('adminUserStatus').value = 'نشط';
  openAdminModal('adminUserModal');
}

function editAdminUser(id) {
  const a = adminAdmins.find(a => a['المعرف'] === id);
  if (!a) return;
  document.getElementById('adminUserModalTitle').textContent = '✏️ تعديل بيانات الإداري';
  document.getElementById('adminUserId').value = id;
  document.getElementById('adminUserName').value = a['الاسم'] || '';
  document.getElementById('adminUserGender').value = a['الجنس'] || '';
  document.getElementById('adminUserRegion').value = a['المنطقة'] || '';
  document.getElementById('adminUserPhone').value = a['الهاتف'] || '';
  document.getElementById('adminUserRole').value = a['الدور'] || '';
  document.getElementById('adminUserStatus').value = a['الحالة'] || 'نشط';
  document.getElementById('adminUserNotes').value = a['ملاحظات'] || '';
  openAdminModal('adminUserModal');
}

async function saveAdminUser() {
  const id = document.getElementById('adminUserId').value;
  const name = document.getElementById('adminUserName').value.trim();
  const region = document.getElementById('adminUserRegion').value;
  
  if (!name) { adminToast('الاسم مطلوب', 'warning'); return; }
  if (!region) { adminToast('المنطقة مطلوبة', 'warning'); return; }
  
  const data = {
    action: id ? 'updateAdmin' : 'addAdmin',
    id, name, region,
    gender: document.getElementById('adminUserGender').value,
    phone: document.getElementById('adminUserPhone').value,
    role: document.getElementById('adminUserRole').value,
    status: document.getElementById('adminUserStatus').value,
    notes: document.getElementById('adminUserNotes').value
  };
  
  const result = await adminApiPost(data);
  if (result.success) {
    adminToast(result.message, 'success');
    closeAdminModal('adminUserModal');
    adminLoadAdmins();
    loadAdminStats();
  } else {
    adminToast(result.message || 'حدث خطأ', 'error');
  }
}

// ==========================================
// الحذف
// ==========================================
function confirmDelete(type, id, name) {
  document.getElementById('deleteMessage').textContent = `هل تريد حذف "${name}"؟`;
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    const actions = {student: 'deleteStudent', teacher: 'deleteTeacher', admin: 'deleteAdmin'};
    const result = await adminApiPost({action: actions[type], id});
    
    if (result.success) {
      adminToast(result.message, 'success');
      closeAdminModal('deleteModal');
      if (type === 'student') adminLoadStudents();
      if (type === 'teacher') { adminLoadTeachers(); loadAllTeachers(); }
      if (type === 'admin') adminLoadAdmins();
      loadAdminStats();
    } else {
      adminToast(result.message || 'حدث خطأ', 'error');
    }
  };
  openAdminModal('deleteModal');
}

// ==========================================
// تسجيل الحضور
// ==========================================
async function loadTeachersForAtt() {
  const region = document.getElementById('attRegion').value;
  if (!region) return;
  
  const result = await adminApiGet({action: 'getTeachers', region});
  const select = document.getElementById('attTeacher');
  select.innerHTML = '<option value="">-- اختر المعلم --</option>';
  
  if (result.success) {
    result.data.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t['المعرف'];
      opt.dataset.name = t['الاسم'];
      opt.textContent = t['الاسم'];
      select.appendChild(opt);
    });
  }
  
  document.getElementById('attendanceStudentsList').style.display = 'none';
}

async function loadStudentsForAtt() {
  const teacherId = document.getElementById('attTeacher').value;
  const region = document.getElementById('attRegion').value;
  if (!teacherId) return;
  
  const result = await adminApiGet({action: 'getStudents', teacherId, region});
  if (!result.success || !result.data.length) {
    adminToast('لا يوجد طلاب لهذا المعلم', 'warning');
    return;
  }
  
  attendanceData = {};
  result.data.forEach(s => attendanceData[s['المعرف']] = {student: s, status: 'حاضر'});
  
  const grid = document.getElementById('attendanceGrid');
  grid.innerHTML = result.data.map(s => `
    <div class="attendance-card present" id="att-card-${s['المعرف']}">
      <div>
        <strong style="font-size:14px">${s['الاسم']}</strong>
        <div style="font-size:12px; color:var(--text-gray)">${s['المستوى']||''}</div>
      </div>
      <div class="attendance-toggle">
        <button class="att-btn present active" id="att-present-${s['المعرف']}" 
                onclick="setAttendance('${s['المعرف']}', 'حاضر')">حاضر</button>
        <button class="att-btn absent" id="att-absent-${s['المعرف']}" 
                onclick="setAttendance('${s['المعرف']}', 'غائب')">غائب</button>
      </div>
    </div>
  `).join('');
  
  document.getElementById('attendanceStudentsList').style.display = 'block';
}

function setAttendance(studentId, status) {
  attendanceData[studentId].status = status;
  
  const card = document.getElementById(`att-card-${studentId}`);
  const presentBtn = document.getElementById(`att-present-${studentId}`);
  const absentBtn = document.getElementById(`att-absent-${studentId}`);
  
  card.className = `attendance-card ${status === 'حاضر' ? 'present' : 'absent'}`;
  presentBtn.className = `att-btn present ${status === 'حاضر' ? 'active' : ''}`;
  absentBtn.className = `att-btn absent ${status === 'غائب' ? 'active' : ''}`;
}

async function saveAttendance() {
  const date = document.getElementById('attDate').value;
  const period = document.getElementById('attPeriod').value;
  const region = document.getElementById('attRegion').value;
  const teacherSelect = document.getElementById('attTeacher');
  const teacherId = teacherSelect.value;
  const teacherName = teacherSelect.options[teacherSelect.selectedIndex]?.dataset?.name || '';
  
  if (!date || !period || !region || !teacherId) {
    adminToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
    return;
  }
  
  const records = Object.values(attendanceData).map(({student, status}) => ({
    studentId: student['المعرف'],
    studentName: student['الاسم'],
    teacherId,
    teacherName,
    status
  }));
  
  const result = await adminApiPost({action: 'addAttendance', date, period, region, records});
  if (result.success) {
    adminToast('تم حفظ الحضور بنجاح ✅', 'success');
    document.getElementById('attendanceStudentsList').style.display = 'none';
    loadAdminStats();
  } else {
    adminToast('خطأ في حفظ الحضور', 'error');
  }
}

// ==========================================
// التصدير
// ==========================================
function exportStudentsAdmin() {
  if (!adminStudents.length) { adminToast('لا توجد بيانات', 'warning'); return; }
  
  const headers = ['المعرف', 'الاسم', 'الجنس', 'المنطقة', 'العنوان', 'الهاتف', 'هاتف ولي الأمر', 'المعلم', 'المستوى', 'الحالة'];
  const data = adminStudents.map(s => [
    s['المعرف'], s['الاسم'], s['الجنس'], s['المنطقة'], s['العنوان'],
    s['الهاتف'], s['هاتف ولي الأمر'], s['اسم المعلم'], s['المستوى'], s['الحالة']
  ]);
  adminExportExcel([headers, ...data], 'الطلاب', 'قائمة الطلاب');
  adminToast('تم التصدير بنجاح', 'success');
}

function exportTeachersAdmin() {
  if (!adminTeachers.length) { adminToast('لا توجد بيانات', 'warning'); return; }
  
  const headers = ['المعرف', 'الاسم', 'الجنس', 'المنطقة', 'الهاتف', 'التخصص', 'المؤهل', 'الحالة'];
  const data = adminTeachers.map(t => [
    t['المعرف'], t['الاسم'], t['الجنس'], t['المنطقة'],
    t['الهاتف'], t['التخصص'], t['المؤهل'], t['الحالة']
  ]);
  adminExportExcel([headers, ...data], 'المعلمون', 'قائمة المعلمين');
  adminToast('تم التصدير بنجاح', 'success');
}

function exportAdminsAdmin() {
  if (!adminAdmins.length) { adminToast('لا توجد بيانات', 'warning'); return; }
  
  const headers = ['المعرف', 'الاسم', 'الجنس', 'المنطقة', 'الهاتف', 'الدور', 'الحالة'];
  const data = adminAdmins.map(a => [
    a['المعرف'], a['الاسم'], a['الجنس'], a['المنطقة'],
    a['الهاتف'], a['الدور'], a['الحالة']
  ]);
  adminExportExcel([headers, ...data], 'الإداريون', 'قائمة الإداريين');
  adminToast('تم التصدير بنجاح', 'success');
}

async function exportAllData() {
  adminToast('جاري تحضير البيانات...', 'info');
  
  const [s, t, a] = await Promise.all([
    adminApiGet({action: 'getStudents', region: 'all'}),
    adminApiGet({action: 'getTeachers', region: 'all'}),
    adminApiGet({action: 'getAdmins', region: 'all'})
  ]);
  
  const allData = [
    ['تقرير شامل - مؤسسة النبأ العظيم', '', '', ''],
    [''],
    ['=== الطلاب ===', '', '', ''],
    ['الاسم', 'المنطقة', 'المعلم', 'الحالة'],
    ...(s.data||[]).map(x => [x['الاسم'], x['المنطقة'], x['اسم المعلم']||'-', x['الحالة']]),
    [''],
    ['=== المعلمون ===', '', '', ''],
    ['الاسم', 'المنطقة', 'التخصص', 'الحالة'],
    ...(t.data||[]).map(x => [x['الاسم'], x['المنطقة'], x['التخصص']||'-', x['الحالة']]),
    [''],
    ['=== الإداريون ===', '', '', ''],
    ['الاسم', 'المنطقة', 'الدور', 'الحالة'],
    ...(a.data||[]).map(x => [x['الاسم'], x['المنطقة'], x['الدور']||'-', x['الحالة']])
  ];
  
  adminExportExcel(allData, 'التقرير_الشامل', 'التقرير الشامل لمؤسسة النبأ العظيم');
  adminToast('تم تصدير التقرير الشامل', 'success');
}

async function exportRegionsReportAdmin() {
  const result = await adminApiGet({action: 'getStats'});
  if (!result.success) return;
  
  const wsData = [
    ['تقرير مناطق مؤسسة النبأ العظيم', '', '', '', ''],
    ['المنطقة', 'الطلاب', 'المعلمون', 'الإداريون', 'الإجمالي'],
    ...CONFIG.REGIONS.map(r => {
      const s = result.stats.regionStats[r] || {};
      return [r, s.students||0, s.teachers||0, s.admins||0, (s.students||0)+(s.teachers||0)+(s.admins||0)];
    })
  ];
  adminExportExcel(wsData, 'تقرير_المناطق', 'إحصائيات المناطق');
}

function adminExportExcel(data, filename, title) {
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>البيانات</x:Name><x:WorksheetOptions><x:DisplayRightToLeft/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body{font-family:Arial;direction:rtl}
    table{border-collapse:collapse;width:100%}
    .h{background:#1B4F72;color:white;font-weight:bold;padding:10px;text-align:center;font-size:15px}
    .th{background:#2E86C1;color:white;font-weight:bold;padding:8px;border:1px solid #1B4F72;text-align:center}
    .td{padding:7px 10px;border:1px solid #D5D8DC;text-align:right}
    .tr-even{background:#EBF5FB}
    .sec{background:#D4AC0D;color:#2C3E50;font-weight:bold;padding:8px}
  </style></head><body><table>
  <tr><td class="h" colspan="10">🌟 مؤسسة النبأ العظيم | ${title} | ${new Date().toLocaleDateString('ar-SA')}</td></tr>`;
  
  let isFirstRow = true;
  data.forEach(row => {
    if (!row || !row.length || row.every(c => !c)) { html += '<tr><td colspan="10" style="height:6px"></td></tr>'; return; }
    
    const isSectionTitle = row.length === 4 && typeof row[0] === 'string' && row[0].startsWith('===');
    const isHeader = isFirstRow || (row.every(c => typeof c === 'string') && 
      (row[0]==='الاسم'||row[0]==='المنطقة'||row[0]==='التاريخ'||row[0]==='المعرف'));
    
    if (isSectionTitle) {
      html += `<tr><td class="sec" colspan="10">${row[0]}</td></tr>`;
    } else if (isFirstRow) {
      isFirstRow = false;
    } else if (isHeader) {
      html += '<tr>' + row.map(c => `<td class="th">${c||''}</td>`).join('') + '</tr>';
    } else {
      html += '<tr>' + row.map(c => `<td class="td">${c!==undefined&&c!==null?c:''}</td>`).join('') + '</tr>';
    }
  });
  
  html += `</table><p style="color:#7F8C8D;font-size:11px;text-align:center;margin-top:10px">تم الإنشاء بواسطة نظام مؤسسة النبأ العظيم الإلكتروني</p></body></html>`;
  
  const blob = new Blob(['\ufeff' + html], {type: 'application/vnd.ms-excel;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// التنقل
// ==========================================
function adminShowSection(section) {
  const sections = ['dashboard', 'students', 'teachers', 'admins', 'attendance', 'reports'];
  const titles = {
    dashboard: 'لوحة المعلومات', students: 'إدارة الطلاب',
    teachers: 'إدارة المعلمين', admins: 'إدارة الإداريين',
    attendance: 'تسجيل الحضور', reports: 'التقارير'
  };
  
  sections.forEach(s => {
    const el = document.getElementById(`admin-section-${s}`);
    if (el) el.style.display = s === section ? 'block' : 'none';
    const menu = document.getElementById(`menu-${s}`);
    if (menu) menu.classList.toggle('active', s === section);
  });
  
  document.getElementById('adminPageTitle').textContent = titles[section] || section;
  
  if (section === 'students') adminLoadStudents();
  if (section === 'teachers') adminLoadTeachers();
  if (section === 'admins') adminLoadAdmins();
  
  // إغلاق السايدبار في الموبايل
  if (window.innerWidth <= 768) {
    document.getElementById('adminSidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('adminSidebar').classList.toggle('open');
}

function refreshAll() {
  loadAdminStats();
  const active = document.querySelector('.sidebar-menu a.active');
  updateLastUpdate();
  adminToast('تم التحديث', 'success');
}

// ==========================================
// المودال
// ==========================================
function openAdminModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeAdminModal(id) {
  document.getElementById(id).classList.remove('active');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('active');
  });
});

// ==========================================
// الإشعارات
// ==========================================
function adminToast(message, type = 'info') {
  const container = document.getElementById('adminToastContainer');
  const icons = {success:'✅', error:'❌', warning:'⚠️', info:'ℹ️'};
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="font-size:20px">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

let adminLoadingCount = 0;
function showAdminLoader(show) {
  adminLoadingCount += show ? 1 : -1;
  adminLoadingCount = Math.max(0, adminLoadingCount);
  const loader = document.getElementById('adminProgressLoader');
  if (loader) loader.style.display = adminLoadingCount > 0 ? 'block' : 'none';
}