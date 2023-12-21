const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const firebase = require('firebase/app');

const app = express();
const port = process.env.PORT || 3000;

try {
  const serviceAccount = require('./JSON/quick-formula-405704-firebase-adminsdk-cnzjy-80571da287.json');
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
    const userRecord = await admin.auth().createUser({ email, password, });

    // Menyimpan data tambahan username di Firestore
    const userData = { email, username, password };
    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    return res.status(201).json({ message: 'Pengguna berhasil terdaftar', uid: userRecord.uid });
  } catch (error) {
    console.error('Error saat registrasi:', error);
    if (error.code === 'auth/user-already-exists') {
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    } else {
      return res.status(500).json({ error: 'Gagal melakukan registrasi. Silakan coba lagi.' });
    }
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate user input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan Password diperlukan.' });
    }

    // Verify password using Firebase Admin SDK
    const userRecord = await admin.auth().getUserByEmail(email);
    if (!userRecord) {
      return res.status(401).json({ error: 'Email tidak ditemukan.' });
    }

    // Get user data from Firestore
    const userData = await admin.firestore().collection('users').doc(userRecord.uid).get();
    const userDetails = userData.data();

    // Construct the response in the desired format
    const loginResult = {
      userId: userRecord.uid,
      name: userDetails.username,
      token: await admin.auth().createCustomToken(userRecord.uid)
    };

    res.json({
      error: false,
      message: 'success',
      loginResult: loginResult
    });
  } catch (error) {
    console.error('Error saat login:', error);
    res.status(500).json({ error: 'Gagal melakukan login. Silakan coba lagi.' });
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

app.put('/update-username', async (req, res) => {
  try {
    const { userId, newUsername } = req.body;

    if (!userId || !newUsername) {
      return res.status(400).json({ error: 'UserId dan newUsername diperlukan untuk pembaruan.' });
    }

    // Update the username in Firestore
    await admin.firestore().collection('users').doc(userId).update({
      username: newUsername
    });
  
    return res.status(200).json({ message: 'Username berhasil diperbarui.' });
  } catch (error) {
    console.error('Error saat memperbarui username:', error);
    return res.status(500).json({ error: 'Gagal memperbarui username. Silakan coba lagi.' });
  }
});  

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
