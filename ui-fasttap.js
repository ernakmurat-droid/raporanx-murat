// mobil-fix.js
// Amaç: rid kaybolmasın + dokunma hissi hızlansın + geri linkleri doğru kalsın

(function () {
  function getRid(){
    const p = new URLSearchParams(location.search);
    return (p.get("rid") || "").trim();
  }

  function patchLinksWithRid(rid){
    if (!rid) return;

    // Sadece anchor'ları patch'liyoruz (button'lara karışmıyoruz)
    const links = document.querySelectorAll('a[href]');
    links.forEach(a => {
      try{
        const href = a.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

        const url = new URL(href, location.origin);

        // dış linkleri elleme
        if (url.origin !== location.origin) return;

        // rid zaten varsa dokunma
        if (url.searchParams.has("rid")) return;

        // index/login gibi yerlerde rid istemiyoruz (istersen listeyi genişletiriz)
        const pathname = url.pathname.split("/").pop() || "";
        const block = ["index.html", "login.html"].includes(pathname);
        if (block) return;

        url.searchParams.set("rid", rid);
        a.setAttribute("href", url.pathname + "?" + url.searchParams.toString());
      }catch(e){}
    });
  }

  function fastTap(){
    // iOS/Android dokunma hissini hızlandırır
    document.documentElement.style.touchAction = "manipulation";
    document.body && (document.body.style.touchAction = "manipulation");
  }

  document.addEventListener("DOMContentLoaded", function(){
    fastTap();
    patchLinksWithRid(getRid());
  });
})();
