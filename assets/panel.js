// /panel/: firma başvurularını onaylama. Anahtar yalnız bu sekmede (sessionStorage) tutulur.
(function () {
  var API = /^(localhost|127.0.0.1)$/.test(location.hostname) ? "http://127.0.0.1:8095" : "https://api.enyakinhurdacim.com.tr";
  var form = document.getElementById("pn-giris"), ana = document.getElementById("pn-ana"), liste = document.getElementById("pn-liste");
  var sekme = ana.querySelector(".pn-sekme"), hata = document.getElementById("pn-hata");
  var anahtar = "", durum = "bekliyor", mevcut = {}, adlar = {};
  try { anahtar = sessionStorage.getItem("pn") || ""; } catch (x) {}
  var DURUM = [["bekliyor", "Bekleyenler"], ["onay", "Onaylananlar"], ["red", "Reddedilenler"]];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function api(yol, govde) {
    var o = { headers: { Authorization: "Bearer " + anahtar } };
    if (govde) { o.method = "POST"; o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(govde); }
    return fetch(API + yol, o).then(function (r) {
      if (r.status === 401) { cikis(); throw new Error("oturum"); }
      return r.json();
    });
  }
  function cikis() {
    anahtar = ""; ana.hidden = true; form.hidden = false;
    try { sessionStorage.removeItem("pn"); } catch (x) {}
  }
  function kart(k) {
    var var_ = mevcut[k.tel];
    var yer = [adlar[k.ilce], adlar[k.il] || k.il].filter(Boolean).join(", ");
    var dugme = (k.durum !== "onay" ? '<button class="btn" data-k="onay">Onayla</button>' : "") +
      (k.durum !== "red" ? '<button class="btn btn--ghost" data-k="red">Reddet</button>' : "") +
      (k.durum !== "bekliyor" ? '<button class="btn btn--ghost" data-k="bekliyor">Beklemeye al</button>' : "");
    return '<article class="pn-kart" data-id="' + k.id + '">' +
      (var_ ? '<p class="ekform__msg is-err">Bu telefon rehberde kayıtlı: ' + esc(var_[0]) + " (" + esc(var_[1]) + ")</p>" : "") +
      '<label class="fld"><span>Firma adı</span><input name="ad" value="' + esc(k.ad) + '"></label>' +
      '<label class="fld"><span>Adres</span><input name="adres" value="' + esc(k.adres) + '"></label>' +
      '<dl><dt>Telefon</dt><dd><a href="tel:' + esc(k.tel) + '">' + esc(k.telGoster) + "</a></dd><dt>Yer</dt><dd>" + esc(yer) + "</dd>" +
      "<dt>Hurdalar</dt><dd>" + (esc(k.turler.join(", ")) || "-") + "</dd><dt>E-posta</dt><dd>" + (esc(k.eposta) || "-") + "</dd>" +
      "<dt>Not</dt><dd>" + (esc(k.not) || "-") + "</dd><dt>Başvuru</dt><dd>" + esc(k.tarih) + "</dd></dl>" +
      '<div class="card__act">' + dugme + "</div></article>";
  }
  function yukle() {
    api("/panel/liste?durum=" + durum).then(function (d) {
      form.hidden = true; ana.hidden = false;
      sekme.innerHTML = DURUM.map(function (x) {
        return '<button role="tab" aria-selected="' + (x[0] === durum) + '" data-d="' + x[0] + '">' + x[1] + " (" + (d.sayilar[x[0]] || 0) + ")</button>";
      }).join("");
      liste.innerHTML = d.kayitlar.map(kart).join("") || '<p class="muted">Bu listede kayıt yok.</p>';
    }).catch(function () {});
  }
  form.addEventListener("submit", function (ev) {
    ev.preventDefault(); hata.hidden = true;
    fetch(API + "/panel/giris", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parola: form.parola.value }) })
      .then(function (r) { return r.json(); }).then(function (j) {
        if (!j.anahtar) { hata.textContent = j.hata || "Giriş yapılamadı."; hata.className = "ekform__msg is-err"; hata.hidden = false; return; }
        anahtar = j.anahtar; form.parola.value = "";
        try { sessionStorage.setItem("pn", anahtar); } catch (x) {}
        yukle();
      }).catch(function () { hata.textContent = "Sunucuya ulaşılamadı."; hata.className = "ekform__msg is-err"; hata.hidden = false; });
  });
  sekme.addEventListener("click", function (ev) {
    var d = ev.target.getAttribute("data-d");
    if (d) { durum = d; yukle(); }
  });
  liste.addEventListener("click", function (ev) {
    var k = ev.target.getAttribute("data-k");
    if (!k) return;
    var a = ev.target.closest(".pn-kart");
    ev.target.disabled = true;
    api("/panel/karar", { id: +a.getAttribute("data-id"), karar: k, ad: a.querySelector("[name=ad]").value, adres: a.querySelector("[name=adres]").value }).then(yukle).catch(function () {});
  });
  fetch("/panel/mevcut.json").then(function (r) { return r.json(); }).then(function (m) { mevcut = m; }).catch(function () {});
  fetch("/arama.json").then(function (r) { return r.json(); }).then(function (a) {
    a.forEach(function (x) { adlar[x.s] = x.a; });
    if (anahtar) yukle();
  }).catch(function () { if (anahtar) yukle(); });
})();
