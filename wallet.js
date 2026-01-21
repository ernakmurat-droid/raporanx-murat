/**
 * wallet.js (TEK DOSYA - HAK DÜŞÜRME DAHİL)
 * Firestore: users/{uid}/wallet/main + users/{uid}/wallet/main/uses/{rid}
 * - load(uid): cüzdanı oluşturur/okur
 * - consumeReport(uid, rid): aynı rid için 1 kez hak/ücret düşer (idempotent)
 * - UI: Sayfada walletCard, walletAmount, walletSub varsa günceller
 */
(function () {
  if (!window.firebase) {
    console.error("wallet.js: firebase yok!");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  const FieldValue = firebase.firestore.FieldValue;

  function n(v) { return Number(v ?? 0) || 0; }

  function tl(nm) {
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n(nm));
  }

  function walletMainRef(uid) {
    return db.collection("users").doc(uid).collection("wallet").doc("main");
  }

  function walletUseRef(uid, rid) {
    return walletMainRef(uid).collection("uses").doc(String(rid));
  }

  async function ensureWallet(uid) {
    const ref = walletMainRef(uid);
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        const init = {
          balance: 0,
          freeReportsLeft: 5,
          // İstersen burada fiyat koy: 100 gibi
          // pricePerReportTL: 100,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        tx.set(ref, init, { merge: true });
        return init;
      }

      const data = snap.data() || {};
      const patch = {};
      if (typeof data.balance !== "number") patch.balance = n(data.balance);
      if (typeof data.freeReportsLeft !== "number") patch.freeReportsLeft = n(data.freeReportsLeft);
      if (Object.keys(patch).length) {
        patch.updatedAt = FieldValue.serverTimestamp();
        tx.set(ref, patch, { merge: true });
        return { ...data, ...patch };
      }
      return data;
    });
  }

  function updateWalletUI(w) {
    // Senin rapor-detay panelinde bu 3 id var:
    const amountEl = document.getElementById("walletAmount");
    const subEl = document.getElementById("walletSub");

    if (!amountEl || !subEl) return;

    const balance = n(w?.balance);
    const freeLeft = n(w?.freeReportsLeft);

    amountEl.textContent = tl(balance) + " TL";
    subEl.textContent = `🎁 Ücretsiz rapor hakkın: ${freeLeft} • 💰 Bakiye: (gizli, tıkla gör)`;

    // global cache (istersen debug için)
    window.WALLET = { balance, freeReportsLeft: freeLeft };
  }

  async function loadWallet(uid) {
    const w = await ensureWallet(uid);
    updateWalletUI(w);
    return w;
  }

  /**
   * consumeReport(uid, rid)
   * - Aynı rid için 1 kere düşer (uses/{rid} kontrolü)
   * - Önce ücretsiz hak düşer, yoksa ücretli düşer (pricePerReportTL varsa)
   * - true/false döner
   */
  async function consumeReport(uid, rid) {
    if (!uid) throw new Error("consumeReport: uid yok");
    if (!rid) throw new Error("consumeReport: rid yok");

    const mainRef = walletMainRef(uid);
    const useRef = walletUseRef(uid, rid);

    const result = await db.runTransaction(async (tx) => {
      // 1) aynı rid daha önce düşmüş mü?
      const useSnap = await tx.get(useRef);
      if (useSnap.exists) {
        // zaten düşmüş
        const mainSnap2 = await tx.get(mainRef);
        const w2 = mainSnap2.exists ? (mainSnap2.data() || {}) : {};
        return { ok: true, already: true, wallet: w2 };
      }

      // 2) cüzdanı getir
      const mainSnap = await tx.get(mainRef);
      if (!mainSnap.exists) {
        // yoksa oluştur
        const init = {
          balance: 0,
          freeReportsLeft: 5,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        tx.set(mainRef, init, { merge: true });
      }

      const w = (mainSnap.exists ? (mainSnap.data() || {}) : {});
      let balance = n(w.balance);
      let freeLeft = n(w.freeReportsLeft);
      const priceTL = n(w.pricePerReportTL); // 0 ise ücretli kapalı gibi davranır

      // 3) ücretsizden düş
      if (freeLeft > 0) {
        freeLeft -= 1;

        tx.set(mainRef, {
          freeReportsLeft: freeLeft,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        tx.set(useRef, {
          usedAt: FieldValue.serverTimestamp(),
          kind: "free"
        }, { merge: true });

        return { ok: true, already: false, wallet: { ...w, freeReportsLeft: freeLeft, balance } };
      }

      // 4) ücretli düş
      if (priceTL <= 0) {
        // fiyat tanımlı değilse ücretli düşmeyelim
        return { ok: false, reason: "Ücretsiz hak bitti, ücretli fiyat tanımlı değil.", wallet: w };
      }

      if (balance < priceTL) {
        return { ok: false, reason: "Yetersiz bakiye.", wallet: w };
      }

      balance -= priceTL;

      tx.set(mainRef, {
        balance: balance,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(useRef, {
        usedAt: FieldValue.serverTimestamp(),
        kind: "paid",
        priceTL: priceTL
      }, { merge: true });

      return { ok: true, already: false, wallet: { ...w, freeReportsLeft, balance } };
    });

    if (result?.wallet) updateWalletUI(result.wallet);

    if (!result?.ok) {
      // false döndür ama istersen burada alert yapma (sayfa karar versin)
      return false;
    }
    return true;
  }

  function listenWallet(uid) {
    const ref = walletMainRef(uid);
    return ref.onSnapshot((snap) => {
      if (!snap.exists) return;
      updateWalletUI(snap.data() || {});
    });
  }

  // dışa aç
  window.Wallet = {
    load: loadWallet,
    ensure: ensureWallet,
    consumeReport,
    listen: listenWallet,
    ref: walletMainRef,
  };

  // otomatik yükle: sayfada wallet UI varsa doldursun
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      await loadWallet(user.uid);
    } catch (e) {
      console.log("wallet load error:", e?.message || e);
    }
  });
})();
