const firebaseConfig = {
    apiKey: "AIzaSyCMwx6S6rq1lnNJuHOxc38ij3qU4ankSxs",
    authDomain: "raporanx.firebaseapp.com",
    projectId: "raporanx",
    storageBucket: "raporanx.firebasestorage.app",
    messagingSenderId: "715194328346",
    appId: "1:715194328346:web:46f0bb98941e01ead6f8a3"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Giriş kontrolü: Giriş yapmamışsa ana sayfaya atar
auth.onAuthStateChanged((user) => {
    if (!user && !window.location.href.includes('index.html')) {
        window.location.href = 'index.html';
    }
});