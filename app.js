/* Journal de prompts PPI / PPC — application mobile (PWA)
 * Notions abordées : DOM, événements, stockage local, requête HTTP POST (fetch),
 * file d'attente hors ligne, service worker, Web Share Target.
 */
const VERSION = "1.0.0";

// ---------- 1. Les listes (identiques à l'onglet « Listes » du Google Sheet) ----------
const LISTES = {
  outils: ["Claude", "ChatGPT", "Gemini", "Mistral (Le Chat)", "NotebookLM", "Copilot", "Midjourney", "Autre"],
  parties: ["Introduction", "Partie I", "Partie II", "Partie III", "Conclusion", "Glossaire", "Annexes", "Mise en forme"],
  etapes: {
    PPI: ["Cerner le sujet", "Problématiser", "Contextualiser (interne, PESTEL)", "Veille prospective, facteurs de rupture",
      "Analyser et interpréter les données", "Enquête, interviews", "Prototype ou preuve de concept",
      "Plan de gestion des risques", "Conduite du changement", "Structurer et rédiger", "Relecture, orthographe",
      "Mise en forme du dossier"],
    PPC: ["Veille : existant et KPI", "Veille : marque, publics, concurrence, tendances",
      "Contours stratégiques : positionnement, objectifs, cibles", "Insight", "Conceptualiser : axe créa, promesse",
      "Explorer les voies et les formats", "Copy stratégie, brief créatif", "Production : maquettes, contenus",
      "Charte graphique", "Structurer et rédiger", "Relecture, orthographe", "Mise en forme du dossier"]
  }
};

// ---------- 2. Petit stockage local tolérant aux erreurs ----------
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } }
};
const KEYS = { hook: "jp.hook", ep: "jp.epreuve", last: "jp.last", queue: "jp.queue", hist: "jp.historique", draft: "jp.brouillon" };

const $ = (s) => document.querySelector(s);
const state = {
  hook: store.get(KEYS.hook, ""),
  ep: store.get(KEYS.ep, "PPI"),
  last: store.get(KEYS.last, {}),           // derniers choix (outil, partie, étape)
  queue: store.get(KEYS.queue, []),         // prompts en attente d'envoi
  hist: store.get(KEYS.hist, [])            // historique local
};

// ---------- 3. Remplir les listes déroulantes ----------
function fill(sel, values, selected) {
  sel.innerHTML = "";
  for (const v of values) {
    const o = document.createElement("option");
    o.value = o.textContent = v;
    if (v === selected) o.selected = true;
    sel.append(o);
  }
}
function renderEpreuve() {
  document.querySelectorAll("[data-ep]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ep === state.ep)));
  $("#pillEpreuve").textContent = state.ep;
  fill($("#etape"), LISTES.etapes[state.ep], state.last["etape_" + state.ep]);
}
fill($("#outil"), LISTES.outils, state.last.outil);
fill($("#partie"), LISTES.parties, state.last.partie);
renderEpreuve();

document.querySelectorAll("[data-ep]").forEach(b => b.addEventListener("click", () => {
  state.ep = b.dataset.ep; store.set(KEYS.ep, state.ep); renderEpreuve();
}));

// ---------- 4. Navigation entre les écrans ----------
function show(view) {
  for (const v of ["saisir", "historique", "reglages"]) $("#view-" + v).hidden = v !== view;
  document.querySelectorAll("nav button").forEach(b => {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  if (view === "historique") renderHist();
  window.scrollTo(0, 0);
}
document.querySelectorAll("nav button").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));

// ---------- 5. Zone de prompt : compteur, brouillon, coller ----------
const ta = $("#prompt");
function updateCounter() { $("#counter").textContent = ta.value.length.toLocaleString("fr-FR") + " car."; }
ta.addEventListener("input", () => { updateCounter(); store.set(KEYS.draft, ta.value); });
ta.value = store.get(KEYS.draft, ""); updateCounter();

$("#btnPaste").addEventListener("click", async () => {
  try {
    const t = await navigator.clipboard.readText();
    if (t) { ta.value = t; ta.dispatchEvent(new Event("input")); toast("Prompt collé"); }
    else toast("Le presse-papiers est vide");
  } catch { ta.focus(); toast("Appui long dans la zone › Coller"); }
});
$("#btnClear").addEventListener("click", () => { ta.value = ""; $("#objectif").value = ""; ta.dispatchEvent(new Event("input")); });

// ---------- 6. Texte reçu depuis le menu Partager (Android) ou un lien ----------
(function readIncoming() {
  const p = new URLSearchParams(location.search);
  if (p.get("hook")) { state.hook = p.get("hook").trim(); store.set(KEYS.hook, state.hook); toast("Adresse d'envoi enregistrée"); }
  if (p.get("epreuve") && LISTES.etapes[p.get("epreuve")]) { state.ep = p.get("epreuve"); store.set(KEYS.ep, state.ep); renderEpreuve(); }
  const shared = [p.get("text"), p.get("title")].filter(Boolean).join("\n").trim();
  if (shared) { ta.value = shared; ta.dispatchEvent(new Event("input")); toast("Texte reçu : complétez puis enregistrez"); }
  if ([...p.keys()].length) history.replaceState(null, "", location.pathname); // nettoie l'URL
})();

// ---------- 7. Envoi vers Make ----------
// Requête POST « formulaire » : c'est une requête dite simple, le navigateur l'envoie sans pré-vérification.
async function post(entry) {
  const body = new URLSearchParams({
    epreuve: entry.epreuve, outil: entry.outil, partie: entry.partie,
    etape: entry.etape, objectif: entry.objectif, prompt: entry.prompt
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(state.hook, { method: "POST", body, signal: ctrl.signal });
    const text = (await res.text()).trim();
    if (!res.ok) throw new Error("HTTP " + res.status + (text ? " — " + text : ""));
    return text || "Prompt enregistré";
  } finally { clearTimeout(timer); }
}

function addHist(entry, status) {
  state.hist.unshift({ ...entry, status });
  state.hist = state.hist.slice(0, 100);
  store.set(KEYS.hist, state.hist);
}
function setHistStatus(id, status) {
  const h = state.hist.find(x => x.id === id); if (h) h.status = status;
  store.set(KEYS.hist, state.hist);
}

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.hook) { toast("Ajoutez d'abord votre adresse d'envoi"); show("reglages"); $("#hook").focus(); return; }
  const prompt = ta.value.trim();
  if (!prompt) { toast("Le prompt est vide"); ta.focus(); return; }

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
    epreuve: state.ep, outil: $("#outil").value, partie: $("#partie").value,
    etape: $("#etape").value, objectif: $("#objectif").value.trim(), prompt
  };
  state.last = { ...state.last, outil: entry.outil, partie: entry.partie, ["etape_" + state.ep]: entry.etape };
  store.set(KEYS.last, state.last);

  const btn = $("#btnSend"); btn.disabled = true; btn.textContent = "Envoi…";
  try {
    const msg = await post(entry);
    addHist(entry, "sent");
    // « Accepted » = Make a bien reçu le prompt, mais le scénario est en pause : il l'écrira à sa réactivation.
    if (/^accepted$/i.test(msg)) toast("📥 Reçu par Make. Scénario en pause : la ligne arrivera dans le Sheet à sa réactivation");
    else toast(msg.startsWith("✅") ? msg : "✅ " + msg);
    ta.value = ""; $("#objectif").value = ""; ta.dispatchEvent(new Event("input"));
  } catch (err) {
    // Hors ligne ou erreur : on garde le prompt dans la file d'attente, avec sa date de saisie.
    state.queue.push(entry); store.set(KEYS.queue, state.queue);
    addHist(entry, "wait");
    toast(navigator.onLine ? "Envoi impossible, prompt mis en attente" : "Hors ligne : prompt mis en attente");
    console.warn(err);
    ta.value = ""; $("#objectif").value = ""; ta.dispatchEvent(new Event("input"));
  } finally {
    btn.disabled = false; btn.textContent = "Enregistrer dans mon journal"; renderQueue();
  }
});

// ---------- 8. File d'attente hors ligne ----------
async function flushQueue() {
  if (!state.hook || !state.queue.length || !navigator.onLine) return;
  const rest = []; let sent = 0;
  for (const entry of state.queue) {
    // L'heure de saisie réelle est ajoutée à l'objectif, car Make horodate à la réception.
    const dated = { ...entry, objectif: (entry.objectif ? entry.objectif + " " : "") + "[saisi le " + fmt(entry.date) + "]" };
    try { await post(dated); setHistStatus(entry.id, "sent"); sent++; } catch { rest.push(entry); }
  }
  state.queue = rest; store.set(KEYS.queue, rest); renderQueue();
  if (sent) toast(`✅ ${sent} prompt${sent > 1 ? "s" : ""} en attente envoyé${sent > 1 ? "s" : ""}`);
}
function renderQueue() {
  const n = state.queue.length;
  $("#queueNotice").hidden = n === 0;
  $("#queueText").textContent = `${n} prompt${n > 1 ? "s" : ""} en attente d'envoi`;
  $("#setupNotice").hidden = !!state.hook;
}
$("#btnRetry").addEventListener("click", flushQueue);
window.addEventListener("online", () => { renderNet(); flushQueue(); });
window.addEventListener("offline", renderNet);
function renderNet() { $("#net").textContent = navigator.onLine ? "" : "hors ligne"; }

// ---------- 9. Historique ----------
function fmt(iso) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function renderHist() {
  const ul = $("#list"); ul.innerHTML = "";
  if (!state.hist.length) { ul.innerHTML = '<li class="empty">Aucun prompt pour l\'instant. Le premier envoi apparaîtra ici.</li>'; return; }
  for (const h of state.hist) {
    const li = document.createElement("li"); li.className = "item";
    li.innerHTML = `<div class="meta"><span class="tag ${h.status}">${h.status === "sent" ? "Envoyé" : "En attente"}</span>
      <span>${fmt(h.date)}</span><span>${h.epreuve} · ${h.outil}</span><span>${h.partie} · ${h.etape}</span></div>
      ${h.objectif ? `<div><b></b></div>` : ""}<div class="txt"></div>
      <div class="acts"><button class="btn btn-ghost" type="button" data-act="copy">Copier</button>
      <button class="btn btn-ghost" type="button" data-act="reuse">Réutiliser</button></div>`;
    if (h.objectif) li.querySelector("b").textContent = h.objectif;   // textContent : pas d'injection HTML
    li.querySelector(".txt").textContent = h.prompt;
    li.querySelector('[data-act="copy"]').addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(h.prompt); toast("Prompt copié"); } catch { toast("Copie impossible"); }
    });
    li.querySelector('[data-act="reuse"]').addEventListener("click", () => {
      ta.value = h.prompt; $("#objectif").value = h.objectif; ta.dispatchEvent(new Event("input")); show("saisir");
      toast("Prompt rechargé : modifiez-le puis enregistrez la nouvelle version");
    });
    ul.append(li);
  }
}

// ---------- 10. Réglages ----------
$("#hook").value = state.hook;
$("#defEp").value = state.ep;
$("#exLink").textContent = location.origin + location.pathname + "?hook=ADRESSE";
$("#version").textContent = "Version " + VERSION;
$("#btnSave").addEventListener("click", () => {
  const v = $("#hook").value.trim();
  if (v && !/^https:\/\/\S+$/.test(v)) { toast("L'adresse doit commencer par https://"); return; }
  state.hook = v; store.set(KEYS.hook, v);
  state.ep = $("#defEp").value; store.set(KEYS.ep, state.ep); renderEpreuve();
  renderQueue(); toast("Réglages enregistrés"); show("saisir"); flushQueue();
});
$("#btnWipe").addEventListener("click", () => {
  const b = $("#btnWipe");
  if (b.dataset.confirm) { state.hist = []; store.set(KEYS.hist, []); delete b.dataset.confirm; b.textContent = "Vider l'historique local"; toast("Historique vidé"); return; }
  b.dataset.confirm = "1"; b.textContent = "Toucher encore pour confirmer";
  setTimeout(() => { delete b.dataset.confirm; b.textContent = "Vider l'historique local"; }, 4000);
});

// ---------- 11. Message éphémère ----------
var tt; // « var » : utilisable avant cette ligne (hoisting)
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2800); }

// ---------- 12. Démarrage ----------
renderNet(); renderQueue(); flushQueue();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
