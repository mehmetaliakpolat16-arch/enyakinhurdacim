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
