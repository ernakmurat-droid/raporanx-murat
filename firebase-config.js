// Firebase projenin konsolundan aldığın bilgiler
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "projeniz.firebaseapp.com",
  projectId: "projeniz",
  storageBucket: "projeniz.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Firebase'i başlat
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ✅ DİKKAT: index.html'in bu değişkenlere erişebilmesi için pencereye (window) bağlamalıyız
window.db = firebase.firestore();
window.auth = firebase.auth();
