<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>RaporanX – Ana Panel</title>

<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"></script>

<script src="firebase-config.js"></script>

<style>
body {
    font-family: Segoe UI, sans-serif;
    background: #f4f7f9;
    margin: 0;
}
header {
    background: linear-gradient(135deg,#1a237e,#3949ab);
    color: white;
    padding: 20px;
    text-align: center;
}
.container {
    max-width: 900px;
    margin: auto;
    padding: 20px;
}
.card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,.08);
}
button {
    background: #3949ab;
    color: white;
    border: none;
    padding: 12px 18px;
    border-radius: 8px;
    cursor: pointer;
}
button:hover { opacity: .9; }
.hidden { display: none; }
input, textarea {
    width: 100%;
    padding: 10px;
    margin-top: 8px;
}
</style>
</head>

<body>

<header>
    <h1>📄 RaporanX</h1>
    <p>Profesyonel Rapor Oluşturma Paneli</p>
</header>

<div class="container">

    <!-- Giriş -->
    <div class="card" id="loginCard">
        <h3>🔐 Giriş</h3>
        <button onclick="googleLogin()">Google ile Giriş Yap</button>
    </div>

    <!-- Panel -->
    <div class="card hidden" id="panelCard">
        <h3>📝 Yeni Rapor Oluştur</h3>
        <input id="raporBaslik" placeholder="Rapor Başlığı" />
        <textarea id="raporAciklama" rows="4" placeholder="Rapor Açıklaması"></textarea>
        <br><br>
        <button onclick="raporKaydet()">Raporu Oluştur</button>
        <p id="durum"></p>
    </div>

</div>

<script>
const auth = firebase.auth();
const db = firebase.firestore();

/* Giriş */
function googleLogin(){
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
}

/* Oturum Takibi */
auth.onAuthStateChanged(user => {
    if(user){
        document.getElementById("loginCard").classList.add("hidden");
        document.getElementById("panelCard").classList.remove("hidden");
    } else {
        document.getElementById("loginCard").classList.remove("hidden");
        document.getElementById("panelCard").classList.add("hidden");
    }
});

/* Rapor Kaydet */
function raporKaydet(){
    const baslik = document.getElementById("raporBaslik").value;
    const aciklama = document.getElementById("raporAciklama").value;

    if(!baslik){
        alert("Başlık boş olamaz");
        return;
    }

    db.collection("raporlar").add({
        baslik,
        aciklama,
        user: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(()=>{
        document.getElementById("durum").innerText = "✅ Rapor oluşturuldu";
        document.getElementById("raporBaslik").value = "";
        document.getElementById("raporAciklama").value = "";
    }).catch(err=>{
        alert(err.message);
    });
}
</script>

</body>
</html>
