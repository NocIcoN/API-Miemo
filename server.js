const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
const port = process.env.PORT || 3000;

try {
  const serviceAccount = require('./JSON/quick-formula-405704-firebase-adminsdk-cnzjy-0f51565b35.json');
  admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} catch (error) {
  console.error('Error saat menginisialisasi Firebase Admin SDK:', error);
  process.exit(1);
}

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Welcome to the Firebase Auth API!');
});

app.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, Username, dan Password diperlukan.' });
    }

    // Membuat user dengan Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    // Menyimpan data tambahan seperti username di Firestore
    const userData = { email, username };
    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    return res.status(201).json({ message: 'Pengguna berhasil terdaftar', uid: userRecord.uid });
  } catch (error) {
    console.error('Error saat registrasi:', error);
    return res.status(500).json({ error: 'Gagal melakukan registrasi. Silakan coba lagi.' });
  }
});

app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
  
      if (!username || !password) {
        return res.status(400).json({ error: 'Username dan Password diperlukan.' });
      }
  
      // Mendapatkan data pengguna dari Firestore berdasarkan username
      const userSnapshot = await admin.firestore().collection('users').where('username', '==', username).get();
  
      if (userSnapshot.empty) {
        return res.status(401).json({ error: 'Username tidak ditemukan.' });
      }
  
      const userData = userSnapshot.docs[0].data();
      const userEmail = userData.email;
  
      // Autentikasi dengan Firebase Auth menggunakan email yang terkait dengan username
      await admin.auth().signInWithEmailAndPassword(userEmail, password);
  
      // Menghasilkan token akses
      const token = await admin.auth().createCustomToken(userData.uid);
  
      return res.status(200).json({ token });
    } catch (error) {
      console.error('Error saat login:', error);
  
      // Jika ada kesalahan autentikasi, kirim respons kesalahan yang sesuai
      if (error.code === 'auth/wrong-password') {
        return res.status(401).json({ error: 'Password salah.' });
      }
  
      return res.status(500).json({ error: 'Gagal melakukan login. Silakan coba lagi.' });
    }
  });

  app.post('/submit-text', async (req, res) => {
    try {
      const { userId, text } = req.body;
  
      if (!userId || !text) {
        return res.status(400).json({ error: 'UserId dan teks diperlukan.' });
      }
  
      // Menyimpan teks di Firestore
      await admin.firestore().collection('texts').doc(userId).set({ text });
  
      return res.status(201).json({ message: 'Teks berhasil disimpan.' });
    } catch (error) {
      console.error('Error saat menyimpan teks:', error);
      return res.status(500).json({ error: 'Gagal menyimpan teks. Silakan coba lagi.' });
    }
  });

  app.get('/get-text/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
  
      if (!userId) {
        return res.status(400).json({ error: 'UserId diperlukan.' });
      }
  
      // Mengambil teks dari Firestore
      const doc = await admin.firestore().collection('texts').doc(userId).get();
  
      if (!doc.exists) {
        return res.status(404).json({ error: 'Teks tidak ditemukan.' });
      }
  
      return res.status(200).json(doc.data());
    } catch (error) {
      console.error('Error saat mengambil teks:', error);
      return res.status(500).json({ error: 'Gagal mengambil teks. Silakan coba lagi.' });
    }
  });
  
  app.delete('/delete-text/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
  
      if (!userId) {
        return res.status(400).json({ error: 'UserId diperlukan.' });
      }
  
      // Menghapus teks dari Firestore
      await admin.firestore().collection('texts').doc(userId).delete();
  
      return res.status(200).json({ message: 'Teks berhasil dihapus.' });
    } catch (error) {
      console.error('Error saat menghapus teks:', error);
      return res.status(500).json({ error: 'Gagal menghapus teks. Silakan coba lagi.' });
    }
  });

  app.put('/update-text/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { text } = req.body;
  
      if (!userId || !text) {
        return res.status(400).json({ error: 'UserId dan teks diperlukan untuk pembaruan.' });
      }
  
      // Memperbarui teks di Firestore
      await admin.firestore().collection('texts').doc(userId).set({ text }, { merge: true });
  
      return res.status(200).json({ message: 'Teks berhasil diperbarui.' });
    } catch (error) {
      console.error('Error saat memperbarui teks:', error);
      return res.status(500).json({ error: 'Gagal memperbarui teks. Silakan coba lagi.' });
    }
  });  

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
