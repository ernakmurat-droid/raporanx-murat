const blankFields = (...labels) => labels.map(label => [label, ""]);

const fields = (record, mapping) => Object.entries(mapping).map(([key, label]) => [
  label, String(record?.[key] ?? "").trim()
]);

export function buildSections(report) {
  const modules = report.modules ?? {};
  const edits = report.finalTextEdits ?? {};
  const location = modules.konumCevre ?? report.konumCevre ?? {};
  const tapu = modules.tapu ?? {};
  const imar = modules.imar ?? report.imarDurumu ?? report.imar ?? {};
  const documents = modules.belgeler ?? report.belgeler ?? {};
  const uavt = String(location.v1 ?? "").trim();
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
    arsaPayi: "Arsa payı", arsaPaydasi: "Arsa paydası",
    tasinmazId: "Taşınmaz ID", tapuTarihi: "Tapu tarihi",
    ciltNo: "Cilt numarası", sayfaNo: "Sayfa numarası"
  };
  return [
    { id: "genel", title: "Genel Bilgiler", groups: [{ rows: fields(report, {
      propertyName: "Rapor adı", il: "İl", ilce: "İlçe", mahalle: "Mahalle"
    }) }] },
    { id: "konum", title: "Konum",
      note: "RaporanX’teki birleşik Cadde / Sokak bilgisini Fuzul Ev’de ilgili kutuya girin.",
      groups: [{ rows: fields({
      ...location, tamMetin: edits.konumMetin ?? location.tamMetin ?? report.konumMetni,
      v4: location.v4 || report.il, v5: location.v5 || report.ilce,
      v6: location.v6 || report.mahalle
    }, {
      v4: "İl", v5: "İlçe", v6: "Mahalle", v7: "Cadde / Sokak", v8: "Bina kapı no",
      v9: "Kat no", v10: "İç kapı no", v1: "UAVT", v2: "Koordinat X", v3: "Koordinat Y",
      tamMetin: "Konum ve çevre açıklaması"
    }).concat(blankFields("Bulvar / Cadde", "Sokak", "Semt", "Site / Lojman / Plaza adı",
      "Apartman adı", "Blok / Giriş (adres)", "Posta kodu", "Köy veya kırsal mahallede mi?")) }] },
    { id: "tapu", title: "Tapu",
      note: uavt ? undefined : "UAVT kodu Konum modülünde kayıtlı değil.",
      groups: (titles.length ? titles : [
      tapu.tapuKayitBilgileri ?? report.tapuKayitBilgileri
    ]).map((entry, index) => ({ title: `Tapu ${index + 1}`, rows: fields(entry, titleFields).concat(blankFields(
      "Taşınmaz değerleme yetkisi", "Tapunun türü", "Ana taşınmaz vasfı grubu",
      "Terk sonrası parsel yüzölçümü (m²)", "Bucak", "Pafta", "Ruhsattaki eski ada ve parsel",
      "Merkez Bankası kat bilgisi", "Eklentisi", "Parsel koordinat noktaları"
    )) })).concat({
      rows: fields({
        uavt, enerjiBelgesiVar: documents.enerjiBelgesiVar,
        kayit: edits.tapuMetinB1 ?? tapu.tapuMetniB1 ?? report.tapuMetniB1,
        takyidat: edits.tapuMetinB2 ?? tapu.tapuMetniB2 ?? report.tapuMetniB2
      }, { uavt: "Adres No (UAVT)", enerjiBelgesiVar: "Enerji Kimlik Belgesi var mı?", kayit: "Tapu açıklaması", takyidat: "Takyidat açıklaması" })
    }) },
    { id: "imar", title: "İmar Durumu",
      note: "Hesaplanan Emsal için ilgili ruhsat veya iskândaki toplam inşaat alanını, belgenin kapsamını kontrol ederek kullanın.",
      groups: [{ rows: fields({
      ...imar,
      metin: edits.imarMetin ?? report.imarMetni ?? modules.imarMetni ?? report.imar?.metin
    }, {
      nizam: "Yapı nizamı", kat: "Kat sayısı", lejant: "Lejant", taks: "Plan TAKS",
      kaks: "Plan KAKS (Emsal)", hesaplananEmsal: "Hesaplanan Emsal (m²)", imarPlaniOnayTarihi: "İmar planı onay tarihi",
      terk: "Terk miktarı (m²)", metin: "İmar durumu açıklaması"
    }).concat(blankFields("Plan ölçeği", "Tercihli kullanım alanı",
      "Hmax", "Ön çekme mesafesi", "Arka çekme mesafesi", "Yan çekme mesafesi",
      "Minimum cephe şartı", "Tevhid şartı", "18. madde imar uygulaması problemi")) }] },
    { id: "belgeler", title: "Belgeler", groups: [{ rows: fields({
      ...documents,
      iskanVar: typeof documents.iskanVar === "boolean" ? (documents.iskanVar ? "Evet" : "Hayır") : documents.iskanVar,
      metin: edits.belgelerMetin ?? report.belgelerMetni ?? modules.belgelerMetni ?? report.belgeler?.metin
    }, { iskanVar: "İskân var mı?", projeTarihiText: "Mimari proje tarihi",
      belediye: "Belgelerin incelendiği belediye", metin: "İncelenen belgeler"
    }).concat(blankFields("Ruhsat toplam inşaat alanı (m²)", "İskân toplam inşaat alanı (m²)",
      "Mimari proje onay numarası", "İncelenen diğer belgeler ve araştırmalar")) }] },
    { id: "bina", title: "Bina", groups: [{ rows: fields({
      ...building, metin: edits.binaMetin ?? (building.metin || building.binaMetni || report.binaMetni)
    }, {
      binaTipi: "Bina tipi", arsaAlani: "Arsa alanı (m²)", nizam: "Yapı nizamı",
      yapiSinifi: "Yapı sınıfı", hangiBlok: "Blok", bodrumKatSayisi: "Bodrum kat sayısı",
      normalKatSayisi: "Normal kat sayısı", toplamBagimsizBolum: "Bağımsız bölüm sayısı",
      disCephe: "Dış cephe", asansor: "Asansör", isinma: "Isınma", metin: "Bina açıklaması"
    }).concat(blankFields("Yapının inşa tarzı", "Deprem bölgesi", "Gözlemsel hasar durumu",
      "Deprem dayanıklılık ve hasar durumu", "Açık otopark", "Kapalı otopark",
      "Özel güvenlik", "Açık yüzme havuzu", "Kapalı yüzme havuzu")) }] },
    { id: "bb", title: "Bağımsız Bölüm", groups: (units.length ? units : [{}]).map((unit, index) => {
      const detail = unit?.bbDetay ?? unit;
      return { title: unit?.baslik || `Bağımsız bölüm ${index + 1}`, rows: fields({
        ...detail, metin: unit?.taslakMetin || unit?.metin || detail?.taslakMetin
      }, {
        bbNo: "Bağımsız bölüm no", kat: "Kat", kapiNo: "Kapı no", nitelik: "Nitelik",
        alanNet: "Net alan (m²)", alanBrut: "Brüt alan (m²)", metin: "Bağımsız bölüm açıklaması"
      }).concat(blankFields("İlk el / İkinci el", "Konut tipi", "Mevcut brüt inşaat alanı (m²)",
        "Yasal brüt inşaat alanı (m²)", "Kullanım durumu", "Yapım yılı", "Yapı kalitesi",
        "Bakım ve tadilat ihtiyacı", "Manzara durumu", "Yasal oda sayısı", "Mevcut oda sayısı")) };
    }).concat({ rows: fields({ metin: edits.bbMetin ?? modules.bagimsizBolum?.text ?? report.bagimsizBolumMetni }, {
      metin: "Bağımsız bölüm rapor metni"
    }) }) },
    { id: "degerleme", title: "Değerleme", groups: [{ rows: blankFields(
      "Değerleme uzmanı görüşü", "Satış kabiliyeti", "Yasal durum değeri",
      "Mevcut durum değeri", "Acil satış (yasal değer)", "Acil satış (mevcut değer)",
      "Sigorta değeri", "Tamamlanması hâlinde yasal değer",
      "Tamamlanması hâlinde mevcut değer", "Aylık kira", "Aylık birim kira değeri",
      "Tahmini inşaat bitiş süresi"
    ) }] },
    { id: "emsal", title: "Emsaller", note: comparisons.length < 4
      ? `Fuzul Ev en az 4 emsal ister. Bu raporda ${comparisons.length} emsal kayıtlı.`
      : `${comparisons.length} emsal kayıtlı.`, groups: (comparisons.length ? comparisons : [{}]).map((entry, index) => ({
        title: comparisons.length ? `Emsal ${index + 1}` : "Emsal giriş alanları", rows: fields(entry, {
          f1: "Kaynak / Telefon", f3: "Konum / Yakınlık", f4: "Bina kat sayısı",
          f5: "Bulunduğu kat", f6: "Oda sayısı", f7: "Beyan alanı (m²)", f8: "Tahmini alan (m²)",
          f9: "Taşınmaz cinsi", f10: "İstenen fiyat (TL)", f11: "Durumu", f14: "Pazarlık payı (%)",
          f12: "Olumlu şerefiye (%)", f13: "Olumsuz şerefiye (%)",
          f17: "Düzeltilmiş birim değer (TL/m²)", f18: "Koordinat", anaMetin: "Emsal açıklaması"
        }).concat(blankFields("Beyan eden kişi / kurum", "Beyan eden telefon", "İl", "İlçe",
          "Mahalle / Köy", "Semt", "Cadde / Bulvar", "Sokak", "Site / Lojman / Plaza adı",
          "Apartman adı", "Bina kapı no", "Kapı no", "Ada", "Parsel", "Enlem", "Boylam",
          "Bina yapım yılı", "Pazarlıklı fiyat", "Konum ve şerefiye düzeltmesi",
          "İnşaat kalitesi düzeltmesi"))
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

  function showSection() {
    const sections = Array.from(get("data").children);
    const selected = sections.find(section => "#" + section.id === location.hash) ?? sections[0];
    for (const section of sections) section.hidden = section !== selected;
    for (const link of get("sections").children) {
      link.setAttribute("aria-current", String(link.hash === "#" + selected?.id));
    }
    return selected;
  }

  window.addEventListener("hashchange", () => {
    showSection()?.scrollIntoView({ block: "start" });
  });

  function render(report) {
    get("report").textContent = report.propertyName || report.mulkAdi || "Gayrimenkul raporu";
    const allText = [];
    for (const { id, title, note, groups } of buildSections(report)) {
      const link = append(get("sections"), "a", title);
      link.href = "#" + id;
      const section = append(get("data"), "section");
      section.id = id;
      const header = append(section, "header");
      append(header, "h2", title);
      const groupTexts = groups.map(({ title: groupTitle, rows }) => {
        const values = rows.filter(([, value]) => value).map(([label, value]) => label + ": " + value);
        return values.length ? [groupTitle, ...values].filter(Boolean).join("\n") : "";
      });
      const sectionText = groupTexts.filter(Boolean).join("\n\n");
      if (sectionText) {
        allText.push(title + "\n" + sectionText);
        copyButton(header, "Bölümü kopyala", sectionText, title + " bölümü");
      }
      if (note) append(section, "p", note);

      // The last Emsaller group contains report-wide notes, not an individual comparable.
      const emsalCount = id === "emsal" && groups.length > 2 ? groups.length - 1 : 0;
      const switcher = emsalCount ? append(section, "div") : null;
      if (switcher) {
        switcher.className = "emsal-switcher";
        switcher.setAttribute("role", "group");
        switcher.setAttribute("aria-label", "Emsal seç");
      }
      const choices = [];
      for (const [index, block] of groups.entries()) {
        const group = append(section, "div");
        group.className = "group";
        if (block.title) {
          const groupHeader = append(group, "header");
          append(groupHeader, "h3", block.title);
          if (id === "emsal" && groupTexts[index]) {
            copyButton(groupHeader, "Bu emsali kopyala", groupTexts[index], block.title);
          }
        }
        if (index < emsalCount) {
          const button = append(switcher, "button", block.title);
          button.type = "button";
          group.id = "emsal-panel-" + index;
          button.setAttribute("aria-controls", group.id);
          button.setAttribute("aria-pressed", String(index === 0));
          group.hidden = index !== 0;
          choices.push({ button, group });
          button.addEventListener("click", () => {
            for (const choice of choices) {
              const selected = choice.button === button;
              choice.button.setAttribute("aria-pressed", String(selected));
              choice.group.hidden = !selected;
            }
          });
        }
        const grid = append(group, "div");
        grid.className = "fields";
        for (const [label, value] of block.rows) {
          const row = append(grid, "div");
          row.className = value.length > 90 || value.includes("\n") ? "field field-wide" : "field";
          const content = append(row, "div");
          append(content, "strong", label);
          const display = append(content, "span", value);
          if (value) copyButton(row, "Kopyala", value, label);
          else {
            display.className = "empty-value";
            display.setAttribute("aria-label", "Boş");
          }
        }
      }
    }
    showSection();
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
