// firebase-config.js (TEK KAYNAK - tüm sayfalar buradan kullanacak)
(function () {
  const FB_CFG = {
    apiKey: "AIzaSyCMwx6S6rq1lnNJuHOxc38ij3qU4ankSxs",
    authDomain: "raporanx.firebaseapp.com",
    projectId: "raporanx",
    storageBucket: "raporanx.firebasestorage.app",
    messagingSenderId: "715194328346",
    appId: "1:715194328346:web:46f0bb98941e01ead6f8a3",
    measurementId: "G-V749P1HB80"
  };

  if (!window.firebase || !firebase.initializeApp) {
    console.error("firebase-config.js: Firebase scriptleri yüklenmemiş (firebase yok).");
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(FB_CFG);
  }

  const auth = firebase.auth();

  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function (err) {
    console.warn("Auth persistence set edilemedi:", err?.code || err, err?.message || "");
  });

  const db = firebase.firestore();

  // ✅ SADECE 1 AYAR: pending/polling problemlerini çözer
  try {
    db.settings({
      experimentalForceLongPolling: true
    });
  } catch (e) {
    console.warn("Firestore settings set edilemedi (muhtemelen daha önce set edildi):", e?.message || e);
  }

  // ✅ BOZMAZ: sadece Firestore yazma hatalarını konsola net basar
  (function attachFirestoreWriteLogger() {
    if (window.__FS_WRITE_LOGGER__) return;
    window.__FS_WRITE_LOGGER__ = true;

    try {
      const protoDoc = firebase.firestore.DocumentReference.prototype;
      const protoCol = firebase.firestore.CollectionReference.prototype;

      const wrap = (obj, method) => {
        const orig = obj && obj[method];
        if (typeof orig !== "function") return;

        obj[method] = function (...args) {
          const path = (this && this.path) ? this.path : "(unknown path)";
          try {
            const p = orig.apply(this, args);
            if (p && typeof p.then === "function" && typeof p.catch === "function") {
              return p.catch(err => {
                console.error(`🔥 FIRESTORE ${method.toUpperCase()} ERR @ ${path}`, err);
                throw err;
              });
            }
            return p;
          } catch (err) {
            console.error(`🔥 FIRESTORE ${method.toUpperCase()} THROW @ ${path}`, err);
            throw err;
          }
        };
      };

      ["set", "update", "delete"].forEach(m => wrap(protoDoc, m));
      ["add"].forEach(m => wrap(protoCol, m));

      console.log("✅ Firestore write logger aktif");
    } catch (e) {
      console.warn("Firestore write logger kurulamadı:", e?.message || e);
    }
  })();

  window.FB_CFG = FB_CFG;
  window.auth = auth;
  window.db = db;

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
