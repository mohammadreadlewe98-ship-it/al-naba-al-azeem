// ==========================================
// النبأ العظيم - لوحة التحكم الإدارية
// admin.js
// ==========================================

let adminToken = null;
let adminStudents = [];
let adminTeachers = [];
let adminAdmins = [];

// ==========================================
// API - كل الطلبات عبر GET لتجنب CORS
// ==========================================
async function adminApiGet(params) {
  showAdminLoader(true);
  try {
    const url = new URL(CONFIG.API_URL);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
    const res = await fetch(url.toString());
    const text = await res.text();
    try { return JSON.parse(text); }
    catch(e) { return {success: false, message: 'خطأ في الرد'}; }
  } catch(err) {
    adminToast('خطأ في الاتصال', 'error');
    return {success: false};
  } finally {
    showAdminLoader(false);
  }
}

async function adminApiPost(data) {
  // نرسل عبر GET لتجنب مشكلة CORS
  return await adminApiGet(data);
}

// ==========================================
// تسجيل الدخول
// ==========================================
async function doLogin() {
  const password = document.getElementById('adminPassword').value;
  if (!password) { adminToast('أدخل كلمة المرور', 'warning'); return; }

  const result = await adminApiGet({action: 'verifyAdmin', password});
  if (result.success) {
    adminToken = result.token;
    sessionStorage.setItem('adminToken', adminToken);
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    initAdminPanel();
  } else {
    adminToast('كلمة المرور غير صحيحة ❌', 'error');
  }
}

function doLogout() {
  adminToken = null;
  sessionStorage.removeItem('adminToken');
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('adminToken');
  if (saved) {
    adminToken = saved;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    initAdminPanel();
  }
  if (window.innerWidth <= 768) {
    const toggle = document.getElementById('menuToggle');
    if (toggle) toggle.style.display = 'block';
  }
  document.getElementById('adminPassword')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') doLogin();
  });
});

function initAdminPanel() {
  loadAdminStats();
  loadAllTeachersForSelect();
  updateLastUpdate();
  setInterval(() => { loadAdminStats(); updateLastUpdate(); }, 60000);
}

function updateLastUpdate() {
  const el = document.getElementById('lastUpdate');
  if (el) el.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-SA');
}

function toggleSidebar() {
  document.getElementById('adminSidebar').classList.toggle('open');
}

// ==========================================
// التنقل بين الأقسام
// ==========================================
function adminShowSection(section) {
  ['dashboard','students','teachers','admins','attendance','reports'].forEach(s => {
    const el = document.getElementById(`admin-section-${s}`);
    if (el) el.style.display = s === section ? 'block' : 'none';
    const menu = document.getElementById(`menu-${s}`);
    if (menu) menu.classList.toggle('active', s === section);
  });

  const titles = {
    dashboard: 'لوحة المعلومات', students: 'إدارة الطلاب',
    teachers: 'إدارة المعلمين', admins: 'إدارة الإداريين',
    attendance: 'تسجيل الحضور', reports: 'التقارير'
  };
  const titleEl = document.getElementById('adminPageTitle');
  if (titleEl) titleEl.textContent = titles[section] || '';

  if (section === 'students')   adminLoadStudents();
  if (section === 'teachers')   adminLoadTeachers();
  if (section === 'admins')     adminLoadAdmins();
  if (section === 'attendance') initAttendanceSection();

  if (window.innerWidth <= 768) {
    document.getElementById('adminSidebar').classList.remove('open');
  }
}

function refreshAll() {
  loadAdminStats();
  adminToast('تم التحديث ✅', 'success');
}

// ==========================================
// Dashboard - الإحصائيات
// ==========================================
async function loadAdminStats() {
  const result = await adminApiGet({action: 'getStats', region: 'all'});
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
        <small>${stats.totalPresent || 0} حاضر / ${stats.totalAbsent || 0} غائب</small>
      </div>
    </div>
  `;

  renderAdminRegionsGrid(stats.regionStats);
}

function renderAdminRegionsGrid(regionStats) {
  const grid = document.getElementById('adminRegionsGrid');
  if (!grid) return;
  const icons = {'دمشق':'🏛️','ريف دمشق':'🌿','حمص':'🏙️','حماة':'⚙️','دير الزور':'🌊','إدلب':'🌺','درعا':'🌾'};

  grid.innerHTML = (CONFIG.REGIONS || []).map(region => {
    const s = (regionStats && regionStats[region]) || {};
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
      </div>`;
  }).join('');
}

// ==========================================
// إدارة الطلاب
// ==========================================
async function adminLoadStudents() {
  const region = document.getElementById('adminStudentRegion')?.value || 'all';
  const result = await adminApiGet({action: 'getStudents', region});
  if (!result.success) return;
  adminStudents = result.data || [];
  renderAdminStudents(adminStudents);
}

function renderAdminStudents(students) {
  const wrapper = document.getElementById('adminStudentsTable');
  if (!wrapper) return;
  if (!students.length) {
    wrapper.innerHTML = `<div class="loading"><p style="color:var(--text-gray)">لا توجد بيانات. أضف طلاباً جدداً.</p></div>`;
    return;
  }
  wrapper.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr>
          <th>الرقم</th><th>الاسم</th><th>الجنس</th><th>المنطقة</th>
          <th>المعلم</th><th>المستوى</th><th>الحالة</th><th>إجراءات</th>
        </tr></thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td><code style="font-size:11px;color:var(--text-gray)">${s['المعرف']||'-'}</code></td>
              <td><strong>${s['الاسم']||'-'}</strong></td>
              <td>${s['الجنس']||'-'}</td>
              <td><span style="background:#EBF5FB;padding:3px 10px;border-radius:20px;font-size:12px;color:var(--primary)">📍${s['المنطقة']||'-'}</span></td>
              <td>${s['اسم المعلم']||'-'}</td>
              <td>${s['المستوى']||'-'}</td>
              <td><span class="status-badge ${s['الحالة']==='نشط'?'status-active':'status-inactive'}">${s['الحالة']||'-'}</span></td>
              <td style="display:flex;gap:5px">
                <button class="btn btn-sm btn-primary" onclick="editStudent('${s['المعرف']}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete('students','${s['المعرف']}','${s['الاسم']}')">🗑️</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:15px 20px;color:var(--text-gray);font-size:13px">
      الإجمالي: <strong>${students.length}</strong> طالب
    </div>`;
}

function filterAdminStudents() {
  const q = (document.getElementById('adminStudentSearch')?.value || '').toLowerCase();
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
  document.getElementById('studentEnrollDate').value = new Date().toISOString().split('T')[0];
  openAdminModal('studentModal');
}

function editStudent(id) {
  const s = adminStudents.find(s => s['المعرف'] === id);
  if (!s) return;
  document.getElementById('studentModalTitle').textContent = '✏️ تعديل بيانات الطالب';
  document.getElementById('studentId').value          = id;
  document.getElementById('studentName').value        = s['الاسم'] || '';
  document.getElementById('studentGender').value      = s['الجنس'] || '';
  document.getElementById('studentRegion').value      = s['المنطقة'] || '';
  document.getElementById('studentLevel').value       = s['المستوى'] || '';
  document.getElementById('studentPhone').value       = s['الهاتف'] || '';
  document.getElementById('studentParentPhone').value = s['هاتف ولي الأمر'] || '';
  document.getElementById('studentAddress').value     = s['العنوان'] || '';
  document.getElementById('studentStatus').value      = s['الحالة'] || 'نشط';
  document.getElementById('studentNotes').value       = s['ملاحظات'] || '';
  document.getElementById('studentTeacher').value     = s['معرف المعلم'] || '';
  openAdminModal('studentModal');
}

async function saveStudent() {
  const id     = document.getElementById('studentId').value;
  const name   = document.getElementById('studentName').value.trim();
  const region = document.getElementById('studentRegion').value;

  if (!name)   { adminToast('اسم الطالب مطلوب ⚠️', 'warning'); return; }
  if (!region) { adminToast('المنطقة مطلوبة ⚠️', 'warning'); return; }

  const teacherSelect = document.getElementById('studentTeacher');
  const teacherOption = teacherSelect.options[teacherSelect.selectedIndex];

  const params = {
    action:       id ? 'updateStudent' : 'addStudent',
    id,
    name,
    region,
    gender:       document.getElementById('studentGender').value,
    level:        document.getElementById('studentLevel').value,
    phone:        document.getElementById('studentPhone').value,
    parentPhone:  document.getElementById('studentParentPhone').value,
    address:      document.getElementById('studentAddress').value,
    status:       document.getElementById('studentStatus').value,
    notes:        document.getElementById('studentNotes').value,
    teacherId:    teacherSelect.value,
    teacherName:  teacherOption?.text !== '-- اختر المعلم --' ? teacherOption?.text : '',
    enrollDate:   document.getElementById('studentEnrollDate').value,
    birthDate:    document.getElementById('studentBirthDate')?.value || ''
  };

  const result = await adminApiPost(params);
  if (result.success) {
    adminToast(result.message, 'success');
    closeAdminModal('studentModal');
    adminLoadStudents();
    loadAdminStats();
  } else {
    adminToast(result.message || 'حدث خطأ ❌', 'error');
  }
}

function clearStudentForm() {
  ['studentName','studentPhone','studentParentPhone','studentAddress','studentLevel','studentNotes']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  ['studentGender','studentRegion','studentTeacher']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('studentStatus').value = 'نشط';
}

function exportStudentsAdmin() {
  if (!adminStudents.length) { adminToast('لا توجد بيانات', 'warning'); return; }
  const headers = ['المعرف','الاسم','الجنس','المنطقة','المعلم','المستوى','الهاتف','الحالة'];
  const data = adminStudents.map(s => [
    s['المعرف'], s['الاسم'], s['الجنس'], s['المنطقة'],
    s['اسم المعلم'], s['المستوى'], s['الهاتف'], s['الحالة']
  ]);
  exportToExcelAdmin([headers, ...data], 'بيانات_الطلاب', 'قائمة الطلاب');
  adminToast('تم التصدير ✅', 'success');
}

// ==========================================
// إدارة المعلمين
// ==========================================
async function adminLoadTeachers() {
  const region = document.getElementById('adminTeacherRegion')?.value || 'all';
  const result = await adminApiGet({action: 'getTeachers', region});
  if (!result.success) return;
  adminTeachers = result.data || [];
  renderAdminTeachers(adminTeachers);
}

async function loadAllTeachersForSelect() {
  const result = await adminApiGet({action: 'getTeachers', region: 'all'});
  if (!result.success) return;
  adminTeachers = result.data || [];

  const select = document.getElementById('studentTeacher');
  if (!select) return;
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
  if (!wrapper) return;
  if (!teachers.length) {
    wrapper.innerHTML = `<div class="loading"><p style="color:var(--text-gray)">لا توجد بيانات. أضف معلمين جدداً.</p></div>`;
    return;
  }
  wrapper.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr>
          <th>الرقم</th><th>الاسم</th><th>الجنس</th><th>المنطقة</th>
          <th>التخصص</th><th>المؤهل</th><th>الهاتف</th><th>الحالة</th><th>إجراءات</th>
        </tr></thead>
        <tbody>
          ${teachers.map(t => `
            <tr>
              <td><code style="font-size:11px;color:var(--text-gray)">${t['المعرف']||'-'}</code></td>
              <td><strong>${t['الاسم']||'-'}</strong></td>
              <td>${t['الجنس']||'-'}</td>
              <td><span style="background:#EBF5FB;padding:3px 10px;border-radius:20px;font-size:12px;color:var(--primary)">📍${t['المنطقة']||'-'}</span></td>
              <td>${t['التخصص']||'-'}</td>
              <td>${t['المؤهل']||'-'}</td>
              <td>${t['الهاتف']||'-'}</td>
              <td><span class="status-badge ${t['الحالة']==='نشط'?'status-active':'status-inactive'}">${t['الحالة']||'-'}</span></td>
              <td style="display:flex;gap:5px">
                <button class="btn btn-sm btn-primary" onclick="editTeacher('${t['المعرف']}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete('teachers','${t['المعرف']}','${t['الاسم']}')">🗑️</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:15px 20px;color:var(--text-gray);font-size:13px">
      الإجمالي: <strong>${teachers.length}</strong> معلم
    </div>`;
}

function filterAdminTeachers() {
  const q = (document.getElementById('adminTeacherSearch')?.value || '').toLowerCase();
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
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  ['teacherGender','teacherRegion'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('teacherStatus').value   = 'نشط';
  document.getElementById('teacherJoinDate').value = new Date().toISOString().split('T')[0];
  openAdminModal('teacherModal');
}

function editTeacher(id) {
  const t = adminTeachers.find(t => t['المعرف'] === id);
  if (!t) return;
  document.getElementById('teacherModalTitle').textContent    = '✏️ تعديل بيانات المعلم';
  document.getElementById('teacherId').value                  = id;
  document.getElementById('teacherName').value                = t['الاسم'] || '';
  document.getElementById('teacherGender').value              = t['الجنس'] || '';
  document.getElementById('teacherRegion').value              = t['المنطقة'] || '';
  document.getElementById('teacherPhone').value               = t['الهاتف'] || '';
  document.getElementById('teacherSpecialty').value           = t['التخصص'] || '';
  document.getElementById('teacherQualification').value       = t['المؤهل'] || '';
  document.getElementById('teacherStatus').value              = t['الحالة'] || 'نشط';
  document.getElementById('teacherNotes').value               = t['ملاحظات'] || '';
  openAdminModal('teacherModal');
}

async function saveTeacher() {
  const id     = document.getElementById('teacherId').value;
  const name   = document.getElementById('teacherName').value.trim();
  const region = document.getElementById('teacherRegion').value;

  if (!name)   { adminToast('اسم المعلم مطلوب ⚠️', 'warning'); return; }
  if (!region) { adminToast('المنطقة مطلوبة ⚠️', 'warning'); return; }

  const params = {
    action:        id ? 'updateTeacher' : 'addTeacher',
    id,
    name,
    region,
    gender:        document.getElementById('teacherGender').value,
    phone:         document.getElementById('teacherPhone').value,
    specialty:     document.getElementById('teacherSpecialty').value,
    qualification: document.getElementById('teacherQualification').value,
    status:        document.getElementById('teacherStatus').value,
    notes:         document.getElementById('teacherNotes').value,
    joinDate:      document.getElementById('teacherJoinDate').value
  };

  const result = await adminApiPost(params);
  if (result.success) {
    adminToast(result.message, 'success');
    closeAdminModal('teacherModal');
    adminLoadTeachers();
    loadAllTeachersForSelect();
    loadAdminStats();
  } else {
    adminToast(result.message || 'حدث خطأ ❌', 'error');
  }
}

function exportTeachersAdmin() {
  if (!adminTeachers.length) { adminToast('لا توجد بيانات', 'warning'); return; }
  const headers = ['المعرف','الاسم','الجنس','المنطقة','التخصص','المؤهل','الهاتف','الحالة'];
  const data = adminTeachers.map(t => [
    t['المعرف'], t['الاسم'], t['الجنس'], t['المنطقة'],
    t['التخصص'], t['المؤهل'], t['الهاتف'], t['الحالة']
  ]);
  exportToExcelAdmin([headers, ...data], 'بيانات_المعلمين', 'قائمة المعلمين');
  adminToast('تم التصدير ✅', 'success');
}

// ==========================================
// إدارة الإداريين
// ==========================================
async function adminLoadAdmins() {
  const result = await adminApiGet({action: 'getAdmins', region: 'all'});
  if (!result.success) return;
  adminAdmins = result.data || [];
  renderAdminAdmins(adminAdmins);
}

function renderAdminAdmins(admins) {
  const wrapper = document.getElementById('adminAdminsTable');
  if (!wrapper) return;
  if (!admins.length) {
    wrapper.innerHTML = `<div class="loading"><p style="color:var(--text-gray)">لا توجد بيانات.</p></div>`;
    return;
  }
  wrapper.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr>
          <th>الاسم</th><th>الجنس</th><th>المنطقة</th>
          <th>الدور</th><th>الهاتف</th><th>الحالة</th><th>إجراءات</th>
        </tr></thead>
        <tbody>
          ${admins.map(a => `
            <tr>
              <td><strong>${a['الاسم']||'-'}</strong></td>
              <td>${a['الجنس']||'-'}</td>
              <td><span style="background:#EBF5FB;padding:3px 10px;border-radius:20px;font-size:12px;color:var(--primary)">📍${a['المنطقة']||'-'}</span></td>
              <td>${a['الدور']||'-'}</td>
              <td>${a['الهاتف']||'-'}</td>
              <td><span class="status-badge ${a['الحالة']==='نشط'?'status-active':'status-inactive'}">${a['الحالة']||'-'}</span></td>
              <td style="display:flex;gap:5px">
                <button class="btn btn-sm btn-primary" onclick="editAdminUser('${a['المعرف']}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete('admins','${a['المعرف']}','${a['الاسم']}')">🗑️</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function openAddAdminModal() {
  document.getElementById('adminUserModalTitle').textContent = '➕ إضافة إداري جديد';
  document.getElementById('adminUserId').value = '';
  ['adminUserName','adminUserPhone','adminUserRole','adminUserNotes']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  ['adminUserGender','adminUserRegion'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('adminUserStatus').value = 'نشط';
  openAdminModal('adminUserModal');
}

function editAdminUser(id) {
  const a = adminAdmins.find(a => a['المعرف'] === id);
  if (!a) return;
  document.getElementById('adminUserModalTitle').textContent = '✏️ تعديل بيانات الإداري';
  document.getElementById('adminUserId').value     = id;
  document.getElementById('adminUserName').value   = a['الاسم'] || '';
  document.getElementById('adminUserGender').value = a['الجنس'] || '';
  document.getElementById('adminUserRegion').value = a['المنطقة'] || '';
  document.getElementById('adminUserPhone').value  = a['الهاتف'] || '';
  document.getElementById('adminUserRole').value   = a['الدور'] || '';
  document.getElementById('adminUserStatus').value = a['الحالة'] || 'نشط';
  document.getElementById('adminUserNotes').value  = a['ملاحظات'] || '';
  openAdminModal('adminUserModal');
}

async function saveAdminUser() {
  const id     = document.getElementById('adminUserId').value;
  const name   = document.getElementById('adminUserName').value.trim();
  const region = document.getElementById('adminUserRegion').value;

  if (!name)   { adminToast('اسم الإداري مطلوب ⚠️', 'warning'); return; }
  if (!region) { adminToast('المنطقة مطلوبة ⚠️', 'warning'); return; }

  const params = {
    action:  id ? 'updateAdmin' : 'addAdmin',
    id,
    name,
    region,
    gender:  document.getElementById('adminUserGender').value,
    phone:   document.getElementById('adminUserPhone').value,
    role:    document.getElementById('adminUserRole').value,
    status:  document.getElementById('adminUserStatus').value,
    notes:   document.getElementById('adminUserNotes').value
  };

  const result = await adminApiPost(params);
  if (result.success) {
    adminToast(result.message, 'success');
    closeAdminModal('adminUserModal');
    adminLoadAdmins();
    loadAdminStats();
  } else {
    adminToast(result.message || 'حدث خطأ ❌', 'error');
  }
}

function exportAdminsAdmin() {
  if (!adminAdmins.length) { adminToast('لا توجد بيانات', 'warning'); return; }
  const headers = ['المعرف','الاسم','الجنس','المنطقة','الدور','الهاتف','الحالة'];
  const data = adminAdmins.map(a => [
    a['المعرف'], a['الاسم'], a['الجنس'], a['المنطقة'],
    a['الدور'], a['الهاتف'], a['الحالة']
  ]);
  exportToExcelAdmin([headers, ...data], 'بيانات_الإداريين', 'قائمة الإداريين');
  adminToast('تم التصدير ✅', 'success');
}

// ==========================================
// تسجيل الحضور
// ==========================================
function initAttendanceSection() {
  const dateEl = document.getElementById('attDate');
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
}

async function loadTeachersForAtt() {
  const region = document.getElementById('attRegion').value;
  if (!region) return;
  const result = await adminApiGet({action: 'getTeachers', region});
  if (!result.success) return;

  const select = document.getElementById('attTeacher');
  select.innerHTML = '<option value="">-- اختر المعلم --</option>';
  (result.data || []).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t['المعرف'];
    opt.textContent = t['الاسم'];
    select.appendChild(opt);
  });
}

async function loadStudentsForAtt() {
  const teacherId = document.getElementById('attTeacher').value;
  const region    = document.getElementById('attRegion').value;
  if (!teacherId) return;

  const result = await adminApiGet({action: 'getStudents', teacherId, region});
  if (!result.success) return;

  const students = result.data || [];
  const grid = document.getElementById('attendanceGrid');
  const listDiv = document.getElementById('attendanceStudentsList');

  if (!students.length) {
    grid.innerHTML = '<p style="color:var(--text-gray);padding:20px">لا يوجد طلاب لهذا المعلم</p>';
    listDiv.style.display = 'block';
    return;
  }

  grid.innerHTML = students.map(s => `
    <div class="att-student-card" id="att-card-${s['المعرف']}">
      <div class="att-student-name">👤 ${s['الاسم']}</div>
      <div class="att-buttons">
        <button class="btn btn-sm btn-success att-btn"
          onclick="setAttendance('${s['المعرف']}', 'حاضر', this)">✅ حاضر</button>
        <button class="btn btn-sm btn-danger att-btn"
          onclick="setAttendance('${s['المعرف']}', 'غائب', this)">❌ غائب</button>
      </div>
    </div>
  `).join('');

  listDiv.style.display = 'block';
}

const attendanceData = {};

function setAttendance(studentId, status, btn) {
  attendanceData[studentId] = status;
  const card = document.getElementById(`att-card-${studentId}`);
  if (card) {
    card.style.background = status === 'حاضر' ? '#D5F5E3' : '#FADBD8';
    card.querySelectorAll('.att-btn').forEach(b => b.style.opacity = '0.5');
    btn.style.opacity = '1';
    btn.style.transform = 'scale(1.1)';
  }
}

async function saveAttendance() {
  const teacherId = document.getElementById('attTeacher').value;
  const teacherEl = document.getElementById('attTeacher');
  const teacherName = teacherEl.options[teacherEl.selectedIndex]?.text || '';
  const region  = document.getElementById('attRegion').value;
  const date    = document.getElementById('attDate').value;
  const period  = document.getElementById('attPeriod').value;

  if (!date)   { adminToast('حدد التاريخ ⚠️', 'warning'); return; }
  if (!period) { adminToast('حدد الفترة ⚠️', 'warning'); return; }

  const studentsResult = await adminApiGet({action: 'getStudents', teacherId, region});
  const students = studentsResult.data || [];

  const records = students.map(s => ({
    studentId:   s['المعرف'],
    studentName: s['الاسم'],
    teacherId,
    teacherName,
    region,
    date,
    period,
    status: attendanceData[s['المعرف']] || 'غائب',
    notes: ''
  }));

  const result = await adminApiGet({
    action: 'saveAttendance',
    records: JSON.stringify(records)
  });

  if (result.success) {
    adminToast(result.message, 'success');
    Object.keys(attendanceData).forEach(k => delete attendanceData[k]);
    document.getElementById('attendanceStudentsList').style.display = 'none';
  } else {
    adminToast(result.message || 'خطأ في الحفظ ❌', 'error');
  }
}

// ==========================================
// التقارير
// ==========================================
async function exportAllData() {
  adminToast('جارٍ التصدير...', 'info');
  const [s, t, a] = await Promise.all([
    adminApiGet({action: 'getStudents', region: 'all'}),
    adminApiGet({action: 'getTeachers', region: 'all'}),
    adminApiGet({action: 'getAdmins',   region: 'all'})
  ]);

  const studHeaders = ['المعرف','الاسم','الجنس','المنطقة','المعلم','المستوى','الهاتف','الحالة'];
  const tchHeaders  = ['المعرف','الاسم','الجنس','المنطقة','التخصص','المؤهل','الهاتف','الحالة'];
  const admHeaders  = ['المعرف','الاسم','الجنس','المنطقة','الدور','الهاتف','الحالة'];

  const data = [
    ['التقرير الشامل - مؤسسة النبأ العظيم'],
    [],
    ['قائمة الطلاب'], studHeaders,
    ...(s.data||[]).map(r => [r['المعرف'],r['الاسم'],r['الجنس'],r['المنطقة'],r['اسم المعلم'],r['المستوى'],r['الهاتف'],r['الحالة']]),
    [],
    ['قائمة المعلمين'], tchHeaders,
    ...(t.data||[]).map(r => [r['المعرف'],r['الاسم'],r['الجنس'],r['المنطقة'],r['التخصص'],r['المؤهل'],r['الهاتف'],r['الحالة']]),
    [],
    ['قائمة الإداريين'], admHeaders,
    ...(a.data||[]).map(r => [r['المعرف'],r['الاسم'],r['الجنس'],r['المنطقة'],r['الدور'],r['الهاتف'],r['الحالة']])
  ];

  exportToExcelAdmin(data, 'التقرير_الشامل', 'التقرير الشامل');
  adminToast('تم تصدير التقرير الشامل ✅', 'success');
}

async function exportRegionsReportAdmin() {
  const result = await adminApiGet({action: 'getStats', region: 'all'});
  if (!result.success) return;
  const regionStats = result.stats.regionStats || {};
  const data = [
    ['تقرير المناطق'],
    ['المنطقة','الطلاب','المعلمون','الإداريون','الإجمالي'],
    ...(CONFIG.REGIONS||[]).map(r => {
      const s = regionStats[r] || {};
      return [r, s.students||0, s.teachers||0, s.admins||0,
        (s.students||0)+(s.teachers||0)+(s.admins||0)];
    })
  ];
  exportToExcelAdmin(data, 'تقرير_المناطق', 'تقرير المناطق');
  adminToast('تم التصدير ✅', 'success');
}

// ==========================================
// تصدير Excel
// ==========================================
function exportToExcelAdmin(data, filename, title) {
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">
  <style>
    body{font-family:Arial;direction:rtl}
    table{border-collapse:collapse;width:100%}
    .h{background:#1B4F72;color:white;font-weight:bold;padding:10px;text-align:center}
    .sh{background:#2E86C1;color:white;font-weight:bold;padding:7px;border:1px solid #1B4F72;text-align:center}
    .d{padding:6px 10px;border:1px solid #D5D8DC}
    .da{padding:6px 10px;border:1px solid #D5D8DC;background:#EBF5FB}
    .t{background:#D4AC0D;color:#2C3E50;font-weight:bold;padding:8px}
  </style></head><body><table>
  <tr><td colspan="10" class="h">🌟 مؤسسة النبأ العظيم | ${title} | ${new Date().toLocaleDateString('ar-SA')}</td></tr>`;

  let alt = 0;
  data.forEach(row => {
    if (!row || !row.length) { html += '<tr><td colspan="10" style="height:8px"></td></tr>'; alt=0; return; }
    const nonEmpty = row.filter(c => c !== '' && c !== null && c !== undefined);
    if (nonEmpty.length === 1) {
      html += `<tr><td colspan="10" class="t">${nonEmpty[0]}</td></tr>`; alt=0; return;
    }
    const isHeader = row.every(c => typeof c === 'string') &&
      (row.includes('الاسم') || row.includes('المعرف') || row.includes('المنطقة'));
    if (isHeader) {
      html += '<tr>' + row.map(c => `<td class="sh">${c||''}</td>`).join('') + '</tr>'; alt=0; return;
    }
    const cls = alt++ % 2 === 0 ? 'd' : 'da';
    html += '<tr>' + row.map(c => `<td class="${cls}">${c!==undefined&&c!==null?c:''}</td>`).join('') + '</tr>';
  });

  html += `</table></body></html>`;
  const blob = new Blob(['\ufeff'+html], {type:'application/vnd.ms-excel;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// الحذف مع تأكيد
// ==========================================
function confirmDelete(type, id, name) {
  document.getElementById('deleteMessage').textContent = `هل تريد حذف "${name}" نهائياً؟`;
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    const actions = {students:'deleteStudent', teachers:'deleteTeacher', admins:'deleteAdmin'};
    const result = await adminApiPost({action: actions[type], id});
    if (result.success) {
      adminToast(result.message, 'success');
      closeAdminModal('deleteModal');
      if (type === 'students') adminLoadStudents();
      if (type === 'teachers') { adminLoadTeachers(); loadAllTeachersForSelect(); }
      if (type === 'admins')   adminLoadAdmins();
      loadAdminStats();
    } else {
      adminToast(result.message || 'خطأ في الحذف', 'error');
    }
  };
  openAdminModal('deleteModal');
}

// ==========================================
// المودال
// ==========================================
function openAdminModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function closeAdminModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('active');
    });
  });
});

// ==========================================
// الإشعارات
// ==========================================
function adminToast(message, type = 'info') {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;
  const icons = {success:'✅', error:'❌', warning:'⚠️', info:'ℹ️'};
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="font-size:20px">${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// شريط التحميل
// ==========================================
let adminLoadingCount = 0;
function showAdminLoader(show) {
  adminLoadingCount += show ? 1 : -1;
  adminLoadingCount = Math.max(0, adminLoadingCount);
  const loader = document.getElementById('adminProgressLoader');
  if (loader) loader.style.display = adminLoadingCount > 0 ? 'block' : 'none';
}
