/**
 * wallet.js (TEK DOSYA - HAK + SİPARİŞ + HAK DÜŞÜRME)
 * Firestore:
 *  - users/{uid}/wallet/main
 *  - users/{uid}/wallet/main/uses/{rid}          // rapor tüketim kaydı (idempotent)
 *  - users/{uid}/orders/{orderId}               // paket satın alma isteği
 */
(function () {
  if (!window.firebase) {
    console.error("wallet.js: firebase yok! (firebase scriptleri yüklenmedi)");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  const FieldValue = firebase.firestore.FieldValue;

  const USERS_COL = "kullanicilar";

  const PACKS = {
    P120: { priceTL: 120, credits: 4, title: "120 TL • 4 Hak" },
    P200: { priceTL: 200, credits: 8, title: "200 TL • 8 Hak" },
    P500: { priceTL: 500, credits: 25, title: "500 TL • 25 Hak" },
  };

  function n(v) { return Number(v ?? 0) || 0; }

  function tl(nm) {
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n(nm));
  }

  function walletMainRef(uid) {
    return db.collection(USERS_COL).doc(uid).collection("wallet").doc("main");
  }

  function walletUseRef(uid, rid) {
    return walletMainRef(uid).collection("uses").doc(String(rid));
  }

  function ordersColRef(uid) {
  return db.collection(USERS_COL).doc(uid).collection("siparisler");
}

  function orderRef(uid, orderId) {
    return ordersColRef(uid).doc(String(orderId));
  }

  // ✅ Siparişleri tek seferlik çek (opsiyonel filtre)
  async function listOrders(uid, statuses) {
    if (!uid) throw new Error("listOrders: uid yok");

    let q = ordersColRef(uid).orderBy("createdAt", "desc").limit(50);

    if (Array.isArray(statuses) && statuses.length) {
      q = ordersColRef(uid)
        .where("status", "in", statuses.slice(0, 10))
        .orderBy("createdAt", "desc")
        .limit(50);
    }

    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
  }

  // ✅ Siparişleri canlı dinle (EN GARANTİ: status filtresi yok)
  function listenOrders(uid, cb) {
    if (!uid) throw new Error("listenOrders: uid yok");
    if (typeof cb !== "function") throw new Error("listenOrders: cb function olmalı");

    return ordersColRef(uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .onSnapshot(
        (snap) => {
          const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
          cb(arr);
        },
        (err) => {
          console.error("listenOrders snapshot ERR:", err);
          cb([{ id: "ERR", packTitle: "HATA", status: err?.message || String(err), priceTL:"", credits:"" }]);
        }
      );
  }

  async function ensureWallet(uid) {
    const ref = walletMainRef(uid);

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        const init = {
          balance: 0,
          freeReportsLeft: 5,
          reportCredits: 0,
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

    const balance = n(w?.balance);
    const freeLeft = n(w?.freeReportsLeft);
    const credits = n(w?.reportCredits);

    amountEl.textContent = `🎟️ ${freeLeft + credits} Hak`;
    subEl.textContent = `🎁 Ücretsiz: ${freeLeft} • 🧾 Paket: ${credits} • 💰 Bakiye: ${tl(balance)} TL`;

    window.WALLET = { balance, freeReportsLeft: freeLeft, reportCredits: credits };
  }

  async function loadWallet(uid) {
    const w = await ensureWallet(uid);
    updateWalletUI(w);
    return w;
  }

  /**
   * consumeReport(uid, rid)
   * - Aynı rid için 1 kere düşer (uses/{rid})
   * - Önce freeReportsLeft, bitince reportCredits düşer
   */
  async function consumeReport(uid, rid) {
    if (!uid) throw new Error("consumeReport: uid yok");
    if (!rid) throw new Error("consumeReport: rid yok");

    const mainRef = walletMainRef(uid);
    const useRef = walletUseRef(uid, rid);

    const result = await db.runTransaction(async (tx) => {
      const useSnap = await tx.get(useRef);
      if (useSnap.exists) {
        const mainSnap2 = await tx.get(mainRef);
        const w2 = mainSnap2.exists ? (mainSnap2.data() || {}) : {};
        return { ok: true, already: true, wallet: w2 };
      }

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
      }

      const w = (mainSnap.exists ? (mainSnap.data() || {}) : {});
      let freeLeft = n(w.freeReportsLeft);
      let credits = n(w.reportCredits);
      const balance = n(w.balance);

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

        return { ok: true, already: false, wallet: { ...w, freeReportsLeft: freeLeft, reportCredits: credits, balance } };
      }

      if (credits > 0) {
        credits -= 1;

        tx.set(mainRef, {
          reportCredits: credits,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        tx.set(useRef, {
          usedAt: FieldValue.serverTimestamp(),
          kind: "credit"
        }, { merge: true });

        return { ok: true, already: false, wallet: { ...w, freeReportsLeft: freeLeft, reportCredits: credits, balance } };
      }

      return { ok: false, reason: "Hak bitti. Paket satın alman gerekiyor.", wallet: w };
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

  /**
   * createOrder(packId)
   * - kullanıcı paket seçer: P120/P200/P500
   * - order status: pending
   */
  async function createOrder(packId) {
    const user = auth.currentUser;
    if (!user) throw new Error("createOrder: giriş yok");

    const pack = PACKS[String(packId)];
    if (!pack) throw new Error("createOrder: packId geçersiz");

    const ref = ordersColRef(user.uid).doc(); // auto id

    const order = {
      orderId: ref.id,

      uid: user.uid,
      userEmail: user.email || "",
      userName: user.displayName || "",

      packId: String(packId),
      packTitle: pack.title,
      priceTL: pack.priceTL,
      credits: pack.credits,

      status: "pending",
      appliedToWallet: false,

      paymentLink: "",
      payment: {},

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(order, { merge: true });
    return order;
  }

  /**
   * approveOrder(uid, orderId)
   * - admin ödeme geldiğini kontrol eder
   * - tek seferlik: appliedToWallet ile kilit
   */
  async function approveOrder(uid, orderId) {
    if (!uid) throw new Error("approveOrder: uid yok");
    if (!orderId) throw new Error("approveOrder: orderId yok");

    const oRef = orderRef(uid, orderId);
    const wRef = walletMainRef(uid);

    const out = await db.runTransaction(async (tx) => {
      const oSnap = await tx.get(oRef);
      if (!oSnap.exists) return { ok: false, reason: "Sipariş bulunamadı." };

      const o = oSnap.data() || {};
      if (o.appliedToWallet === true || o.status === "approved") {
        return { ok: true, already: true };
      }

      const creditsToAdd = n(o.credits);
      if (creditsToAdd <= 0) return { ok: false, reason: "Siparişte hak yok." };

      const wSnap = await tx.get(wRef);
      if (!wSnap.exists) {
        tx.set(wRef, {
          balance: 0,
          freeReportsLeft: 5,
          reportCredits: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      const w = (wSnap.exists ? (wSnap.data() || {}) : {});
      const newCredits = n(w.reportCredits) + creditsToAdd;

      tx.set(wRef, {
        reportCredits: newCredits,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(oRef, {
        status: "approved",
        appliedToWallet: true,
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return { ok: true, already: false, newCredits };
    });

    const cur = auth.currentUser;
    if (cur && cur.uid === uid) {
      const w = await walletMainRef(uid).get();
      if (w.exists) updateWalletUI(w.data() || {});
    }

    return out;
  }

  /**
   * setPaymentLink(uid, orderId, link)
   * - admin ödeme linkini siparişe ekler
   */
  async function setPaymentLink(uid, orderId, link) {
    if (!uid) throw new Error("setPaymentLink: uid yok");
    if (!orderId) throw new Error("setPaymentLink: orderId yok");

    const clean = String(link || "").trim();
    if (!/^https?:\/\//i.test(clean)) {
      throw new Error("setPaymentLink: geçerli bir link gir (https://...)");
    }

    const oRef = orderRef(uid, orderId);

    await db.runTransaction(async (tx) => {
      const oSnap = await tx.get(oRef);
      if (!oSnap.exists) throw new Error("Sipariş bulunamadı.");

      const o = oSnap.data() || {};
      if (o.status === "approved") throw new Error("Bu sipariş zaten onaylanmış.");

      tx.set(oRef, {
        paymentLink: clean,
        payment: {
          ...(o.payment || {}),
          method: "QNB_LINKPOS",
          link: clean,
          addedAt: FieldValue.serverTimestamp(),
        },
        // ✅ standart: link_sent
        status: (o.status === "pending" ? "link_sent" : o.status),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return { ok: true };
  }

  /**
   * markPaid(orderId, refText)
   * - kullanıcı "ödemeyi yaptım" der
   */
  async function markPaid(orderId, refText) {
    const user = auth.currentUser;
    if (!user) throw new Error("markPaid: giriş yok");
    if (!orderId) throw new Error("markPaid: orderId yok");

    const oRef = orderRef(user.uid, orderId);
    const refStr = String(refText || "").trim().slice(0, 120);

    await db.runTransaction(async (tx) => {
      const oSnap = await tx.get(oRef);
      if (!oSnap.exists) throw new Error("Sipariş bulunamadı.");

      const o = oSnap.data() || {};
      if (o.status === "approved") return;

      tx.set(oRef, {
        status: "user_marked_paid",
        payment: {
          ...(o.payment || {}),
          paidClaimedAt: FieldValue.serverTimestamp(),
          ref: refStr,
        },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return { ok: true };
  }
function billingRef(uid){
  return db
    .collection(USERS_COL)
    .doc(uid)
    .collection("invoiceProfile")
    .doc("main");
}

async function getBillingProfile(uid){
  if(!uid) throw new Error("getBillingProfile: uid yok");
  const snap = await billingRef(uid).get();
  return snap.exists ? (snap.data() || {}) : {};
}

async function saveBillingProfile(uid, profile){
  if(!uid) throw new Error("saveBillingProfile: uid yok");

  await billingRef(uid).set({
    ...(profile || {}),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge:true });

  return { ok:true };
}
 // ✅ dışa aç
window.Wallet = {
  PACKS,
  load: loadWallet,
  ensure: ensureWallet,
  consumeReport,
  listenWallet,

  createOrder,
  approveOrder,
  setPaymentLink,
  markPaid,

  listOrders,
  listenOrders,

  ref: walletMainRef,
  ordersRef: ordersColRef,

  // ✅ FATURA
  getBillingProfile,
  saveBillingProfile,
};

  // giriş varsa otomatik cüzdanı yükle (UI varsa günceller)
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try { await loadWallet(user.uid); }
    catch (e) { console.log("wallet load error:", e?.message || e); }
  });
})();
