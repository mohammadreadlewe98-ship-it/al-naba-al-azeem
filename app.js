// ==========================================
// النبأ العظيم - app.js الكامل
// صفحة الزوار
// ==========================================

// هذا الملف يعمل مع config.js — تأكد أن config.js محمل قبله في index.html

let currentRegion = 'all';
let allStudents = [];
let allTeachers = [];
let currentStats = null;

// ==========================================
// التهيئة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadStudentsForSelects();
  loadTeachersForSelects();

  setInterval(() => {
    loadStats();
    const stuSec = document.getElementById('section-students');
    const tchSec = document.getElementById('section-teachers');
    if (stuSec && stuSec.style.display !== 'none') loadStudentsData();
    if (tchSec && tchSec.style.display !== 'none') loadTeachersData();
  }, 30000);
});

// ==========================================
// دوال الـ API — التعديل الرئيسي هنا ✅
// ==========================================
async function apiGet(params) {
  showLoader(true);
  try {
    const base = CONFIG.API_URL.startsWith('http')
      ? CONFIG.API_URL
      : window.location.origin + CONFIG.API_URL;
    const url = new URL(base);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
    const response = await fetch(url.toString());
    const text = await response.text();
    try { return JSON.parse(text); }
    catch(e) { return { success: false, message: 'خطأ في الرد' }; }
  } catch (err) {
    showToast('خطأ في الاتصال بالخادم', 'error');
    return { success: false, message: err.message };
  } finally {
    showLoader(false);
  }
}

// ==========================================
// تحميل الإحصائيات
// ==========================================
async function loadStats() {
  const result = await apiGet({ action: 'getStats', region: currentRegion });
  if (!result.success) return;
  currentStats = result.stats;
  renderStats(result.stats);
  renderRegionsGrid(result.stats.regionStats);
}

function renderStats(stats) {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;
  const attRate = stats.attendanceRate || 0;
  const attColor = attRate >= 80 ? 'green' : attRate >= 60 ? '' : 'red';

  grid.innerHTML = `
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
        <small style="color:var(--text-gray)">في 7 مناطق</small>
      </div>
    </div>
    <div class="stat-card ${attColor} fade-in">
      <div class="stat-icon">✅</div>
      <div class="stat-info">
        <h3>${attRate}%</h3>
        <p>نسبة الحضور</p>
        <small>${stats.totalPresent || 0} حاضر / ${stats.totalAbsent || 0} غائب</small>
      </div>
    </div>
  `;
}

function renderRegionsGrid(regionStats) {
  const grid = document.getElementById('regionsGrid');
  if (!grid) return;
  const regionIcons = {
    'دمشق': '🏛️', 'ريف دمشق': '🌿', 'حمص': '🏙️',
    'حماة': '⚙️', 'دير الزور': '🌊', 'إدلب': '🌺', 'درعا': '🌾'
  };

  grid.innerHTML = CONFIG.REGIONS.map(region => {
    const stats = (regionStats && regionStats[region]) || { students: 0, teachers: 0, admins: 0 };
    return `
      <div class="region-card fade-in">
        <div class="region-card-header">
          <h3>${regionIcons[region] || '📍'} ${region}</h3>
          <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:20px;font-size:12px">
            ${(stats.students || 0) + (stats.teachers || 0) + (stats.admins || 0)} إجمالي
          </span>
        </div>
        <div class="region-card-body">
          <div class="region-stat">
            <div class="num">${stats.students || 0}</div>
            <div class="lbl">طالب</div>
          </div>
          <div class="region-stat">
            <div class="num" style="color:var(--secondary)">${stats.teachers || 0}</div>
            <div class="lbl">معلم</div>
          </div>
          <div class="region-stat">
            <div class="num" style="color:var(--gold)">${stats.admins || 0}</div>
            <div class="lbl">إداري</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// تحميل بيانات الطلاب
// ==========================================
async function loadStudentsData() {
  const regionEl = document.getElementById('studentRegionFilter');
  const region = regionEl ? regionEl.value : currentRegion;
  const result = await apiGet({ action: 'getStudentReport', region });
  if (!result.success) { showToast('خطأ في تحميل بيانات الطلاب', 'error'); return; }
  allStudents = result.data || [];
  renderStudentsTable(allStudents);
}

function renderStudentsTable(students) {
  const wrapper = document.getElementById('studentsTableWrapper');
  if (!wrapper) return;

  if (!students || students.length === 0) {
    wrapper.innerHTML = `
      <div class="loading">
        <div style="font-size:60px">😶</div>
        <p>لا توجد بيانات طلاب حالياً</p>
      </div>`;
    return;
  }

  const rows = students.map(s => {
    const rate = s.attendanceRate || 0;
    const barClass = rate >= 80 ? '' : rate >= 60 ? 'medium' : 'low';
    return `
      <tr>
        <td><code style="font-size:11px;color:var(--text-gray)">${s['المعرف'] || '-'}</code></td>
        <td><strong>${s['الاسم'] || '-'}</strong></td>
        <td class="hide-mobile">${s['الجنس'] || '-'}</td>
        <td>
          <span style="background:#EBF5FB;padding:3px 10px;border-radius:20px;font-size:12px;color:var(--primary)">
            📍 ${s['المنطقة'] || '-'}
          </span>
        </td>
        <td class="hide-mobile">${s['اسم المعلم'] || '-'}</td>
        <td class="hide-mobile">${s['المستوى'] || '-'}</td>
        <td>
          <span class="status-badge ${s['الحالة'] === 'نشط' ? 'status-active' : 'status-inactive'}">
            ${s['الحالة'] || '-'}
          </span>
        </td>
        <td>
          <div class="attendance-bar">
            <div class="bar-track">
              <div class="bar-fill ${barClass}" style="width:${rate}%"></div>
            </div>
            <span style="font-size:12px;font-weight:700;min-width:35px">${rate}%</span>
          </div>
        </td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="viewStudentDetails('${s['المعرف']}')">
            👁️ تفاصيل
          </button>
        </td>
      </tr>
    `;
  }).join('');

  wrapper.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>الرقم</th><th>الاسم</th>
            <th class="hide-mobile">الجنس</th>
            <th>المنطقة</th>
            <th class="hide-mobile">المعلم</th>
            <th class="hide-mobile">المستوى</th>
            <th>الحالة</th><th>نسبة الحضور</th><th>إجراء</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:15px 20px;color:var(--text-gray);font-size:13px">
      إجمالي: <strong>${students.length}</strong> طالب
    </div>
  `;
}

function filterStudentsTable() {
  const search = (document.getElementById('studentSearch')?.value || '').toLowerCase();
  const status = document.getElementById('studentStatusFilter')?.value || 'all';

  const filtered = allStudents.filter(s => {
    const matchSearch = !search ||
      (s['الاسم'] || '').toLowerCase().includes(search) ||
      (s['المنطقة'] || '').toLowerCase().includes(search) ||
      (s['المعرف'] || '').toLowerCase().includes(search) ||
      (s['اسم المعلم'] || '').toLowerCase().includes(search);
    const matchStatus = status === 'all' || s['الحالة'] === status;
    return matchSearch && matchStatus;
  });

  renderStudentsTable(filtered);
}

// ==========================================
// تحميل بيانات المعلمين
// ==========================================
async function loadTeachersData() {
  const regionEl = document.getElementById('teacherRegionFilter');
  const region = regionEl ? regionEl.value : currentRegion;
  const result = await apiGet({ action: 'getTeacherReport', region });
  if (!result.success) { showToast('خطأ في تحميل بيانات المعلمين', 'error'); return; }
  allTeachers = result.data || [];
  renderTeachersTable(allTeachers);
}

function renderTeachersTable(teachers) {
  const wrapper = document.getElementById('teachersTableWrapper');
  if (!wrapper) return;

  if (!teachers || teachers.length === 0) {
    wrapper.innerHTML = `<div class="loading"><div style="font-size:60px">😶</div><p>لا توجد بيانات معلمين حالياً</p></div>`;
    return;
  }

  const rows = teachers.map(t => `
    <tr>
      <td><code style="font-size:11px;color:var(--text-gray)">${t['المعرف'] || '-'}</code></td>
      <td><strong>${t['الاسم'] || '-'}</strong></td>
      <td class="hide-mobile">${t['الجنس'] || '-'}</td>
      <td>
        <span style="background:#EBF5FB;padding:3px 10px;border-radius:20px;font-size:12px;color:var(--primary)">
          📍 ${t['المنطقة'] || '-'}
        </span>
      </td>
      <td class="hide-mobile">${t['التخصص'] || '-'}</td>
      <td>
        <span style="background:#D5F5E3;color:#1E8449;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:700">
          ${t.studentsCount || 0} طالب
        </span>
      </td>
      <td>
        <div class="attendance-bar">
          <div class="bar-track">
            <div class="bar-fill ${(t.attendanceRate || 0) < 60 ? 'low' : (t.attendanceRate || 0) < 80 ? 'medium' : ''}"
                 style="width:${t.attendanceRate || 0}%"></div>
          </div>
          <span style="font-size:12px;font-weight:700;min-width:35px">${t.attendanceRate || 0}%</span>
        </div>
      </td>
      <td>
        <span class="status-badge ${t['الحالة'] === 'نشط' ? 'status-active' : 'status-inactive'}">
          ${t['الحالة'] || '-'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="viewTeacherDetails('${t['المعرف']}')">
          👁️ تفاصيل
        </button>
      </td>
    </tr>
  `).join('');

  wrapper.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>الرقم</th><th>الاسم</th>
            <th class="hide-mobile">الجنس</th>
            <th>المنطقة</th>
            <th class="hide-mobile">التخصص</th>
            <th>الطلاب</th><th>نسبة الحضور</th><th>الحالة</th><th>إجراء</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:15px 20px;color:var(--text-gray);font-size:13px">
      إجمالي: <strong>${teachers.length}</strong> معلم
    </div>
  `;
}

function filterTeachersTable() {
  const search = (document.getElementById('teacherSearch')?.value || '').toLowerCase();
  const filtered = allTeachers.filter(t =>
    !search ||
    (t['الاسم'] || '').toLowerCase().includes(search) ||
    (t['التخصص'] || '').toLowerCase().includes(search) ||
    (t['المنطقة'] || '').toLowerCase().includes(search)
  );
  renderTeachersTable(filtered);
}

// ==========================================
// قوائم الاختيار للتقارير
// ==========================================
async function loadStudentsForSelects() {
  const result = await apiGet({ action: 'getStudents', region: 'all' });
  if (!result.success) return;

  const select = document.getElementById('reportStudentSelect');
  if (!select) return;
  select.innerHTML = '<option value="">-- اختر الطالب --</option>';
  (result.data || []).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s['المعرف'];
    opt.textContent = `${s['الاسم']} - ${s['المنطقة']}`;
    select.appendChild(opt);
  });
}

async function loadTeachersForSelects() {
  const result = await apiGet({ action: 'getTeachers', region: 'all' });
  if (!result.success) return;

  const select = document.getElementById('reportTeacherSelect');
  if (!select) return;
  select.innerHTML = '<option value="">-- اختر المعلم --</option>';
  (result.data || []).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t['المعرف'];
    opt.textContent = `${t['الاسم']} - ${t['المنطقة']}`;
    select.appendChild(opt);
  });
}

// ==========================================
// التنقل بين الأقسام
// ==========================================
function showSection(section) {
  const sections = ['overview', 'students', 'teachers', 'reports'];
  sections.forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.style.display = s === section ? 'block' : 'none';
  });

  document.querySelectorAll('.nav-btn').forEach((btn, i) => {
    btn.classList.toggle('active', sections[i] === section);
  });

  if (section === 'students') loadStudentsData();
  if (section === 'teachers') loadTeachersData();
}

function filterByRegion(region, btn) {
  currentRegion = region;
  document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadStats();
}

// ==========================================
// التقارير
// ==========================================
function openStudentReportModal() { openModal('studentReportModal'); }
function openTeacherReportModal() { openModal('teacherReportModal'); }

async function generateStudentReport() {
  const id = document.getElementById('reportStudentSelect')?.value;
  if (!id) { showToast('اختر طالباً أولاً', 'warning'); return; }

  const studentsResult = await apiGet({ action: 'getStudents', region: 'all' });
  const student = (studentsResult.data || []).find(s => s['المعرف'] === id);
  if (!student) { showToast('لم يتم العثور على الطالب', 'error'); return; }

  const attResult = await apiGet({ action: 'getAttendance', studentId: id });
  const attendance = attResult.data || [];
  const present = attendance.filter(a => a['الحالة'] === 'حاضر').length;
  const total = attendance.length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  closeModal('studentReportModal');

  const reportDiv = document.getElementById('reportDisplay');
  const reportContent = document.getElementById('reportContent');
  if (!reportDiv || !reportContent) return;

  reportContent.innerHTML = `
    <div style="padding:25px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <h2 style="color:var(--primary)">📋 تقرير الطالب: ${student['الاسم']}</h2>
        <div style="display:flex;gap:10px">
          <button class="btn btn-gold" onclick="exportSingleStudentExcel('${id}')">📥 تصدير Excel</button>
          <button class="btn btn-primary" onclick="window.print()">🖨️ طباعة</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:25px">
        ${renderInfoCard('👤', 'الاسم الكامل', student['الاسم'])}
        ${renderInfoCard('📍', 'المنطقة', student['المنطقة'])}
        ${renderInfoCard('👨‍🏫', 'المعلم', student['اسم المعلم'] || '-')}
        ${renderInfoCard('📚', 'المستوى', student['المستوى'] || '-')}
        ${renderInfoCard('📱', 'الهاتف', student['الهاتف'] || '-')}
        ${renderInfoCard('✅', 'نسبة الحضور', rate + '%', rate >= 80 ? 'var(--success)' : rate >= 60 ? 'var(--warning)' : 'var(--danger)')}
      </div>
      <div style="background:var(--cream);padding:15px;border-radius:12px;margin-bottom:20px">
        <h4 style="color:var(--primary);margin-bottom:10px">📊 إحصائيات الحضور</h4>
        <div style="display:flex;gap:20px;flex-wrap:wrap">
          <div>جلسات الحضور: <strong style="color:var(--success)">${present}</strong></div>
          <div>جلسات الغياب: <strong style="color:var(--danger)">${total - present}</strong></div>
          <div>إجمالي الجلسات: <strong>${total}</strong></div>
        </div>
        <div class="attendance-bar" style="margin-top:12px">
          <div class="bar-track" style="height:12px">
            <div class="bar-fill ${rate < 60 ? 'low' : rate < 80 ? 'medium' : ''}" style="width:${rate}%"></div>
          </div>
          <span style="font-size:16px;font-weight:900;color:var(--primary)">${rate}%</span>
        </div>
      </div>
      ${attendance.length > 0 ? `
        <h4 style="color:var(--primary);margin-bottom:15px">📅 سجل الحضور التفصيلي</h4>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>التاريخ</th><th>الفترة</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
            <tbody>
              ${attendance.map(a => `
                <tr>
                  <td>${a['التاريخ'] || '-'}</td>
                  <td>${a['الفترة'] || '-'}</td>
                  <td>
                    <span class="status-badge ${a['الحالة'] === 'حاضر' ? 'status-active' : 'status-inactive'}">
                      ${a['الحالة'] || '-'}
                    </span>
                  </td>
                  <td>${a['ملاحظات'] || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p style="color:var(--text-gray);text-align:center;padding:20px">لا توجد سجلات حضور بعد</p>'}
    </div>
  `;

  reportDiv.style.display = 'block';
  reportDiv.scrollIntoView({ behavior: 'smooth' });
}

function renderInfoCard(icon, label, value, color = 'var(--primary)') {
  return `
    <div style="background:white;border-radius:10px;padding:15px;box-shadow:var(--shadow-sm);border-right:4px solid ${color}">
      <div style="color:var(--text-gray);font-size:12px">${icon} ${label}</div>
      <div style="font-size:16px;font-weight:700;color:${color};margin-top:5px">${value || '-'}</div>
    </div>
  `;
}

async function openGroupStudentReport() {
  showSection('reports');
  const result = await apiGet({ action: 'getStudentReport', region: currentRegion });
  if (!result.success) return;

  const reportContent = document.getElementById('reportContent');
  if (!reportContent) return;

  reportContent.innerHTML = `
    <div style="padding:25px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <h2 style="color:var(--primary)">📊 تقرير الطلاب الجماعي</h2>
        <button class="btn btn-gold" onclick="exportStudentsExcel()">📥 تصدير Excel</button>
      </div>
      ${renderStudentsTableHTML(result.data || [])}
    </div>
  `;

  document.getElementById('reportDisplay').style.display = 'block';
  document.getElementById('reportDisplay').scrollIntoView({ behavior: 'smooth' });
}

function renderStudentsTableHTML(students) {
  if (!students.length) return '<p style="text-align:center;color:var(--text-gray);padding:30px">لا توجد بيانات</p>';
  return `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead>
          <tr><th>الاسم</th><th>المنطقة</th><th>المعلم</th><th>المستوى</th><th>الحالة</th><th>نسبة الحضور</th></tr>
        </thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td>${s['الاسم'] || '-'}</td>
              <td>${s['المنطقة'] || '-'}</td>
              <td>${s['اسم المعلم'] || '-'}</td>
              <td>${s['المستوى'] || '-'}</td>
              <td><span class="status-badge ${s['الحالة'] === 'نشط' ? 'status-active' : 'status-inactive'}">${s['الحالة'] || '-'}</span></td>
              <td>
                <div class="attendance-bar">
                  <div class="bar-track">
                    <div class="bar-fill" style="width:${s.attendanceRate || 0}%"></div>
                  </div>
                  <span style="font-size:12px;font-weight:700">${s.attendanceRate || 0}%</span>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p style="padding:15px;color:var(--text-gray);font-size:13px">الإجمالي: <strong>${students.length}</strong> طالب</p>
  `;
}

async function generateTeacherReport() {
  const id = document.getElementById('reportTeacherSelect')?.value;
  if (!id) { showToast('اختر معلماً أولاً', 'warning'); return; }

  const teachersResult = await apiGet({ action: 'getTeachers', region: 'all' });
  const teacher = (teachersResult.data || []).find(t => t['المعرف'] === id);
  if (!teacher) { showToast('لم يتم العثور على المعلم', 'error'); return; }

  const studentsResult = await apiGet({ action: 'getStudents', teacherId: id, region: 'all' });
  const attResult = await apiGet({ action: 'getAttendance', teacherId: id });

  const students = studentsResult.data || [];
  const attendance = attResult.data || [];
  const present = attendance.filter(a => a['الحالة'] === 'حاضر').length;
  const total = attendance.length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  closeModal('teacherReportModal');

  const reportContent = document.getElementById('reportContent');
  if (!reportContent) return;

  reportContent.innerHTML = `
    <div style="padding:25px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <h2 style="color:var(--primary)">📋 تقرير المعلم: ${teacher['الاسم']}</h2>
        <div style="display:flex;gap:10px">
          <button class="btn btn-gold" onclick="exportSingleTeacherExcel('${id}')">📥 تصدير Excel</button>
          <button class="btn btn-primary" onclick="window.print()">🖨️ طباعة</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:25px">
        ${renderInfoCard('👨‍🏫', 'الاسم', teacher['الاسم'])}
        ${renderInfoCard('📍', 'المنطقة', teacher['المنطقة'])}
        ${renderInfoCard('📚', 'التخصص', teacher['التخصص'] || '-')}
        ${renderInfoCard('👨‍🎓', 'عدد الطلاب', students.length.toString(), 'var(--secondary)')}
        ${renderInfoCard('📱', 'الهاتف', teacher['الهاتف'] || '-')}
        ${renderInfoCard('✅', 'نسبة حضور الطلاب', rate + '%', rate >= 80 ? 'var(--success)' : 'var(--warning)')}
      </div>
      ${students.length > 0 ? `
        <h4 style="color:var(--primary);margin-bottom:15px">👨‍🎓 طلاب هذا المعلم (${students.length})</h4>
        ${renderStudentsTableHTML(students)}
      ` : '<p style="text-align:center;color:var(--text-gray);padding:20px">لا يوجد طلاب مسجلون بعد</p>'}
    </div>
  `;

  document.getElementById('reportDisplay').style.display = 'block';
  document.getElementById('reportDisplay').scrollIntoView({ behavior: 'smooth' });
}

async function openGroupTeacherReport() {
  const result = await apiGet({ action: 'getTeacherReport', region: currentRegion });
  if (!result.success) return;

  const reportContent = document.getElementById('reportContent');
  if (!reportContent) return;

  const teachers = result.data || [];
  reportContent.innerHTML = `
    <div style="padding:25px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <h2 style="color:var(--primary)">📈 تقرير المعلمين الجماعي</h2>
        <button class="btn btn-gold" onclick="exportTeachersExcel()">📥 تصدير Excel</button>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr><th>الاسم</th><th>المنطقة</th><th>التخصص</th><th>الطلاب</th><th>نسبة الحضور</th><th>الحالة</th></tr>
          </thead>
          <tbody>
            ${teachers.map(t => `
              <tr>
                <td><strong>${t['الاسم'] || '-'}</strong></td>
                <td>${t['المنطقة'] || '-'}</td>
                <td>${t['التخصص'] || '-'}</td>
                <td><span style="background:#D5F5E3;color:#1E8449;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:700">${t.studentsCount || 0}</span></td>
                <td>
                  <div class="attendance-bar">
                    <div class="bar-track">
                      <div class="bar-fill ${(t.attendanceRate||0) < 60 ? 'low' : (t.attendanceRate||0) < 80 ? 'medium' : ''}"
                           style="width:${t.attendanceRate || 0}%"></div>
                    </div>
                    <span style="font-size:12px;font-weight:700">${t.attendanceRate || 0}%</span>
                  </div>
                </td>
                <td><span class="status-badge ${t['الحالة'] === 'نشط' ? 'status-active' : 'status-inactive'}">${t['الحالة'] || '-'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="padding:15px;color:var(--text-gray);font-size:13px">الإجمالي: <strong>${teachers.length}</strong> معلم</p>
    </div>
  `;

  document.getElementById('reportDisplay').style.display = 'block';
  document.getElementById('reportDisplay').scrollIntoView({ behavior: 'smooth' });
}

async function openAttendanceReport() {
  const result = await apiGet({ action: 'getAttendance', region: currentRegion });
  if (!result.success) return;

  const records = result.data || [];
  const present = records.filter(r => r['الحالة'] === 'حاضر').length;
  const absent  = records.filter(r => r['الحالة'] !== 'حاضر').length;
  const rate    = records.length > 0 ? Math.round((present / records.length) * 100) : 0;

  const reportContent = document.getElementById('reportContent');
  if (!reportContent) return;

  reportContent.innerHTML = `
    <div style="padding:25px">
      <h2 style="color:var(--primary);margin-bottom:20px">✅ تقرير الحضور والغياب</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;margin-bottom:25px">
        ${renderInfoCard('📊', 'إجمالي السجلات', records.length.toString())}
        ${renderInfoCard('✅', 'حاضر', present.toString(), 'var(--success)')}
        ${renderInfoCard('❌', 'غائب', absent.toString(), 'var(--danger)')}
        ${renderInfoCard('📈', 'نسبة الحضور', rate + '%', rate >= 80 ? 'var(--success)' : 'var(--warning)')}
      </div>
      ${records.length > 0 ? `
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>الطالب</th><th>المعلم</th><th>المنطقة</th><th>التاريخ</th><th>الفترة</th><th>الحالة</th></tr></thead>
            <tbody>
              ${records.map(r => `
                <tr>
                  <td>${r['اسم الطالب'] || '-'}</td>
                  <td>${r['اسم المعلم'] || '-'}</td>
                  <td>${r['المنطقة'] || '-'}</td>
                  <td>${r['التاريخ'] || '-'}</td>
                  <td>${r['الفترة'] || '-'}</td>
                  <td><span class="status-badge ${r['الحالة'] === 'حاضر' ? 'status-active' : 'status-inactive'}">${r['الحالة'] || '-'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p style="text-align:center;color:var(--text-gray);padding:30px">لا توجد سجلات حضور</p>'}
    </div>
  `;

  document.getElementById('reportDisplay').style.display = 'block';
  document.getElementById('reportDisplay').scrollIntoView({ behavior: 'smooth' });
}

async function exportRegionsReport() {
  if (!currentStats) await loadStats();
  const wsData = [
    ['تقرير مناطق مؤسسة النبأ العظيم', '', '', '', ''],
    ['المنطقة', 'عدد الطلاب', 'عدد المعلمين', 'عدد الإداريين', 'الإجمالي'],
    ...CONFIG.REGIONS.map(r => {
      const s = (currentStats?.regionStats && currentStats.regionStats[r]) || {};
      return [r, s.students||0, s.teachers||0, s.admins||0,
        (s.students||0)+(s.teachers||0)+(s.admins||0)];
    })
  ];
  exportToExcel(wsData, 'تقرير_المناطق', 'مؤسسة النبأ العظيم - تقرير مقارنة المناطق');
  showToast('تم تصدير تقرير المناطق', 'success');
}

// ==========================================
// تصدير Excel
// ==========================================
function exportStudentsExcel() {
  if (!allStudents.length) { showToast('لا توجد بيانات لتصديرها', 'warning'); return; }
  const headers = ['المعرف','الاسم','الجنس','المنطقة','العنوان','الهاتف','هاتف ولي الأمر','المعلم','المستوى','تاريخ التسجيل','الحالة','نسبة الحضور'];
  const data = allStudents.map(s => [s['المعرف'],s['الاسم'],s['الجنس'],s['المنطقة'],s['العنوان'],s['الهاتف'],s['هاتف ولي الأمر'],s['اسم المعلم'],s['المستوى'],s['تاريخ التسجيل'],s['الحالة'],(s.attendanceRate||0)+'%']);
  exportToExcel([headers,...data],'بيانات_الطلاب',`قائمة الطلاب - ${new Date().toLocaleDateString('ar-SA')}`);
  showToast('تم تصدير بيانات الطلاب بنجاح','success');
}

function exportTeachersExcel() {
  if (!allTeachers.length) { showToast('لا توجد بيانات لتصديرها','warning'); return; }
  const headers = ['المعرف','الاسم','الجنس','المنطقة','الهاتف','التخصص','المؤهل','تاريخ الانضمام','الحالة','عدد الطلاب','نسبة الحضور'];
  const data = allTeachers.map(t => [t['المعرف'],t['الاسم'],t['الجنس'],t['المنطقة'],t['الهاتف'],t['التخصص'],t['المؤهل'],t['تاريخ الانضمام'],t['الحالة'],t.studentsCount||0,(t.attendanceRate||0)+'%']);
  exportToExcel([headers,...data],'بيانات_المعلمين',`قائمة المعلمين - ${new Date().toLocaleDateString('ar-SA')}`);
  showToast('تم تصدير بيانات المعلمين بنجاح','success');
}

async function exportSingleStudentExcel(id) {
  if (!id) id = document.getElementById('reportStudentSelect')?.value;
  if (!id) { showToast('اختر طالباً أولاً','warning'); return; }
  const studentsResult = await apiGet({action:'getStudents',region:'all'});
  const student = (studentsResult.data||[]).find(s => s['المعرف']===id);
  if (!student) return;
  const attResult = await apiGet({action:'getAttendance',studentId:id});
  const attendance = attResult.data||[];
  const present = attendance.filter(a=>a['الحالة']==='حاضر').length;
  const total = attendance.length;
  const rate = total>0?Math.round((present/total)*100):0;
  const wsData = [
    ['تقرير الطالب - مؤسسة النبأ العظيم','','',''],
    ['الاسم:',student['الاسم'],'المنطقة:',student['المنطقة']],
    ['المعلم:',student['اسم المعلم']||'-','المستوى:',student['المستوى']||'-'],
    ['الهاتف:',student['الهاتف']||'-','الحالة:',student['الحالة']],
    ['نسبة الحضور:',rate+'%','',''],
    ['','','',''],
    ['إجمالي الجلسات:',total,'حاضر:',present],
    ['غائب:',total-present,'',''],
    ['','','',''],
    ['سجل الحضور التفصيلي','','',''],
    ['التاريخ','الفترة','الحالة','ملاحظات'],
    ...attendance.map(a=>[a['التاريخ'],a['الفترة'],a['الحالة'],a['ملاحظات']||''])
  ];
  exportToExcel(wsData,`تقرير_${student['الاسم']}`,`تقرير الطالب: ${student['الاسم']}`);
  showToast('تم تصدير التقرير بنجاح','success');
}

async function exportSingleTeacherExcel(id) {
  if (!id) id = document.getElementById('reportTeacherSelect')?.value;
  if (!id) { showToast('اختر معلماً أولاً','warning'); return; }
  const teachersResult = await apiGet({action:'getTeachers',region:'all'});
  const teacher = (teachersResult.data||[]).find(t=>t['المعرف']===id);
  if (!teacher) return;
  const studentsResult = await apiGet({action:'getStudents',teacherId:id,region:'all'});
  const students = studentsResult.data||[];
  const wsData = [
    ['تقرير المعلم - مؤسسة النبأ العظيم','','',''],
    ['الاسم:',teacher['الاسم'],'المنطقة:',teacher['المنطقة']],
    ['التخصص:',teacher['التخصص']||'-','المؤهل:',teacher['المؤهل']||'-'],
    ['الهاتف:',teacher['الهاتف']||'-','الحالة:',teacher['الحالة']],
    ['عدد الطلاب:',students.length,'',''],
    ['','','',''],
    ['قائمة الطلاب','','',''],
    ['الاسم','المنطقة','المستوى','الحالة'],
    ...students.map(s=>[s['الاسم'],s['المنطقة'],s['المستوى']||'-',s['الحالة']])
  ];
  exportToExcel(wsData,`تقرير_${teacher['الاسم']}`,`تقرير المعلم: ${teacher['الاسم']}`);
  showToast('تم تصدير التقرير بنجاح','success');
}

function exportToExcel(data, filename, title) {
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>البيانات</x:Name>
    <x:WorksheetOptions><x:DisplayRightToLeft/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body{font-family:Arial;direction:rtl}
    table{border-collapse:collapse;width:100%}
    .title-row td{background:#1B4F72;color:white;font-size:15px;font-weight:bold;padding:12px;text-align:center}
    .header-row td{background:#2E86C1;color:white;font-weight:bold;padding:8px 12px;border:1px solid #1B4F72;text-align:center}
    .data-row td{padding:7px 12px;border:1px solid #D5D8DC;text-align:right}
    .data-row-alt td{padding:7px 12px;border:1px solid #D5D8DC;text-align:right;background:#EBF5FB}
    .info-key td:first-child,.info-key td:nth-child(3){background:#1E8449;color:white;font-weight:bold;padding:7px 12px}
    .info-key td{padding:7px 12px;border:1px solid #D5D8DC}
    .section-title td{background:#D4AC0D;color:#2C3E50;font-weight:bold;font-size:14px;padding:8px 12px}
  </style></head><body><table>
  <tr class="title-row"><td colspan="10">🌟 مؤسسة النبأ العظيم | ${title} | ${new Date().toLocaleDateString('ar-SA')}</td></tr>`;

  let rowIndex = 0;
  data.forEach(row => {
    if (!row || row.every(c => c===''||c===null||c===undefined)) {
      html += '<tr><td colspan="10" style="height:8px;border:none"></td></tr>';
      rowIndex = 0; return;
    }
    const nonEmpty = row.filter(c => c!==''&&c!==null&&c!==undefined);
    const isInfoRow    = typeof row[0]==='string' && row[0].endsWith(':');
    const isSectionTitle = nonEmpty.length===1 && typeof nonEmpty[0]==='string' && !isInfoRow;
    const isHeaderRow  = !isInfoRow && row.every(c=>typeof c==='string') &&
      (row.includes('الاسم')||row.includes('المعرف')||row.includes('التاريخ'));

    if (isSectionTitle) {
      html += `<tr class="section-title"><td colspan="10">${nonEmpty[0]}</td></tr>`; rowIndex=0;
    } else if (isHeaderRow) {
      html += '<tr class="header-row">'+row.map(c=>`<td>${c||''}</td>`).join('')+'</tr>'; rowIndex=0;
    } else if (isInfoRow) {
      html += '<tr class="info-key">'+row.map(c=>`<td>${c!==undefined?c:''}</td>`).join('')+'</tr>';
    } else {
      const cls = rowIndex++%2===0?'data-row':'data-row-alt';
      html += `<tr class="${cls}">`+row.map(c=>`<td>${c!==undefined&&c!==null?c:''}</td>`).join('')+'</tr>';
    }
  });

  html += `</table><p style="color:#7F8C8D;font-size:11px;text-align:center;margin-top:15px">
    تم إنشاء هذا التقرير بواسطة نظام مؤسسة النبأ العظيم الإلكتروني
  </p></body></html>`;

  const blob = new Blob(['\ufeff'+html],{type:'application/vnd.ms-excel;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ==========================================
// عرض التفاصيل
// ==========================================
async function viewStudentDetails(id) {
  const result = await apiGet({action:'getStudents',region:'all'});
  const student = (result.data||[]).find(s=>s['المعرف']===id);
  if (!student) return;
  const reportSelect = document.getElementById('reportStudentSelect');
  if (reportSelect) reportSelect.value = id;
  showSection('reports');
  await generateStudentReport();
}

async function viewTeacherDetails(id) {
  const result = await apiGet({action:'getTeachers',region:'all'});
  const teacher = (result.data||[]).find(t=>t['المعرف']===id);
  if (!teacher) return;
  const reportSelect = document.getElementById('reportTeacherSelect');
  if (reportSelect) reportSelect.value = id;
  showSection('reports');
  await generateTeacherReport();
}

// ==========================================
// المودال
// ==========================================
function openModal(id)  { const el=document.getElementById(id); if(el) el.classList.add('active'); }
function closeModal(id) { const el=document.getElementById(id); if(el) el.classList.remove('active'); }

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target===this) this.classList.remove('active');
    });
  });
});

// ==========================================
// الإشعارات Toast
// ==========================================
function showToast(message, type='info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = {success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="font-size:20px">${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity='0'; toast.style.transition='opacity 0.3s';
    setTimeout(()=>toast.remove(),300);
  },4000);
}

// ==========================================
// شريط التحميل
// ==========================================
let loadingCount = 0;
function showLoader(show) {
  loadingCount += show ? 1 : -1;
  loadingCount = Math.max(0, loadingCount);
  const loader = document.getElementById('progressLoader');
  if (loader) loader.style.display = loadingCount > 0 ? 'block' : 'none';
}

function printStudentReport() { window.print(); }
function printTeacherReport() { window.print(); }
