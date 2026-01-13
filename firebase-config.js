const firebaseConfig = {
  apiKey: "AIzaSyCMwx6S6rq1lnNJuHOxc38ij3qU4ankSxs",
  authDomain: "raporanx.firebaseapp.com",
  projectId: "raporanx",
  storageBucket: "raporanx.firebasestorage.app",
  messagingSenderId: "715194328346",
  appId: "1:715194328346:web:46f0bb98941e01ead6f8a3"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

window.auth = auth;
window.db = db;

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

const publicPages = ["index.html"];

auth.onAuthStateChanged((user) => {
  const page = (location.pathname.split("/").pop() || "").toLowerCase();
  const isPublic = publicPages.includes(page) || page === "";
  if (!user && !isPublic) {
    location.href = "index.html";
  }
});
