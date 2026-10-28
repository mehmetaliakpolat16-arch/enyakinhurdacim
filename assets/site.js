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
