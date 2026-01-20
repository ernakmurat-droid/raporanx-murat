/**
 * wallet.js
 * Firestore: users/{uid}/wallet/main
 * UI: #walletBar varsa doldurur
 */

(function () {
  function tl(n) {
    const num = Number(n || 0);
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(num);
  }

  async function ensureWallet(uid) {
    const ref = db.collection("users").doc(uid).collection("wallet").doc("main");
    const snap = await ref.get();
    if (!snap.exists) {
      const init = {
        balance: 0,
        freeReportsLeft: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await ref.set(init, { merge: true });
      return init;
    }
    return snap.data();
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
        alert("Yükleme ekranını birazdan PayTR ile bağlayacağız. Şimdilik demo.");
      };
    }
  }

  async function loadWallet(uid) {
    const w = await ensureWallet(uid);
    updateWalletUI(w);
    window.WALLET = w;
    return w;
  }

  window.Wallet = { load: loadWallet, ensure: ensureWallet, ui: updateWalletUI };

  // Oturum varsa otomatik yükle
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try { await loadWallet(user.uid); } catch (e) { console.log("wallet error:", e); }
  });
})();
