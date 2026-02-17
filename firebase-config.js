// firebase-config.js (TEK KAYNAK - tüm sayfalar buradan kullanacak)
(function () {
  // ✅ Firebase config (webde görünmesi normaldir; güvenlik rules ile sağlanır)
  const FB_CFG = {
    apiKey: "AIzaSyCMwx6S6rq1lnNJuHOxc38ij3qU4ankSxs",
    authDomain: "raporanx.firebaseapp.com",
    projectId: "raporanx",
    storageBucket: "raporanx.firebasestorage.app",
    messagingSenderId: "715194328346",
    appId: "1:715194328346:web:46f0bb98941e01ead6f8a3",
    measurementId: "G-V749P1HB80"
  };

  // 0) Firebase yüklü mü?
  if (!window.firebase || !firebase.initializeApp) {
    console.error("firebase-config.js: Firebase scriptleri yüklenmemiş (firebase yok).");
    return;
  }

  // 1) Init (tek sefer)
  if (!firebase.apps.length) {
    firebase.initializeApp(FB_CFG);
  }

  // 2) Auth
  const auth = firebase.auth();

  // ✅ Oturum kalıcı olsun
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function (err) {
    console.warn("Auth persistence set edilemedi:", err?.code || err, err?.message || "");
  });

  // 3) Firestore (Long Polling fix + güvenli init)
  // 🔧 Bazı ağlarda (ISS/modem/AdBlock/proxy) Firestore istekleri "pending" kalır.
  // Bu ayar bunu çözer.
  const db = firebase.firestore();
  try {
    db.settings({
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true
    });
  } catch (e) {
    // settings bazen sadece ilk çağrıda alınır; sorun değil
    console.warn("Firestore settings set edilemedi (muhtemelen daha önce set edildi):", e?.message || e);
  }

  // 4) Global export
  window.FB_CFG = FB_CFG;
  window.auth = auth;
  window.db = db;

  // 5) Auth hazır olana kadar beklemek için helper
  window.waitForAuth = function () {
    return new Promise(function (resolve) {
      const unsub = auth.onAuthStateChanged(function (user) {
        if (user) {
          unsub();
          resolve(user);
        }
      });
    });
  };

  // 6) Debug helper
  window.__fbDebug = function () {
    const u = auth.currentUser;
    console.log({
      projectId: FB_CFG.projectId,
      authDomain: FB_CFG.authDomain,
      online: navigator.onLine,
      uid: u?.uid,
      email: u?.email,
      apps: firebase.apps.length
    });
  };
})();
