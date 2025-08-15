
// Pure JS News Aggregator for GitHub Pages — Hebrew + English
// CORS-safe via: https://api.allorigins.win/raw?url=<encoded URL>

(function(){
  "use strict";

  const ALL_ORIGINS = (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`;

  // Feeds — Israeli (Hebrew) + Global (English)
  const FEEDS = [
    // Hebrew / Israel
    {name: "Ynet", url: "https://www.ynet.co.il/Integration/StoryRss2.xml"},
    {name: "Walla", url: "https://rss.walla.co.il/feed/1?type=main"},
    {name: "Israel Hayom", url: "https://www.israelhayom.co.il/rss"},
    {name: "Haaretz (Heb)", url: "https://www.haaretz.co.il/cmlink/1.1470869"},
    {name: "Globes", url: "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=1225"},

    // English / Global
    {name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml"},
    {name: "Reuters Top", url: "https://feeds.reuters.com/reuters/topNews"},
    {name: "AP Top", url: "https://apnews.com/apf-topnews?output=rss"},
    {name: "The Guardian World", url: "https://www.theguardian.com/world/rss"},
    {name: "CNN Top", url: "http://rss.cnn.com/rss/edition.rss"}
  ];

  const state = { items: [], filtered: [], loadedFeeds: 0, totalFeeds: FEEDS.length, lastUpdate: null };

  const el = {
    input: document.getElementById("searchInput"),
    search: document.getElementById("searchBtn"),
    clear: document.getElementById("clearBtn"),
    stats: document.getElementById("stats"),
    results: document.getElementById("results"),
    loading: document.getElementById("loading"),
    empty: document.getElementById("empty"),
    rtlToggle: document.getElementById("rtlToggle")
  };

  function isHebrew(text){ return /[\u0590-\u05FF]/.test(text || ""); }

  // Basic variant expansion for cross-language common locations
  const VARIANTS = {
    "ירושלים": ["jerusalem"],
    "תל אביב": ["tel aviv"],
    "ניו יורק": ["new york","nyc","manhattan","brooklyn"],
    "חיפה": ["haifa"],
    "באר שבע": ["beersheba","beer sheva"],
    "ישראל": ["israel"],
    "עזה": ["gaza"],
    "גדה מערבית": ["west bank"]
  };
  const REVERSE = {
    "jerusalem": ["ירושלים"],
    "tel aviv": ["תל אביב","תלאביב"],
    "new york": ["ניו יורק"],
    "nyc": ["ניו יורק"],
    "haifa": ["חיפה"],
    "israel": ["ישראל"],
    "gaza": ["עזה"],
    "west bank": ["גדה מערבית"]
  };

  function buildVariants(q){
    if(!q) return [];
    const set = new Set([q, q.toLowerCase().trim()]);
    const h = isHebrew(q);
    const map = h ? VARIANTS : REVERSE;
    const key = q.toLowerCase().trim();
    if(map[key]) map[key].forEach(v => set.add(v));
    return Array.from(set);
  }

  function updateStats(){
    el.stats.textContent = `מקורות: ${state.totalFeeds} • כתבות: ${state.items.length} • עודכן: ${state.lastUpdate ? state.lastUpdate.toLocaleTimeString() : "—"}`;
  }

  function timeAgo(dateStr){
    const d = new Date(dateStr);
    const diff = Math.max(0, Date.now() - d.getTime());
    const mins = Math.floor(diff/60000);
    if(mins < 1) return "now";
    if(mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins/60);
    if(hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours/24);
    return `${days}d ago`;
  }

  function isValidImage(u){
    return /^https?:\/\//i.test(u||"") && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(u||"");
  }

  function extractImage(item, desc){
    const media = item.querySelector("media\\:content, content");
    if(media && isValidImage(media.getAttribute("url"))) return media.getAttribute("url");
    const enc = item.querySelector("enclosure");
    if(enc && isValidImage(enc.getAttribute("url"))) return enc.getAttribute("url");
    const m = /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|gif|webp)[^"']*)["']/i.exec(desc || "");
    return m ? m[1] : null;
  }

  async function fetchFeed(feed){
    try{
      const resp = await fetch(ALL_ORIGINS(feed.url), {headers:{"Accept":"application/rss+xml,text/xml,text/plain"}});
      if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const xml = new DOMParser().parseFromString(text, "text/xml");
      const items = Array.from(xml.querySelectorAll("item"));
      const list = items.map((it, idx) => {
        const title = it.querySelector("title")?.textContent?.trim() || "";
        const link = it.querySelector("link")?.textContent?.trim() || "";
        const descRaw = it.querySelector("description")?.textContent || "";
        const pub = it.querySelector("pubDate")?.textContent || new Date().toUTCString();
        let img = extractImage(it, descRaw);
        if(!isValidImage(img)) img = null;
        return {
          id: `${feed.name}-${idx}-${Date.now()}`,
          title,
          link,
          description: (descRaw || "").replace(/<[^>]*>/g,"").trim(),
          publishedAt: pub,
          source: feed.name,
          image: img
        };
      }).filter(a => a.title && a.link);
      state.items.push(...list);
    }catch(e){
      console.warn("Feed failed:", feed.name, e.message);
    }finally{
      state.loadedFeeds++;
    }
  }

  function render(list){
    el.results.innerHTML = "";
    if(!list.length){
      el.empty.classList.remove("hidden");
      return;
    }
    el.empty.classList.add("hidden");

    const frag = document.createDocumentFragment();
    list.forEach(a => {
      const card = document.createElement("article");
      card.className = "card";

      const img = document.createElement("img");
      img.className = "thumb";
      img.alt = "";
      img.loading = "lazy";
      img.src = a.image || "https://r.jina.ai/http://placehold.co/800x450?text=News";
      card.appendChild(img);

      const body = document.createElement("div");
      body.className = "card-body";

      const h3 = document.createElement("h3");
      h3.className = "title";
      h3.textContent = a.title;

      const meta = document.createElement("div");
      meta.className = "meta";
      const s1 = document.createElement("span");
      s1.textContent = a.source;
      const s2 = document.createElement("span");
      s2.textContent = timeAgo(a.publishedAt);
      meta.appendChild(s1); meta.appendChild(s2);

      const p = document.createElement("p");
      p.className = "desc";
      p.textContent = a.description;

      const link = document.createElement("a");
      link.href = a.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = isHebrew(a.title) ? "פתח כתבה" : "Open article";
      link.className = "btn";

      body.appendChild(h3);
      body.appendChild(meta);
      body.appendChild(p);
      body.appendChild(link);
      card.appendChild(body);

      frag.appendChild(card);
    });
    el.results.appendChild(frag);
  }

  function filterItems(q){
    if(!q){
      state.filtered = state.items.slice(0, 40);
      render(state.filtered);
      return;
    }
    const variants = buildVariants(q);
    const filtered = state.items.filter(a => {
      const title = (a.title || "").toLowerCase();
      const desc = (a.description || "").toLowerCase();
      return variants.some(v => {
        const needle = (v||"").toLowerCase();
        return title.includes(needle) || desc.includes(needle);
      });
    });
    state.filtered = filtered;
    render(filtered);
  }

  async function init(){
    el.loading.classList.remove("hidden");
    state.items = []; state.filtered = []; state.loadedFeeds = 0;

    await Promise.all(FEEDS.map(fetchFeed));
    state.lastUpdate = new Date();
    updateStats();
    el.loading.classList.add("hidden");

    // Pre-filter if URL has ?search=
    const params = new URLSearchParams(location.search);
    const q = params.get("search") || "";
    if(q){ el.input.value = q; filterItems(q); }
    else { filterItems(""); }
  }

  // UI Events
  el.search.addEventListener("click", () => {
    const q = el.input.value.trim();
    const url = new URL(location.href);
    if(q) url.searchParams.set("search", q); else url.searchParams.delete("search");
    history.replaceState({}, "", url.toString());
    filterItems(q);
  });

  el.clear.addEventListener("click", () => {
    el.input.value = "";
    const url = new URL(location.href);
    url.searchParams.delete("search");
    history.replaceState({}, "", url.toString());
    filterItems("");
  });

  el.input.addEventListener("keydown", (e) => {
    if(e.key === "Enter") el.search.click();
  });

  el.rtlToggle.addEventListener("change", (e) => {
    document.documentElement.setAttribute("dir", e.target.checked ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", e.target.checked ? "he" : "en");
  });

  // Kickoff
  init();
})();
