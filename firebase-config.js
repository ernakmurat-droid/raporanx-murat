// firebase-config.js (TEK KAYNAK - tüm sayfalar buradan kullanacak)
(function () {
  const FB_CFG = {
    apiKey: "AIzaSyCMwx6S6rq1lnNJuHOxc38ij3qU4ankSxs",
    authDomain: "raporanx.firebaseapp.com",
    projectId: "raporanx",
    storageBucket: "raporanx.firebasestorage.app",
    messagingSenderId: "715194328346",
    appId: "1:715194328346:web:46f0bb98941e01ead6f8a3"
  };

  // Firebase zaten başladıysa tekrar başlatma
  if (!firebase.apps.length) {
    firebase.initializeApp(FB_CFG);
  }

  // GLOBAL olarak dışarı ver (tüm sayfalar buradan kullanacak)
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.FB_CFG = FB_CFG;

  // İstersen bu guard'ı KALDIR (bazı sayfalarda saçma yönlendirme yapabiliyor)
  // auth.onAuthStateChanged((user) => {
  //   if (!user && !window.location.href.includes('index.html')) {
  //     window.location.href = 'index.html';
  //   }
  // });
})();
