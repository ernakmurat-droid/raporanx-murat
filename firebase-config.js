// firebase-config.js (TEK KAYNAK - tüm sayfalar buradan kullanacak)
(function () {
  const FB_CFG = {
    apiKey: "AIzaSyCMwx6S6rq1lnNJuHOxc38ij3qU4ankSxs",
    authDomain: "raporanx.firebaseapp.com",
    projectId: "raporanx",
    storageBucket: "raporanx.firebasestorage.app",
    messagingSenderId: "715194328346",
    appId: "1:715194328346:web:46f0bb98941e01ead6f8a3",
    measurementId: "G-V749P1HB80" // Analytics için, zararsız
  };

  // Firebase zaten başladıysa tekrar başlatma
  if (!firebase.apps.length) {
    firebase.initializeApp(FB_CFG);
  }

  // GLOBAL olarak dışarı ver (tüm sayfalar buradan kullanacak)
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.FB_CFG = FB_CFG;

  // ✅ Mobil/PC oturum stabil olsun (özellikle mobil + iframe durumları için)
  // Not: Bazı tarayıcılarda 3rd-party cookie kısıtları olabilir, bu yine de en doğru ayar.
  window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function (err) {
    console.warn("Auth persistence set edilemedi:", err?.code || err, err?.message || "");
  });

  // ✅ Auth hazır olana kadar beklemek için ortak yardımcı
  // Kullanım: const user = await waitForAuth();
  window.waitForAuth = function () {
    return new Promise(function (resolve) {
      const unsub = window.auth.onAuthStateChanged(function (user) {
        if (user) {
          unsub();
          resolve(user);
        }
      });
    });
  };

  // ✅ Debug (istersen kapatırsın) — mobilde teşhis için hayat kurtarır
  window.__fbDebug = function () {
    const u = window.auth.currentUser;
    console.log("FB projectId:", window.FB_CFG?.projectId);
    console.log("FB auth ready:", !!u);
    console.log("FB uid:", u?.uid);
    console.log("FB email:", u?.email);
  };
})();
