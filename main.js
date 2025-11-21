// main.js
import { firebaseDB, firebaseStorage } from './firebase-app.js';
const { db, ref, get, set, push, remove, update, onValue } = firebaseDB;
const { storage, storageRef, uploadBytes, getDownloadURL } = firebaseStorage;

const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Toast
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  msgEl.textContent = msg;
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  new bootstrap.Toast(toast).show();
}

// Theme
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') document.body.classList.add('dark-mode');
document.getElementById('toggle-theme')?.addEventListener('change', e => {
  if (e.target.checked) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  }
});

// Login Siswa (index.html)
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    const snap = await get(ref(db, 'users/' + username));
    if (snap.exists() && snap.val().password === password) {
      localStorage.setItem('currentUser', JSON.stringify({ username, ...snap.val() }));
      location.href = 'home.html';
    } else {
      toast('Username atau password salah!', 'danger');
    }
  });
}

// Proteksi halaman siswa
if (location.pathname.includes('home.html') || location.pathname.includes('laporan.html') || location.pathname.includes('piket.html')) {
  if (!currentUser) location.href = 'index.html';

  // Isi nama di semua halaman
  document.querySelectorAll('#nama-fasilitas, #nama-piket').forEach(el => el.value = currentUser?.nama || '');
  document.getElementById('user-name') && (document.getElementById('user-name').textContent = currentUser.nama);
  document.getElementById('user-class') && (document.getElementById('user-class').textContent = currentUser.kelas);

  // Greeting & jam
  const hour = new Date().getHours();
  document.getElementById('greeting') && (document.getElementById('greeting').textContent = 
    hour < 10 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam');
  setInterval(() => {
    document.getElementById('current-time') && (document.getElementById('current-time').textContent = new Date().toLocaleTimeString('id-ID'));
  }, 1000);
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  location.href = 'index.html';
});

// Preview foto
document.querySelectorAll('input[type="file"]').forEach(input => {
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const previewId = input.id.replace('foto', 'preview');
      const preview = document.getElementById(previewId);
      if (preview) {
        preview.src = ev.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  });
});

// Kirim Laporan Fasilitas
document.getElementById('fasilitas-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const file = document.getElementById('foto-fasilitas').files[0];
  if (!file) return toast('Foto wajib diupload!', 'warning');

  const storagePath = `laporan/${Date.now()}_${file.name}`;
  const snapshot = await uploadBytes(storageRef(storage, storagePath), file);
  const fotoUrl = await getDownloadURL(snapshot.ref);

  const kategori = document.getElementById('kategori-fasilitas').value === 'Lainnya' 
    ? document.getElementById('custom-kategori').value : document.getElementById('kategori-fasilitas').value;

  const data = {
    nama: currentUser.nama,
    kelas: currentUser.kelas,
    lokasi: document.getElementById('lokasi-fasilitas').value,
    kategori,
    prioritas: document.getElementById('prioritas-fasilitas').value,
    deskripsi: document.getElementById('deskripsi-fasilitas').value,
    foto: fotoUrl,
    status: 'baru',
    tanggal: new Date().toISOString().split('T')[0],
    username: currentUser.username,
    timestamp: Date.now()
  };

  await push(ref(db, 'fasilitasReports'), data);
  toast('Laporan berhasil dikirim!');
  e.target.reset();
  document.getElementById('preview-fasilitas').style.display = 'none';
});

// Kirim Absensi Piket
document.getElementById('piket-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const file = document.getElementById('foto-piket').files[0];
  if (!file) return toast('Foto bukti wajib!', 'warning');

  const storagePath = `piket/${Date.now()}_${file.name}`;
  const snapshot = await uploadBytes(storageRef(storage, storagePath), file);
  const fotoUrl = await getDownloadURL(snapshot.ref);

  const data = {
    nama: currentUser.nama,
    kelas: currentUser.kelas,
    tanggal: document.getElementById('tanggal-piket').value || new Date().toISOString().split('T')[0],
    foto: fotoUrl,
    waktu: new Date().toLocaleTimeString('id-ID'),
    username: currentUser.username,
    timestamp: Date.now()
  };

  await push(ref(db, 'piketReports'), data);
  toast('Absen piket berhasil!');
  e.target.reset();
  document.getElementById('preview-piket').style.display = 'none';
});

// ==================== ADMIN SECTION ====================
if (location.pathname.includes('admin.html')) {
  // Login Admin
  document.getElementById('admin-login-form')?.addEventListener('submit', e => {
    e.preventDefault();
    if (document.getElementById('admin-password').value === 'admin123') {
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('admin-content').style.display = 'block';
      loadAdminData();
    } else toast('Password salah!', 'danger');
  });

  // Toggle admin password
  document.getElementById('toggle-admin-password')?.addEventListener('click', function() {
    const input = document.getElementById('admin-password');
    if (input.type === 'password') {
      input.type = 'text';
      this.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
      input.type = 'password';
      this.classList.replace('bi-eye-slash', 'bi-eye');
    }
  });

  async function loadAdminData() {
    // Load Siswa
    const snap = await get(ref(db, 'users'));
    const tbody = document.querySelector('#students-table tbody');
    tbody.innerHTML = '';
    snap.forEach(child => {
      const u = child.val();
      if (u.role === 'admin') return; // skip admin user
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${child.key}</td>
        <td>${u.nisn || '-'}</td>
        <td>${u.nama}</td>
        <td>${u.kelas}</td>
        <td>${u.phone || '-'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="hapusSiswa('${child.key}')">Hapus</button>
        </td>`;
      tbody.appendChild(tr);
    });

    // Load Laporan Real-time
    onValue(ref(db, 'fasilitasReports'), snap => {
      const tbody = document.querySelector('#fasilitas-table tbody');
      tbody.innerHTML = '';
      snap.forEach(child => {
        const d = child.val();
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${d.nama}</td><td>${d.lokasi}</td><td><span class="badge bg-warning">${d.status}</span></td><td>${d.tanggal}</td>
          <td><a href="${d.foto}" target="_blank">Lihat</a></td>`;
        tbody.appendChild(tr);
      });
    });

    // Load Piket Real-time
    onValue(ref(db, 'piketReports'), snap => {
      const tbody = document.querySelector('#piket-table tbody');
      tbody.innerHTML = '';
      snap.forEach(child => {
        const d = child.val();
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${d.nama}</td><td>${d.kelas}</td><td>${d.tanggal}</td><td>${d.waktu}</td>
          <td><a href="${d.foto}" target="_blank">Lihat</a></td>`;
        tbody.appendChild(tr);
      });
    });
  }

  // Tambah Siswa
  document.getElementById('add-student-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('student-username').value.trim();
    const password = document.getElementById('student-password').value;
    const data = {
      password,
      nama: document.getElementById('student-nama').value,
      nisn: document.getElementById('student-nisn').value,
      kelas: document.getElementById('student-kelas').value,
      phone: document.getElementById('student-phone').value
    };
    await set(ref(db, 'users/' + username), data);
    toast('Siswa berhasil ditambahkan!');
    e.target.reset();
    loadAdminData();
  });

  window.hapusSiswa = async username => {
    if (confirm('Yakin hapus siswa ini?')) {
      await remove(ref(db, 'users/' + username));
      toast('Siswa dihapus');
      loadAdminData();
    }
  };
}
