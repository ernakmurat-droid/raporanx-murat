/**
 * wallet.js (düzeltilmiş & entegre sürüm)
 * Firestore: users/{uid}/wallet/main
 * UI: #walletBar varsa doldurur
 */
(function () {
  const db = firebase.firestore(); // 🔹 Eksik olan satır eklendi
  const { FieldValue } = firebase.firestore;

  function tl(n) {
    const num = Number(n || 0);
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(num);
  }

  function walletRef(uid) {
    return db.collection("users").doc(uid).collection("wallet").doc("main");
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
      btn.onclick = () => {
        // buraya PayTR veya ödeme yönlendirme API'sini bağlayabilirsin
        alert("Yükleme ekranını PayTR ile bağlayacağız. Şimdilik demo.");
      };
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

  window.Wallet = {
    load: loadWallet,
    ensure: ensureWallet,
    ui: updateWalletUI,
    listen: listenWallet,
    ref: walletRef,
  };

  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      await loadWallet(user.uid);
      // İstersen anlık dinlemeyi aç:
      // window.__WALLET_UNSUB && window.__WALLET_UNSUB();
      // window.__WALLET_UNSUB = listenWallet(user.uid);
    } catch (e) {
      console.log("wallet error:", e);
    }
  });
})();
