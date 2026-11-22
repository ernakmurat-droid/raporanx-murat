const fields = (record, mapping) => Object.entries(mapping).map(([key, label]) => [
  label, String(record?.[key] ?? "").trim()
]);

export function buildSections(report) {
  const modules = report.modules ?? {};
  const edits = report.finalTextEdits ?? {};
  const location = modules.konumCevre ?? report.konumCevre ?? {};
  const tapu = modules.tapu ?? {};
  const titles = Array.isArray(tapu.cokluTapular)
    ? tapu.cokluTapular.map(entry => entry?.tapuKayitBilgileri)
      .filter(entry => entry && Object.values(entry).some(value => String(value ?? "").trim()))
    : [];
  const building = modules.bina ?? report.bina ?? {};
  const units = report.bbDetayList ?? report.bbList ?? [];
  const comparisons = report.emsaller ?? report.emsalHavuzu ?? [];
  const titleFields = {
    il: "İl", ilce: "İlçe", mahalleKoy: "Mahalle / Köy", mevkii: "Mevkii",
    ada: "Ada", parsel: "Parsel", anaYuzolcumu: "Arsa yüzölçümü (m²)",
    anaNitelik: "Ana taşınmaz niteliği", blokNo: "Blok", katNo: "Kat", girisNo: "Giriş",
    bbNo: "Bağımsız bölüm no", bbNitelik: "Bağımsız bölüm niteliği",
    arsaPayi: "Arsa payı", arsaPaydasi: "Arsa paydası"
  };
  return [
    { id: "genel", title: "Genel Bilgiler", groups: [{ rows: fields(report, {
      propertyName: "Rapor adı", il: "İl", ilce: "İlçe", mahalle: "Mahalle"
    }) }] },
    { id: "konum", title: "Konum",
      note: "Fuzul Ev’de cadde ve sokak ayrı alanlardır. Site veya apartman adı, semt ve posta kodu gibi ayrı kaydedilmeyen bilgileri Fuzul Ev’de tamamlayın.",
      groups: [{ rows: fields({
      ...location, tamMetin: edits.konumMetin ?? location.tamMetin ?? report.konumMetni,
      v4: location.v4 || report.il, v5: location.v5 || report.ilce,
      v6: location.v6 || report.mahalle
    }, {
      v4: "İl", v5: "İlçe", v6: "Mahalle", v7: "Cadde / Sokak", v8: "Bina kapı no",
      v9: "Kat no", v10: "İç kapı no", v1: "UAVT", v2: "Koordinat X", v3: "Koordinat Y",
      tamMetin: "Konum ve çevre açıklaması"
    }) }] },
    { id: "tapu", title: "Tapu", groups: (titles.length ? titles : [
      tapu.tapuKayitBilgileri ?? report.tapuKayitBilgileri
    ]).map((entry, index) => ({ title: `Tapu ${index + 1}`, rows: fields(entry, titleFields) })).concat({
      rows: fields({
        kayit: edits.tapuMetinB1 ?? tapu.tapuMetniB1 ?? report.tapuMetniB1,
        takyidat: edits.tapuMetinB2 ?? tapu.tapuMetniB2 ?? report.tapuMetniB2
      }, { kayit: "Tapu açıklaması", takyidat: "Takyidat açıklaması" })
    }) },
    { id: "imar", title: "İmar Durumu", groups: [{ rows: fields({
      metin: edits.imarMetin ?? report.imarMetni ?? modules.imarMetni ?? report.imar?.metin
    }, { metin: "İmar durumu açıklaması" }) }] },
    { id: "belgeler", title: "Belgeler", groups: [{ rows: fields({
      metin: edits.belgelerMetin ?? report.belgelerMetni ?? modules.belgelerMetni ?? report.belgeler?.metin
    }, { metin: "İncelenen belgeler" }) }] },
    { id: "bina", title: "Bina", groups: [{ rows: fields({
      ...building, metin: edits.binaMetin ?? (building.metin || building.binaMetni || report.binaMetni)
    }, {
      binaTipi: "Bina tipi", arsaAlani: "Arsa alanı (m²)", nizam: "Yapı nizamı",
      yapiSinifi: "Yapı sınıfı", hangiBlok: "Blok", bodrumKatSayisi: "Bodrum kat sayısı",
      normalKatSayisi: "Normal kat sayısı", toplamBagimsizBolum: "Bağımsız bölüm sayısı",
      disCephe: "Dış cephe", asansor: "Asansör", isinma: "Isınma", metin: "Bina açıklaması"
    }) }] },
    { id: "bb", title: "Bağımsız Bölüm", groups: units.map((unit, index) => {
      const detail = unit?.bbDetay ?? unit;
      return { title: unit?.baslik || `Bağımsız bölüm ${index + 1}`, rows: fields({
        ...detail, metin: unit?.taslakMetin || unit?.metin || detail?.taslakMetin
      }, {
        bbNo: "Bağımsız bölüm no", kat: "Kat", kapiNo: "Kapı no", nitelik: "Nitelik",
        alanNet: "Net alan (m²)", alanBrut: "Brüt alan (m²)", metin: "Bağımsız bölüm açıklaması"
      }) };
    }).concat({ rows: fields({ metin: edits.bbMetin ?? modules.bagimsizBolum?.text ?? report.bagimsizBolumMetni }, {
      metin: "Bağımsız bölüm rapor metni"
    }) }) },
    { id: "emsal", title: "Emsaller", note: comparisons.length < 4
      ? `Fuzul Ev en az 4 emsal ister. Bu raporda ${comparisons.length} emsal kayıtlı.`
      : `${comparisons.length} emsal kayıtlı.`, groups: comparisons.map((entry, index) => ({
        title: `Emsal ${index + 1}`, rows: fields(entry, {
          f1: "Kaynak / Telefon", f3: "Konum / Yakınlık", f4: "Bina kat sayısı",
          f5: "Bulunduğu kat", f6: "Oda sayısı", f7: "Beyan alanı (m²)", f8: "Tahmini alan (m²)",
          f9: "Taşınmaz cinsi", f10: "İstenen fiyat (TL)", f11: "Durumu", f14: "Pazarlık payı (%)",
          f12: "Olumlu şerefiye (%)", f13: "Olumsuz şerefiye (%)",
          f17: "Düzeltilmiş birim değer (TL/m²)", f18: "Koordinat", anaMetin: "Emsal açıklaması"
        })
      })).concat({ rows: fields({ metin: edits.emsalMetin ?? modules.emsal?.text ?? report.emsalFinalMetni }, {
        metin: "Değerleme ve emsal rapor metni"
      }) }) }
  ];
}

function setup() {
  const get = id => document.getElementById(id);
  const status = get("status");
  const params = new URLSearchParams(location.search);
  const rid = params.get("rid")?.trim();
  if (!rid || rid.includes("/")) {
    status.textContent = "Rapor kimliği bulunamadı. Ana sayfadan raporu açın.";
    return;
  }
  const fromFinal = params.get("from") === "final";
  const backPage = fromFinal ? "/rapor-olustur.html" : "/rapor-detay.html";
  get("back").href = backPage + "?rid=" + encodeURIComponent(rid);
  if (fromFinal) get("back").textContent = "← Rapor Oluştur ekranına dön";

  function append(parent, tag, label = "") {
    const element = document.createElement(tag);
    element.textContent = label;
    parent.append(element);
    return element;
  }

  function copyButton(parent, label, value, description) {
    const button = append(parent, "button", label);
    button.type = "button";
    button.setAttribute("aria-label", description + " kopyala");
    button.addEventListener("click", async () => {
      get("manual").hidden = true;
      try {
        await navigator.clipboard.writeText(value);
        status.textContent = description + " kopyalandı.";
      } catch {
        const textarea = get("manual-text");
        get("manual").hidden = false;
        textarea.value = value;
        textarea.focus();
        textarea.select();
        status.textContent = "Metin kopyalamaya hazır.";
      }
    });
  }

  function render(report) {
    get("report").textContent = report.propertyName || report.mulkAdi || "Gayrimenkul raporu";
    const allText = [];
    for (const { id, title, note, groups } of buildSections(report)) {
      append(get("sections"), "a", title).href = "#" + id;
      const section = append(get("data"), "section");
      section.id = id;
      const header = append(section, "header");
      append(header, "h2", title);
      const blocks = groups.map(group => ({
        ...group, rows: group.rows.filter(([, value]) => value !== "")
      })).filter(group => group.rows.length);
      if (blocks.length) {
        const text = blocks.map(({ title: groupTitle, rows }) =>
          [groupTitle, ...rows.map(([label, value]) => label + ": " + value)].filter(Boolean).join("\n")
        ).join("\n\n");
        allText.push(title + "\n" + text);
        copyButton(header, "Bölümü kopyala", text, title + " bölümü");
      }
      if (note) append(section, "p", note);
      if (!blocks.length) append(section, "p", "Kayıtlı bilgi bulunamadı.");
      for (const block of blocks) {
        if (block.title) append(section, "h3", block.title);
        for (const [label, value] of block.rows) {
          const row = append(section, "div");
          row.className = "field";
          const content = append(row, "div");
          append(content, "strong", label);
          append(content, "span", value);
          copyButton(row, "Kopyala", value, label);
        }
      }
    }
    if (allText.length) copyButton(get("copy-all"), "Tüm bilgileri kopyala", allText.join("\n\n"), "Tüm bilgiler");
    status.textContent = "";
  }

  if (!window.auth || !window.db) {
    status.textContent = "RaporanX bağlantısı kurulamadı. Sayfayı yenileyin.";
    return;
  }

  let request = 0;
  window.auth.onAuthStateChanged(async user => {
    const current = ++request;
    for (const id of ["report", "copy-all", "sections", "data", "manual-text"]) get(id).replaceChildren();
    get("manual-text").value = "";
    get("manual").hidden = true;
    if (!user) {
      status.textContent = "Raporu görmek için RaporanX’e giriş yapın.";
      return;
    }
    status.textContent = "Rapor yükleniyor…";
    try {
      const snapshot = await window.db.collection("users").doc(user.uid).collection("reports").doc(rid).get();
      let report = snapshot.data();
      if (!snapshot.exists) {
        const legacy = await window.db.collection("kullanicilar").doc(user.uid).get();
        const records = Object.values(legacy.data()?.gayrimenkul_reports ?? {});
        report = records.find(record => String(record?.rid) === rid);
      }
      if (current !== request) return;
      if (report) render(report);
      else status.textContent = "Bu rapor hesabınızda bulunamadı.";
    } catch {
      if (current === request) status.textContent = "Rapor okunamadı. Bağlantınızı kontrol edip sayfayı yenileyin.";
    }
  });
}

if (typeof document !== "undefined") window.addEventListener("DOMContentLoaded", setup);
