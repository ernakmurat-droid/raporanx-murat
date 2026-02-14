/**
 * wallet.js (TEK DOSYA - HAK DÜŞÜRME DAHİL)
 * Firestore: users/{uid}/wallet/main + users/{uid}/wallet/main/uses/{rid}
 * - load(uid): cüzdanı oluşturur/okur
 * - consumeReport(uid, rid): aynı rid için 1 kez hak düşer (idempotent)
 * - UI: Sayfada walletAmount, walletSub varsa günceller
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

      // İlk kez oluştur
      if (!snap.exists) {
        const init = {
          // Eski alanları bozmayalım diye bırakıyorum (kullanmasak da olur)
          balance: 0,

          // Deneme hakları (sen istedin: 5 kalsın)
          freeReportsLeft: 5,

          // Paketlerden gelecek haklar
          reportCredits: 0,

          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        tx.set(ref, init, { merge: true });
        return init;
      }

      // Varsa ama alanlar eksik/yanlış tipse düzelt
      const data = snap.data() || {};
      const patch = {};

      if (typeof data.balance !== "number") patch.balance = n(data.balance);
      if (typeof data.freeReportsLeft !== "number") patch.freeReportsLeft = n(data.freeReportsLeft);
      if (typeof data.reportCredits !== "number") patch.reportCredits = n(data.reportCredits);

      if (Object.keys(patch).length) {
        patch.updatedAt = FieldValue.serverTimestamp();
        tx.set(ref, patch, { merge: true });
        return { ...data, ...patch };
      }

      return data;
    });
  }

  function updateWalletUI(w) {
    const amountEl = document.getElementById("walletAmount");
    const subEl = document.getElementById("walletSub");
    if (!amountEl || !subEl) return;

    const credits = n(w?.reportCredits);
    const freeLeft = n(w?.freeReportsLeft);

    amountEl.textContent = `${credits} Hak`;
    subEl.textContent = `🎁 Ücretsiz: ${freeLeft} • Toplam: ${credits + freeLeft}`;

    window.WALLET = { reportCredits: credits, freeReportsLeft: freeLeft };
  }

  async function loadWallet(uid) {
    const w = await ensureWallet(uid);
    updateWalletUI(w);
    return w;
  }

  /**
   * consumeReport(uid, rid)
   * - Aynı rid için 1 kere düşer (uses/{rid} kontrolü)
   * - Önce reportCredits düşer, yoksa freeReportsLeft düşer
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
        const mainSnap2 = await tx.get(mainRef);
        const w2 = mainSnap2.exists ? (mainSnap2.data() || {}) : {};
        return { ok: true, already: true, wallet: w2 };
      }

      // 2) cüzdanı getir (yoksa oluştur)
      const mainSnap = await tx.get(mainRef);
      if (!mainSnap.exists) {
        const init = {
          balance: 0,
          freeReportsLeft: 5,
          reportCredits: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        tx.set(mainRef, init, { merge: true });

        // Oluşturduk ama elimizde snap yok; init ile devam edelim
        const wInit = init;

        // Önce reportCredits (0), sonra freeReportsLeft (5)
        let creditsInit = n(wInit.reportCredits);
        let freeInit = n(wInit.freeReportsLeft);

        if (creditsInit > 0) {
          creditsInit -= 1;
          tx.set(mainRef, { reportCredits: creditsInit, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          tx.set(useRef, { usedAt: FieldValue.serverTimestamp(), kind: "credit" }, { merge: true });
          return { ok: true, already: false, wallet: { ...wInit, reportCredits: creditsInit, freeReportsLeft: freeInit } };
        }

        if (freeInit > 0) {
          freeInit -= 1;
          tx.set(mainRef, { freeReportsLeft: freeInit, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          tx.set(useRef, { usedAt: FieldValue.serverTimestamp(), kind: "free" }, { merge: true });
          return { ok: true, already: false, wallet: { ...wInit, reportCredits: creditsInit, freeReportsLeft: freeInit } };
        }

        return { ok: false, reason: "Rapor hakkınız yok.", wallet: wInit };
      }

      const w = mainSnap.data() || {};
      let credits = n(w.reportCredits);
      let freeLeft = n(w.freeReportsLeft);

      // 3) önce satın alınmış haktan düş
      if (credits > 0) {
        credits -= 1;

        tx.set(mainRef, {
          reportCredits: credits,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        tx.set(useRef, {
          usedAt: FieldValue.serverTimestamp(),
          kind: "credit",
        }, { merge: true });

        return { ok: true, already: false, wallet: { ...w, reportCredits: credits, freeReportsLeft: freeLeft } };
      }

      // 4) sonra ücretsiz haktan düş
      if (freeLeft > 0) {
        freeLeft -= 1;

        tx.set(mainRef, {
          freeReportsLeft: freeLeft,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        tx.set(useRef, {
          usedAt: FieldValue.serverTimestamp(),
          kind: "free",
        }, { merge: true });

        return { ok: true, already: false, wallet: { ...w, reportCredits: credits, freeReportsLeft: freeLeft } };
      }

      // 5) hak yok
      return { ok: false, reason: "Rapor hakkınız yok.", wallet: w };
    });

    if (result?.wallet) updateWalletUI(result.wallet);
    return !!result?.ok;
  }

  function listenWallet(uid) {
    const ref = walletMainRef(uid);
    return ref.onSnapshot((snap) => {
      if (!snap.exists) return;
      updateWalletUI(snap.data() || {});
    });
  }

  window.Wallet = {
    load: loadWallet,
    ensure: ensureWallet,
    consumeReport,
    listen: listenWallet,
    ref: walletMainRef,
  };

  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      await loadWallet(user.uid);
    } catch (e) {
      console.log("wallet load error:", e?.message || e);
    }
  });
})();
