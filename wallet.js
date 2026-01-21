/**
 * wallet.js (stabil + rapor düşüm entegre)
 * Firestore:
 *  - users/{uid}/wallet/main
 *  - users/{uid}/wallet/charges/{rid}   (idempotent ücret/ücretsiz düşüm kaydı)
 */
(function () {
  // ✅ Güvenli global erişim
  const auth = window.auth || firebase.auth();
  const db = window.db || firebase.firestore();
  const { FieldValue } = firebase.firestore;

  // ✅ Rapor fiyatı (ücretsiz biterse buradan düşer)
  // İstersen 0 yap (şimdilik demo)
  const REPORT_PRICE_TL = 0; // ör: 250

  function tl(n) {
    const num = Number(n || 0);
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(num);
  }

  function walletRef(uid) {
    return db.collection("users").doc(uid).collection("wallet").doc("main");
  }

  function chargeRef(uid, rid) {
    return db.collection("users").doc(uid).collection("wallet").doc("charges").collection("items").doc(String(rid));
    // Alternatif daha sade path istersen:
    // return db.collection("users").doc(uid).collection("walletCharges").doc(String(rid));
  }

  async function ensureWallet(uid) {
    const ref = walletRef(uid);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        const init = {
          balance: 0,
          freeReportsLeft: 5,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        tx.set(ref, init, { merge: true });
        return init;
      } else {
        const data = snap.data() || {};
        const patch = {};
        if (typeof data.balance !== "number") patch.balance = Number(data.balance || 0);
        if (typeof data.freeReportsLeft !== "number") patch.freeReportsLeft = Number(data.freeReportsLeft || 0);
        if (Object.keys(patch).length) {
          patch.updatedAt = FieldValue.serverTimestamp();
          tx.set(ref, patch, { merge: true });
          return { ...data, ...patch };
        }
        return data;
      }
    });
    return result;
  }

  function updateWalletUI(w) {
    const bar = document.getElementById("walletBar");
    if (!bar) return;

    const balance = tl(w.balance);
    const freeLeft = Number(w.freeReportsLeft ?? 0);

    bar.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap;">
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <div style="font-weight:800;">Cüzdan</div>
          <div>🎁 Ücretsiz: <b>${freeLeft}</b> rapor</div>
          <div>💰 Bakiye: <b>${balance} TL</b></div>
        </div>
        <button id="btnWalletTopup"
          style="padding:8px 12px;border:none;border-radius:10px;cursor:pointer;font-weight:800;background:#00c853;color:#fff;">
          + Yükle
        </button>
      </div>
    `;

    const btn = document.getElementById("btnWalletTopup");
    if (btn) {
      btn.onclick = () => alert("Yükleme ekranını PayTR ile bağlayacağız. Şimdilik demo.");
    }
  }

  async function loadWallet(uid) {
    const w = await ensureWallet(uid);
    updateWalletUI(w);
    window.WALLET = { balance: Number(w.balance || 0), freeReportsLeft: Number(w.freeReportsLeft || 0) };
    return w;
  }

  function listenWallet(uid) {
    const ref = walletRef(uid);
    return ref.onSnapshot((snap) => {
      if (!snap.exists) return;
      const w = snap.data() || {};
      updateWalletUI(w);
      window.WALLET = { balance: Number(w.balance || 0), freeReportsLeft: Number(w.freeReportsLeft || 0) };
    });
  }

  /**
   * ✅ Rapor düşüm fonksiyonu (idempotent)
   * - Aynı rid için 2 kere düşmez
   * - Önce ücretsizden düşer
   * - Ücretsiz biterse bakiye kontrol eder
   * Return: true/false
   */
  async function consumeReport(uid, rid, priceTL = REPORT_PRICE_TL) {
    if (!uid) throw new Error("consumeReport: uid yok");
    if (!rid) throw new Error("consumeReport: rid yok");

    const wRef = walletRef(uid);
    const cRef = chargeRef(uid, rid);

    const ok = await db.runTransaction(async (tx) => {
      const cSnap = await tx.get(cRef);
      if (cSnap.exists) {
        // ✅ daha önce düşülmüş → tekrar düşme
        return true;
      }

      const wSnap = await tx.get(wRef);
      const w = wSnap.exists ? (wSnap.data() || {}) : { balance: 0, freeReportsLeft: 0 };

      let balance = Number(w.balance || 0);
      let freeLeft = Number(w.freeReportsLeft || 0);

      // ücretsiz varsa ücretsizden düş
      if (freeLeft > 0) {
        freeLeft -= 1;

        tx.set(wRef, {
          balance,
          freeReportsLeft: freeLeft,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        tx.set(cRef, {
          rid: String(rid),
          type: "free",
          amountTL: 0,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return true;
      }

      // ücretsiz yoksa para
      const cost = Number(priceTL || 0);
      if (cost <= 0) {
        // fiyat 0 ise yine de idempotent kayıt açalım (kilit + tekrar önler)
        tx.set(cRef, {
          rid: String(rid),
          type: "free-price0",
          amountTL: 0,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
      }

      if (balance < cost) return false;

      balance -= cost;

      tx.set(wRef, {
        balance,
        freeReportsLeft: freeLeft,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(cRef, {
        rid: String(rid),
        type: "paid",
        amountTL: cost,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return true;
    });

    // UI'yi tazele (opsiyonel)
    try { await loadWallet(uid); } catch {}

    return ok;
  }

  // Global API
  window.Wallet = {
    load: loadWallet,
    ensure: ensureWallet,
    ui: updateWalletUI,
    listen: listenWallet,
    ref: walletRef,
    consumeReport, // ✅ yeni
  };

  // ✅ Auth güvenli dinleme (hata verse bile sayfayı çökertmesin)
  try {
    auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        await loadWallet(user.uid);
      } catch (e) {
        console.log("wallet error:", e);
      }
    });
  } catch (e) {
    console.log("wallet auth hook error:", e);
  }
})();
