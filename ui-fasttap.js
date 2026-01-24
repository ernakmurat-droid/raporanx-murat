// Mobilde click + touchstart çakışmasını bitirir (donma hissi azalır)
(function(){
  function bindFastTap(el, fn){
    if(!el || typeof fn !== "function") return;

    // varsa inline onclick'i devre dışı bırak (çift çalışmayı engeller)
    el.onclick = null;

    // pointerup tek event: mobil + desktop
    el.addEventListener("pointerup", function(e){
      // buton/anchor focus zıplamasını da azaltır
      e.preventDefault();
      fn(e);
    }, { passive:false });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    // data-fasttap olan her şeyi otomatik bağla
    document.querySelectorAll("[data-fasttap]").forEach(el=>{
      const fnName = el.getAttribute("data-fasttap");
      const fn = window[fnName];
      bindFastTap(el, fn);
    });
  });

  // İstersen bazı sayfalarda sticky naz yaparsa aç:
  // document.body.classList.add("use-fixed-header");
})();
