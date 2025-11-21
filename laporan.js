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

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  toastMessage.textContent = message;
  toast.className = `toast align-items-center text-white bg-${type} border-0 animate-pop-up`;
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Function to apply theme
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    const toggleBtn = document.getElementById('toggle-theme');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="bi bi-sun"></i> Mode Terang';
    }
  } else {
    document.body.classList.remove('dark-mode');
    const toggleBtn = document.getElementById('toggle-theme');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="bi bi-moon"></i> Mode Gelap';
    }
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    await openDB();

    // Apply saved theme immediately
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Toggle theme
    const toggleBtn = document.getElementById('toggle-theme');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (document.body.classList.contains('dark-mode')) {
          document.body.classList.remove('dark-mode');
          localStorage.setItem('theme', 'light');
          toggleBtn.innerHTML = '<i class="bi bi-moon"></i> Mode Gelap';
        } else {
          document.body.classList.add('dark-mode');
          localStorage.setItem('theme', 'dark');
          toggleBtn.innerHTML = '<i class="bi bi-sun"></i> Mode Terang';
        }
      });
    }

    const fasilitasForm = document.getElementById('fasilitas-form');
    const namaFasilitas = document.getElementById('nama-fasilitas');
    const lokasiFasilitas = document.getElementById('lokasi-fasilitas');
    const kategoriFasilitas = document.getElementById('kategori-fasilitas');
    const prioritasFasilitas = document.getElementById('prioritas-fasilitas');
    const deskripsiFasilitas = document.getElementById('deskripsi-fasilitas');
    const fotoFasilitas = document.getElementById('foto-fasilitas');
    const previewFasilitas = document.getElementById('preview-fasilitas');
    const customKategoriContainer = document.getElementById('custom-kategori-container');

    // Load student name from currentUser and set readonly
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.nama) {
      namaFasilitas.value = currentUser.nama;
      namaFasilitas.readOnly = true;
    } else {
      window.location.href = 'index.html';
      return;
    }

    // Show/hide custom kategori field
    if (kategoriFasilitas) {
      kategoriFasilitas.addEventListener('change', function() {
        if (this.value === 'Lainnya') {
          customKategoriContainer.style.display = 'block';
        } else {
          customKategoriContainer.style.display = 'none';
        }
      });
    }

    // Preview image when selected
    if (fotoFasilitas) {
      fotoFasilitas.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
            previewFasilitas.src = e.target.result;
            previewFasilitas.style.display = 'block';
          };
          reader.readAsDataURL(file);
        } else {
          previewFasilitas.style.display = 'none';
        }
      });
    }

    // Handle form submission
    if (fasilitasForm) {
      fasilitasForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        let kategori = kategoriFasilitas.value;
        if (kategori === 'Lainnya') {
          kategori = document.getElementById('custom-kategori').value.trim();
          if (!kategori) {
            showToast('Mohon isi kategori lainnya!', 'warning');
            return;
          }
        }

        if (!fotoFasilitas.files[0]) {
          showToast('Mohon upload foto kerusakan!', 'warning');
          return;
        }

        const reportData = {
          nama: namaFasilitas.value.trim(),
          kelas: currentUser.kelas,
          lokasi: lokasiFasilitas.value.trim(),
          kategori: kategori,
          prioritas: prioritasFasilitas.value.trim(),
          deskripsi: deskripsiFasilitas.value.trim(),
          foto: await fileToBase64(fotoFasilitas.files[0]),
          status: 'baru',
          tanggal: formatDate(new Date()),
          username: currentUser.username
        };

        const store = getStore('fasilitasReports', 'readwrite');
        const request = store.add(reportData);
        request.onsuccess = () => {
          showToast('Laporan berhasil dikirim!');
          fasilitasForm.reset();
          namaFasilitas.value = currentUser.nama;
          previewFasilitas.style.display = 'none';
          customKategoriContainer.style.display = 'none';
        };
        request.onerror = () => {
          showToast('Gagal mengirim laporan!', 'danger');
        };
      });
    }
  } catch (error) {
    console.error('Error initializing page:', error);
    showToast('Terjadi kesalahan saat memuat halaman', 'danger');
  }
});