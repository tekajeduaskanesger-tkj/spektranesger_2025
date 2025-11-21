// IndexedDB Setup
let db;
const dbName = 'LaporanAppDB';
const dbVersion = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'username' });
      }
      if (!db.objectStoreNames.contains('fasilitasReports')) {
        db.createObjectStore('fasilitasReports', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('piketReports')) {
        db.createObjectStore('piketReports', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getStore(storeName, mode = 'readonly') {
  const transaction = db.transaction([storeName], mode);
  return transaction.objectStore(storeName);
}

function formatDate(date) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  toastMessage.textContent = message;
  toast.className = `toast align-items-center text-white bg-${type} border-0 animate-pop-up`;
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// Function to apply theme
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('toggle-theme').checked = true;
  } else {
    document.body.classList.remove('dark-mode');
    document.getElementById('toggle-theme').checked = false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await openDB();

  // Apply saved theme immediately
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  // Check if user is logged in
  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    showUserDashboard(JSON.parse(currentUser));
  } else {
    document.getElementById('auth-section').style.display = 'block';
  }

  // Toggle theme with animation
  document.getElementById('toggle-theme').addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  });

  // Scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  });

  document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));

  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const store = getStore('users');
    const request = store.get(username);
    request.onsuccess = () => {
      if (request.result && request.result.password === password) {
        localStorage.setItem('currentUser', JSON.stringify(request.result));
        Toast.fire({
          icon: "success",
          title: "Signed in successfully"
        });
        setTimeout(() => {
          window.location.href = 'home.html';
        }, 1000);
      } else {
        showToast('Username atau password salah!', 'danger');
      }
    };
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    location.reload();
  });

  // Preview setup
  function setupPreview(inputId, previewId) {
    document.getElementById(inputId).addEventListener('change', function(e) {
      const preview = document.getElementById(previewId);
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          preview.src = event.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  setupPreview('foto-fasilitas', 'preview-fasilitas');
  setupPreview('foto-piket', 'preview-piket');

  // Submit fasilitas form
  document.getElementById('fasilitas-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const data = {
      nama: document.getElementById('nama-fasilitas').value,
      kelas: currentUser.kelas,
      lokasi: document.getElementById('lokasi-fasilitas').value,
      kategori: document.getElementById('kategori-fasilitas').value,
      prioritas: document.getElementById('prioritas-fasilitas').value,
      deskripsi: document.getElementById('deskripsi-fasilitas').value,
      foto: document.getElementById('preview-fasilitas').src,
      status: 'baru',
      tanggal: formatDate(new Date()),
      username: currentUser.username
    };

    const store = getStore('fasilitasReports', 'readwrite');
    const request = store.add(data);
    request.onsuccess = () => {
      showToast('Laporan fasilitas berhasil dikirim!');
      this.reset();
      document.getElementById('preview-fasilitas').style.display = 'none';
      loadUserReports();
    };
  });

  // Submit piket form
  document.getElementById('piket-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const data = {
      nama: document.getElementById('nama-piket').value,
      kelas: currentUser.kelas,
      tanggal: document.getElementById('tanggal-piket').value,
      foto: document.getElementById('preview-piket').src,
      waktu: new Date().toLocaleString(),
      username: currentUser.username
    };

    const store = getStore('piketReports', 'readwrite');
    const request = store.add(data);
    request.onsuccess = () => {
      showToast('Absensi piket berhasil disimpan!');
      this.reset();
      document.getElementById('preview-piket').style.display = 'none';
      loadUserReports();
    };
  });

  function showUserDashboard(user) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('user-dashboard').style.display = 'block';
    document.getElementById('forms-section').style.display = 'block';
    document.getElementById('user-name').textContent = user.username;
    loadUserReports();
  }

  async function loadUserReports() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Load fasilitas reports
    const fasilitasStore = getStore('fasilitasReports');
    const fasilitasRequest = fasilitasStore.getAll();
    fasilitasRequest.onsuccess = () => {
      const reports = fasilitasRequest.result.filter(r => r.username === currentUser.username);
      const tbody = document.querySelector('#user-fasilitas-table tbody');
      tbody.innerHTML = '';
      reports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${report.lokasi}</td>
          <td><span class="badge bg-${report.status === 'selesai' ? 'success' : report.status === 'diproses' ? 'warning' : 'secondary'}">${report.status}</span></td>
          <td>${report.tanggal}</td>
        `;
        tbody.appendChild(row);
      });
    };

    // Load piket reports
    const piketStore = getStore('piketReports');
    const piketRequest = piketStore.getAll();
    piketRequest.onsuccess = () => {
      const reports = piketRequest.result.filter(r => r.username === currentUser.username);
      const tbody = document.querySelector('#user-piket-table tbody');
      tbody.innerHTML = '';
      reports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${report.tanggal}</td>
          <td>${report.waktu}</td>
        `;
        tbody.appendChild(row);
      });
    };
  }
});