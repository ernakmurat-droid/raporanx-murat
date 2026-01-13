<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yeni Rapor Oluştur</title>

  <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"></script>
  <script src="firebase-config.js"></script>

  <style>
    body { font-family: Arial, sans-serif; background: linear-gradient(to bottom, #4a148c, #ba68c8); margin: 0; padding: 40px 20px; color: white; min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; text-align: center; }
    h1 { font-size: 32px; margin-bottom: 30px; }
    form { background: rgba(255,255,255,0.2); padding: 30px; border-radius: 15px; }
    label { display: block; margin: 15px 0 5px; font-weight: bold; text-align: left; }
    input { width: 100%; padding: 14px; border: none; border-radius: 8px; box-sizing: border-box; margin-bottom: 15px; font-size: 16px; }
    button { background: #00c853; color: white; padding: 18px; border: none; border-radius: 12px; width: 100%; font-size: 20px; font-weight: bold; cursor: pointer; margin-top: 20px; }
    button:hover { background: #00b140; }
    .geri-btn { background: #6c757d; margin-top: 15px; }
    .geri-btn:hover { background: #5a6268; }
    .referans-btn { background: #2196f3; margin-top: 15px; }
    .referans-btn:hover { background: #1976d2; }
    .muted { opacity: 0.85; margin-top: 10px; font-size: 13px; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
  </style>
</head>

<body>
<div class="container">
  <h1>YENİ RAPOR OLUŞTUR</h1>

  <form onsubmit="return false;">
    <label>Gayrimenkul Adı</label>
    <input type="text" id="propertyName" placeholder="Örn: Deniz Apartmanı Daire 5">

    <label>İl</label>
    <input type="text" id="il" placeholder="Örn: İstanbul">

    <label>İlçe</label>
    <input type="text" id="ilce" placeholder="Örn: Kadıköy">

    <label>Mahalle</label>
    <input type="text" id="mahalle" placeholder="Örn: Osmanağa">

    <label>Ada</label>
    <input type="text" id="ada" placeholder="Örn: 123">

    <label>Parsel</label>
    <input type="text" id="parsel" placeholder="Örn: 45">

    <button id="createBtn" type="button" onclick="raporOlustur()">YENİ RAPOR OLUŞTUR</button>
    <div id="status" class="muted"></div>

    <button type="button" class="referans-btn" onclick="referansAc()">REFERANS BİLGİLER (Posta Kodu, Maliyet vb.)</button>
    <button type="button" class="geri-btn" onclick="anaSayfayaDon()">ANA SAYFAYA DÖN</button>
  </form>
</div>

<script>
  const auth = window.auth;
  const db = window.db;

  // Sayfa koruması: giriş yoksa index
  auth.onAuthStateChanged((user) => {
    if (!user) {
      alert("⚠️ Yetki yok! Lütfen giriş yapın.");
      window.location.href = "index.html";
    }
  });

  async function raporOlustur() {
    const user = auth.currentUser;
    if (!user) {
      alert("⚠️ Giriş yapmalısın.");
      window.location.href = "index.html";
      return;
    }

    const btn = document.getElementById("createBtn");
    const status = document.getElementById("status");
    btn.disabled = true;
    status.textContent = "☁️ Bulutta rapor oluşturuluyor...";

    // Form verileri
    const report = {
      propertyName: (document.getElementById('propertyName').value || "").trim() || "İsimsiz Gayrimenkul",
      il: (document.getElementById('il').value || "").trim(),
      ilce: (document.getElementById('ilce').value || "").trim(),
      mahalle: (document.getElementById('mahalle').value || "").trim(),
      ada: (document.getElementById('ada').value || "").trim(),
      parsel: (document.getElementById('parsel').value || "").trim(),

      // Sistem alanları
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLocked: false,
      archived: false,

      // Modül verileri (boş başlat)
      bina: {},
      bbDetay: {},
      emsaller: [],
      konumCevre: {},
      tapu: {},
      imar: {},
      belgeler: {}
    };

    try {
      // ✅ Tek rapor dokümanı oluştur
      const docRef = await db.collection("users")
        .doc(user.uid)
        .collection("reports")
        .add(report);

      status.textContent = "✅ Oluşturuldu. Yönlendiriliyor...";
      window.location.href = "rapor-detay.html?id=" + encodeURIComponent(docRef.id);

    } catch (e) {
      console.error(e);
      alert("❌ Rapor oluşturma hatası: " + (e?.message || e));
      status.textContent = "❌ Hata oluştu.";
      btn.disabled = false;
    }
  }

  function referansAc() { window.open('referans-bilgiler.html', '_blank'); }
  function anaSayfayaDon() { window.location.href = 'index.html'; }
</script>
</body>
</html>
