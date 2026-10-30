// "Konumumu kullan": firmalar.json'u yükler, firmaları tarayıcıdaki konuma göre sıralar.
// Konum sunucuya gönderilmez.
(function () {
  var btn = document.getElementById("konum");
  if (!btn) return;
  var msg = document.getElementById("konum-msg");
  var list = document.getElementById("konum-liste");

  function say(t) { msg.textContent = t; msg.hidden = false; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function km(a, b, c, d) {
    var r = 6371, p1 = a * Math.PI / 180, p2 = c * Math.PI / 180, dp = p2 - p1, dl = (d - b) * Math.PI / 180;
    var x = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * r * Math.asin(Math.sqrt(x));
  }

  btn.addEventListener("click", function () {
    if (!navigator.geolocation) { say("Tarayıcınız konum özelliğini desteklemiyor. İl listesinden seçebilirsiniz."); return; }
    btn.disabled = true; say("Konumunuz alınıyor...");
    navigator.geolocation.getCurrentPosition(function (pos) {
      fetch("/firmalar.json").then(function (r) { return r.json(); }).then(function (data) {
        var lat = pos.coords.latitude, lng = pos.coords.longitude;
        var rows = data.firmalar.map(function (f) { return { f: f, d: km(lat, lng, f.lat, f.lng) }; })
          .sort(function (a, b) { return a.d - b.d; }).slice(0, 10);
        if (!rows.length || rows[0].d > 150) { say("Size yakın kayıtlı hurdacı bulunamadı. İl listesinden bakabilirsiniz."); btn.disabled = false; return; }
        list.innerHTML = rows.map(function (r) {
          var f = r.f, where = [data.adlar[f.ilce], data.adlar[f.il]].filter(Boolean).join(", ");
          return '<li class="card"><div class="card__head"><h3>' + esc(f.ad) + '</h3><span class="card__km">' + r.d.toFixed(r.d < 10 ? 1 : 0) + ' km</span></div>' +
            '<p class="card__where">' + esc(where) + '</p><div class="card__act"><a class="btn" href="tel:' + esc(f.tel) + '" data-firma="' + esc(f.id) + '">' + esc(f.telGoster) + '</a>' +
            (f.harita ? '<a class="btn btn--ghost" href="' + esc(f.harita) + '" target="_blank" rel="noopener nofollow">Haritada gör</a>' : "") + "</div></li>";
        }).join("");
        list.hidden = false; say("Size en yakın " + rows.length + " hurdacı (kuş uçuşu uzaklık):"); btn.disabled = false;
      }).catch(function () { say("Liste yüklenemedi, lütfen tekrar deneyin."); btn.disabled = false; });
    }, function () { say("Konum izni verilmedi. İl ve ilçe listesinden seçebilirsiniz."); btn.disabled = false; }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });
})();

// İl ve ilçe arama çubuğu: /arama.json ilk odaklanmada yüklenir.
(function () {
  var veri = null;
  function fold(s) {
    return String(s).replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase().replace(/[ıçğöşü]/g, function (c) { return { "ı": "i", "ç": "c", "ğ": "g", "ö": "o", "ş": "s", "ü": "u" }[c]; });
  }
  function yukle() {
    if (!veri) veri = fetch("/arama.json").then(function (r) { return r.json(); }).then(function (a) {
      a.forEach(function (x) { x.f = fold(x.a); }); return a;
    });
    return veri;
  }
  function ekr(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  document.querySelectorAll("[data-ara]").forEach(function (form) {
    var inp = form.querySelector("input"), list = form.querySelector(".ara__list"), etkin = -1, sonuc = [];
    function kapat() { list.hidden = true; inp.setAttribute("aria-expanded", "false"); etkin = -1; }
    function isaretle() {
      [].forEach.call(list.children, function (li, i) { li.setAttribute("aria-selected", String(i === etkin)); });
    }
    function ara() {
      var q = fold(inp.value.trim());
      if (q.length < 2) { kapat(); return; }
      yukle().then(function (a) {
        sonuc = a.filter(function (x) { return x.f.indexOf(q) >= 0; }).sort(function (x, y) {
          return (y.f.indexOf(q) === 0) - (x.f.indexOf(q) === 0) || (!!x.p) - (!!y.p) || y.n - x.n;
        }).slice(0, 8);
        list.innerHTML = sonuc.length ? sonuc.map(function (x) {
          return '<li role="option" aria-selected="false"><a href="' + x.u + '"><b>' + ekr(x.a) + "</b><small>" + (x.p ? ekr(x.p) + " ilçesi" : "İl") + "</small><span>" + (x.n ? x.n + " firma" : "Yakındakiler") + "</span></a></li>";
        }).join("") : '<li class="ara__yok">Sonuç bulunamadı. Tüm illere aşağıdan bakabilirsiniz.</li>';
        list.hidden = false; inp.setAttribute("aria-expanded", "true"); etkin = -1;
      }).catch(kapat);
    }
    inp.addEventListener("focus", yukle);
    inp.addEventListener("input", ara);
    inp.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        if (!sonuc.length) return;
        etkin = (etkin + (ev.key === "ArrowDown" ? 1 : sonuc.length - 1 + (etkin < 0 ? 1 : 0))) % sonuc.length;
        isaretle();
      } else if (ev.key === "Escape") kapat();
    });
    form.addEventListener("submit", function (ev) {
      var x = sonuc[etkin < 0 ? 0 : etkin];
      if (x && !list.hidden) { ev.preventDefault(); location.href = x.u; }
    });
    document.addEventListener("click", function (ev) { if (!form.contains(ev.target)) kapat(); });
  });
})();

// /firma-ekle/: başvuru formu (il seçilince ilçeler dolar)
var KAYIT_API = /^(localhost|127.0.0.1)$/.test(location.hostname) ? "http://127.0.0.1:8095" : "https://api.enyakinhurdacim.com.tr";
(function () {
  var form = document.getElementById("kayit-form");
  if (!form) return;
  var msg = document.getElementById("kayit-msg");
  function say(t, ok) { msg.textContent = t; msg.className = "ekform__msg " + (ok ? "is-ok" : "is-err"); msg.hidden = false; }
  form.il.addEventListener("change", function () {
    var il = form.il.value;
    form.ilce.innerHTML = '<option value="">' + (il ? "Bilmiyorum / il geneli" : "Önce il seçin") + "</option>";
    if (!il) return;
    fetch("/arama.json").then(function (r) { return r.json(); }).then(function (a) {
      a.filter(function (x) { return x.i === il; }).forEach(function (x) {
        var o = document.createElement("option"); o.value = x.s; o.textContent = x.a; form.ilce.appendChild(o);
      });
    });
  });
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (form.ad.value.trim().length < 3) { say("Firma adını yazın."); form.ad.focus(); return; }
    if (form.tel.value.replace(/\D/g, "").length < 10) { say("Geçerli bir telefon numarası yazın."); form.tel.focus(); return; }
    if (!form.il.value) { say("İl seçin."); form.il.focus(); return; }
    if (!form.onay.checked) { say("Yayınlanması için onay kutusunu işaretleyin."); return; }
    var turler = [].map.call(form.querySelectorAll("input[name=turler]:checked"), function (c) { return c.value; });
    var btn = form.querySelector("button[type=submit]"); btn.disabled = true; say("Gönderiliyor...", true);
    fetch(KAYIT_API + "/kayit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      ad: form.ad.value, tel: form.tel.value, il: form.il.value, ilce: form.ilce.value, adres: form.adres.value, site: form.site.value, turler: turler,
      eposta: form.eposta.value, not: form.not.value, onay: true, web: form.web.value }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        btn.disabled = false;
        if (res.ok) { say("Başvurunuz alındı. İncelendikten sonra firmanız rehberde yayınlanacak. Teşekkür ederiz.", true); btn.hidden = true; }
        else say(res.j.hata || "Bir hata oluştu, lütfen tekrar deneyin.");
      }).catch(function () { btn.disabled = false; say("Bağlantı kurulamadı, lütfen tekrar deneyin."); });
  });
})();

// Panelde onaylanan firmalar: bir sonraki derlemeye kadar il ve ilçe listelerinin başına eklenir.
(function () {
  var m = location.pathname.match(/^\/([a-z0-9-]+)-hurdaci\/$/);
  var hedef = document.querySelector("ol.cards:not(#konum-liste)");
  if (!m || !document.querySelector(".band")) return;
  fetch(KAYIT_API + "/onayli.json").then(function (r) { return r.json(); }).then(function (a) {
    a.filter(function (k) { return (k.il === m[1] || k.ilce === m[1]) && !document.querySelector('a[href="tel:' + k.tel + '"]'); }).forEach(function (k) {
      if (!hedef) {  // firması olmayan ilçe sayfasında liste yoktur
        var bol = document.createElement("section"); bol.innerHTML = '<ol class="cards"></ol>';
        var kap = document.querySelector("main .wrap"); kap.insertBefore(bol, kap.firstChild);
        hedef = bol.firstChild;
      }
      var li = document.createElement("li"); li.className = "card";
      li.innerHTML = '<div class="card__head"><h3>' + ekEsc(k.ad) + "</h3></div>" +
        (k.turler.length ? '<p class="card__tur">' + k.turler.map(function (t) { return "<span>" + ekEsc(t) + "</span>"; }).join("") + "</p>" : "") +
        '<div class="card__act"><a class="btn" href="tel:' + ekEsc(k.tel) + '">' + ekEsc(k.telGoster) + '</a></div><dl class="card__bilgi"><dt>Adres</dt><dd>' + ekEsc(k.adres) + "</dd><dt>Web sitesi</dt><dd>" +
        (/^https?:\/\//.test(k.site) ? '<a href="' + ekEsc(k.site) + '" target="_blank" rel="noopener nofollow">' + ekEsc(k.site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")) + "</a>" : "") +
        "</dd><dt>E-posta</dt><dd>" + (k.eposta ? '<a href="mailto:' + ekEsc(k.eposta) + '">' + ekEsc(k.eposta) + "</a>" : "") +
        '</dd></dl><p class="card__src">Kaynak: Firma beyanı</p>';
      hedef.insertBefore(li, hedef.firstChild);
    });
  }).catch(function () {});
})();

// Firma telefonuna tıklama → dataLayer (GTM eklendiğinde ölçüm için)
document.addEventListener("click", function (e) {
  var a = e.target.closest && e.target.closest("a[href^='tel:']");
  if (!a || !e.isTrusted) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "firma_arama", firma_id: a.getAttribute("data-firma") || "" });
}, true);

// Grafikler: üzerine gelince (ya da dokununca) yıl ve değer ipucu + dikey çizgi.
(function () {
  function fmt(v) { return v.toLocaleString("tr-TR", { maximumFractionDigits: v < 100 ? 1 : 0 }); }
  document.querySelectorAll("figure.chart").forEach(function (fig) {
    var d = JSON.parse(fig.getAttribute("data-chart"));
    var svg = fig.querySelector("svg"), tip = fig.querySelector(".chart-tip"), cross = svg.querySelector(".cross");
    function show(r) {
      var i = +r.getAttribute("data-i"), cx = +r.getAttribute("x") + +r.getAttribute("width") / 2;
      cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.style.opacity = 1;
      tip.innerHTML = "<b>" + d.y[i] + (d.y[i] === "2026" ? " (ilk aylar)" : "") + "</b>" + d.s.map(function (s) {
        return '<span><i style="background:' + s.c + '"></i>' + (d.s.length > 1 ? s.n + ": " : "") + fmt(s.v[i]) + "</span>";
      }).join("") + "<small>" + d.u + "</small>";
      tip.hidden = false;
      var box = svg.getBoundingClientRect(), x = cx / svg.viewBox.baseVal.width * box.width;
      tip.style.left = Math.min(Math.max(x - tip.offsetWidth / 2, 0), box.width - tip.offsetWidth) + "px";
    }
    function hide() { tip.hidden = true; cross.style.opacity = 0; }
    svg.querySelectorAll(".hit").forEach(function (r) {
      r.addEventListener("mouseenter", function () { show(r); });
      r.addEventListener("click", function () { show(r); });
    });
    svg.addEventListener("mouseleave", hide);
  });
})();

// Firma ek bilgileri: derlemeden sonra doğrulananları /ek.json'dan kartlara ekler.
var EK_API = /^(localhost|127.0.0.1)$/.test(location.hostname) ? "http://127.0.0.1:8095" : "https://api.enyakinhurdacim.com.tr";
function ekEsc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
(function () {
  var cards = document.querySelectorAll("li.card[data-id]");
  if (!cards.length) return;
  fetch(EK_API + "/ek.json").then(function (r) { return r.json(); }).then(function (ek) {
    cards.forEach(function (li) {
      var x = ek[li.getAttribute("data-id")];
      if (!x) return;
      var rows = [];
      if (x.adres) rows.push(["Adres", ekEsc(x.adres)]);
      if (x.turler && x.turler.length) rows.push(["Aldığı hurdalar", x.turler.map(function (t) { return "<span>" + ekEsc(t) + "</span>"; }).join("")]);
      if (x.eposta) rows.push(["E-posta", '<a href="mailto:' + ekEsc(x.eposta) + '">' + ekEsc(x.eposta) + "</a>"]);
      var old = li.querySelector(".card__ek");
      var tbl = document.createElement("table");
      tbl.className = "card__ek";
      tbl.innerHTML = rows.map(function (r) { return "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td></tr>"; }).join("") +
        "<caption>✓ Firma tarafından doğrulandı</caption>";
      if (old) old.replaceWith(tbl); else li.insertBefore(tbl, li.querySelector(".card__src"));
      var a = li.querySelector(".card__src a[href^='/firma-bilgisi/']");
      if (a) a.textContent = "Bilgileri güncelle";
    });
  }).catch(function () {});
})();

// /firma-bilgisi/: bilgi ekleme formu (firma ?f=<id> ile gelir)
(function () {
  var form = document.getElementById("ek-form");
  if (!form) return;
  var id = new URLSearchParams(location.search).get("f") || "";
  var msg = document.getElementById("ek-msg");
  function say(t, ok) { msg.textContent = t; msg.className = "ekform__msg " + (ok ? "is-ok" : "is-err"); msg.hidden = false; }
  fetch("/firma-adlari.json").then(function (r) { return r.json(); }).then(function (all) {
    var f = all[id];
    if (!f) { document.getElementById("ek-yok").hidden = false; return; }
    document.getElementById("ek-ad").textContent = f[0];
    document.getElementById("ek-tel").textContent = f[1];
    document.getElementById("ek-il").textContent = f[2];
    form.hidden = false;
    // Daha önce doğrulanmış bilgi varsa formu onunla doldur
    fetch(EK_API + "/ek.json").then(function (r) { return r.json(); }).then(function (ek) {
      var x = ek[id]; if (!x) return;
      form.adres.value = x.adres || "";
      form.eposta.value = x.eposta || "";
      form.querySelectorAll("input[name=turler]").forEach(function (c) { c.checked = (x.turler || []).indexOf(c.value) >= 0; });
    }).catch(function () {});
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var turler = [].map.call(form.querySelectorAll("input[name=turler]:checked"), function (c) { return c.value; });
      var eposta = form.eposta.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(eposta)) { say("Geçerli bir e-posta adresi yazın."); form.eposta.focus(); return; }
      if (!form.adres.value.trim() && !turler.length) { say("En az adres ya da bir hurda türü girin."); return; }
      if (!form.onay.checked) { say("Yayınlanması için onay kutusunu işaretleyin."); return; }
      var btn = form.querySelector("button"); btn.disabled = true; say("Gönderiliyor...", true);
      fetch(EK_API + "/basvuru", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        firma: id, firma_ad: f[0], adres: form.adres.value, turler: turler, eposta: eposta, onay: true, web: form.web.value }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (res.ok) { say("Doğrulama e-postası " + eposta + " adresine gönderildi. E-postadaki bağlantıyı açtığınızda bilgiler yayına girer. Gelen kutusunda göremezseniz istenmeyen (spam) klasörüne bakın.", true); btn.hidden = true; }
          else say(res.j.hata || "Bir hata oluştu, lütfen tekrar deneyin.");
        }).catch(function () { btn.disabled = false; say("Bağlantı kurulamadı, lütfen tekrar deneyin."); });
    });
  }).catch(function () { document.getElementById("ek-yok").hidden = false; });
})();

// /firma-bilgisi/dogrula/#<anahtar>: anahtar # sonrasında gelir (sunucu kayıtlarına düşmez);
// e-posta programlarının bağlantı önizlemesi JS çalıştırmadığı için yanlışlıkla onaylanmaz.
(function () {
  var el = document.getElementById("ek-dogrula");
  if (!el) return;
  var t = location.hash.slice(1);
  function say(h, ok) { el.innerHTML = h; el.className = "ekform__msg " + (ok ? "is-ok" : "is-err"); }
  if (!t) { say("Bağlantı eksik. E-postadaki bağlantıyı tamamıyla açın."); return; }
  fetch(EK_API + "/dogrula", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: t }) })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (res) {
      if (res.ok) say("<b>" + ekEsc(res.j.firma_ad) + "</b> için bilgiler onaylandı ve yayına girdi; firma kartında görünür.", true);
      else say(ekEsc(res.j.hata || "Onaylanamadı."));
    }).catch(function () { say("Bağlantı kurulamadı, lütfen sayfayı yenileyin."); });
})();
