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
    const toggleElement = document.getElementById('toggle-theme');
    if (toggleElement) {
      toggleElement.checked = true;
    }
  } else {
    document.body.classList.remove('dark-mode');
    const toggleElement = document.getElementById('toggle-theme');
    if (toggleElement) {
      toggleElement.checked = false;
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
    const toggleTheme = document.getElementById('toggle-theme');
    if (toggleTheme) {
      toggleTheme.addEventListener('change', (e) => {
        if (e.target.checked) {
          document.body.classList.add('dark-mode');
          localStorage.setItem('theme', 'dark');
        } else {
          document.body.classList.remove('dark-mode');
          localStorage.setItem('theme', 'light');
        }
      });
    }

    const piketForm = document.getElementById('piket-form');
    const namaPiket = document.getElementById('nama-piket');
    const tanggalPiket = document.getElementById('tanggal-piket');
    const fotoPiket = document.getElementById('foto-piket');
    const previewPiket = document.getElementById('preview-piket');

    // Load student name from currentUser and set readonly
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.nama) {
      namaPiket.value = currentUser.nama;
      namaPiket.readOnly = true;
    } else {
      window.location.href = 'index.html';
      return;
    }

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    tanggalPiket.value = today;

    // Preview image when selected
    if (fotoPiket) {
      fotoPiket.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
            previewPiket.src = e.target.result;
            previewPiket.style.display = 'block';
          };
          reader.readAsDataURL(file);
        } else {
          previewPiket.style.display = 'none';
        }
      });
    }

    // Handle form submission
    if (piketForm) {
      piketForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        if (!fotoPiket.files[0]) {
          showToast('Mohon upload foto bukti piket!', 'warning');
          return;
        }

        const reportData = {
          nama: namaPiket.value.trim(),
          kelas: currentUser.kelas,
          tanggal: tanggalPiket.value.trim(),
          foto: await fileToBase64(fotoPiket.files[0]),
          waktu: new Date().toLocaleTimeString('id-ID'),
          timestamp: new Date().toISOString(),
          username: currentUser.username
        };

        const store = getStore('piketReports', 'readwrite');
        const request = store.add(reportData);
        request.onsuccess = () => {
          showToast('Absensi berhasil dikirim!');
          piketForm.reset();
          namaPiket.value = currentUser.nama;
          tanggalPiket.value = today;
          previewPiket.style.display = 'none';
        };
        request.onerror = () => {
          showToast('Gagal mengirim absensi!', 'danger');
        };
      });
    }
  } catch (error) {
    console.error('Error initializing page:', error);
    showToast('Terjadi kesalahan saat memuat halaman', 'danger');
  }
});