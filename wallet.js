/**
 * wallet.js (TEK DOSYA - HAK + SİPARİŞ + HAK DÜŞÜRME)
 * Firestore:
 *  - users/{uid}/wallet/main
 *  - users/{uid}/wallet/main/uses/{rid}          // rapor tüketim kaydı (idempotent)
 *  - users/{uid}/orders/{orderId}               // paket satın alma isteği
 *
 * Paketler:
 *  - P120 => 120 TL / 4 hak
 *  - P200 => 200 TL / 8 hak
 *  - P500 => 500 TL / 25 hak
 *
 * Akış:
 *  - Kullanıcı "paket satın al" der -> createOrder(packId)
 *  - Admin ödeme geldiğini görür -> approveOrder(uid, orderId)
 *  - Rapor oluşturunca -> consumeReport(uid, rid) önce free, sonra reportCredits düşer
 */
(function () {
  if (!window.firebase) {
    console.error("wallet.js: firebase yok!");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  const FieldValue = firebase.firestore.FieldValue;

  // ✅ Tek yerden koleksiyon adı
  const USERS_COL = "users";

  // ✅ Paket tanımları (sabit)
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
    return db.collection(USERS_COL).doc(uid).collection("orders");
  }

  function orderRef(uid, orderId) {
    return ordersColRef(uid).doc(String(orderId));
  }

  async function ensureWallet(uid) {
    const ref = walletMainRef(uid);

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        const init = {
          // NOT: TL bakiye şimdilik kullanılmıyor, ama dursun istersen.
          balance: 0,

          // ✅ Ücretsiz 5 hak aynen kalıyor
          freeReportsLeft: 5,

          // ✅ Paketlerden gelen haklar
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

    // Görselde sen "bakiye gizli" diyordun. Biz de hakları öne çıkaralım.
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
   * - Aynı rid için 1 kere düşer (uses/{rid} kontrolü)
   * - Önce freeReportsLeft düşer
   * - free bitince reportCredits düşer
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

      // 2) cüzdanı getir / yoksa oluştur
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
      let balance = n(w.balance);

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

        return { ok: true, already: false, wallet: { ...w, freeReportsLeft: freeLeft, reportCredits: credits, balance } };
      }

      // 4) paket haklarından düş
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
   * - ödeme linki admin tarafından gönderilecek (manuel)
   * - order status: pending
   */
  async function createOrder(packId) {
    const user = auth.currentUser;
    if (!user) throw new Error("createOrder: giriş yok");

    const pack = PACKS[String(packId)];
    if (!pack) throw new Error("createOrder: packId geçersiz");

    const ref = ordersColRef(user.uid).doc(); // otomatik id
    const order = {
      orderId: ref.id,
      packId: String(packId),
      packTitle: pack.title,
      priceTL: pack.priceTL,
      credits: pack.credits,

      status: "pending",         // pending | approved | rejected | cancelled
      appliedToWallet: false,    // ✅ idempotent kilit

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(order, { merge: true });
    return order;
  }

  /**
   * approveOrder(uid, orderId)
   * - admin ödeme geldiğini kontrol eder
   * - cüzdana credits ekler
   * - aynı order 2 kere onaylanırsa 2 kere eklemez
   *
   * NOT: Bunu admin panelinden çağıracaksın.
   * Güvenlik için ideal olan: admin kullanıcıya özel Firestore rule / custom claim.
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

      // wallet yoksa oluştur
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
      const currentCredits = n(w.reportCredits);
      const newCredits = currentCredits + creditsToAdd;

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

    // Eğer bu işlem mevcut kullanıcıya ait cüzdanı etkilediyse UI güncellensin
    const cur = auth.currentUser;
    if (cur && cur.uid === uid) {
      const w = await walletMainRef(uid).get();
      if (w.exists) updateWalletUI(w.data() || {});
    }

    return out;
  }

  // dışa aç
  window.Wallet = {
    PACKS,
    load: loadWallet,
    ensure: ensureWallet,
    consumeReport,
    listen: listenWallet,

    createOrder,     // kullanıcı
    approveOrder,    // admin

    ref: walletMainRef,
    ordersRef: ordersColRef,
  };

  // otomatik yükle
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      await loadWallet(user.uid);
    } catch (e) {
      console.log("wallet load error:", e?.message || e);
    }
  });
})();
