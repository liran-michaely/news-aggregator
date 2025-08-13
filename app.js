(function(){
const { useEffect, useState } = React;

// Direct RSS sources only (no Google News)
const IL_RSS = [
  "https://rss.walla.co.il/rss/1",
  "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FrontPage1",
  "https://rcs.mako.co.il/rss/news-israel.xml",
  "https://www.jpost.com/Rss/RssFeedsHeadlines.aspx",
  "https://www.timesofisrael.com/feed/",
  "https://www.haaretz.com/cmlink/haaretz-com-all-headlines-rss-1.4605102",
  "https://www.calcalist.co.il/home/0,7340,L-8,00.html?service=rss",
  "https://www.themarker.com/cmlink/1.147",
  "https://www.i24news.tv/en/rss.xml"
];

const INTL_RSS = [
  "https://www.reuters.com/rss/world",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://apnews.com/hub/apf-topnews?utm_source=rss",
  "https://www.theguardian.com/world/rss",
  "https://www.dw.com/en/top-stories/s-9097?maca=en-rss-en-all-1573-xml-rss",
  "https://www.france24.com/en/rss",
  "https://rss.cnn.com/rss/edition_world.rss",
  "https://www.npr.org/rss/rss.php?id=1004"
];

function heVariants(q){
  const set = new Set([q]);
  if (q.includes("פיברומילאגיה")) set.add("פיברומיאלגיה");
  set.add(q.replace(/ילאגיה/g,"יאלגיה"));
  return Array.from(set).filter(Boolean);
}
function timeAgo(iso){
  if(!iso) return "";
  const t = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(t/60000));
  if (m < 1) return "just now";
  if (m < 60) return m+"m";
  const h = Math.floor(m/60);
  if (h < 24) return h+"h";
  const d = Math.floor(h/24);
  return d+"d";
}
function normalizeAndSort(arr, qForRelevance){
  const list = [...arr];
  const q = (qForRelevance||"").toLowerCase();
  return list.sort((a,b)=>{
    const inA = (a.title||"").toLowerCase().includes(q)?1:0;
    const inB = (b.title||"").toLowerCase().includes(q)?1:0;
    const tA = new Date(a.publishedAt||0).getTime();
    const tB = new Date(b.publishedAt||0).getTime();
    return (inB*2 + tB/1e13) - (inA*2 + tA/1e13);
  });
}
async function proxyFetch(url){
  const r = await fetch("/api/proxy?url=" + encodeURIComponent(url));
  if (!r.ok) throw new Error("Proxy fetch failed: "+r.status);
  return r.text();
}
async function fetchRSS(url){
  const xmlText = await proxyFetch(url);
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  const parseError = xml.querySelector('parsererror');
  if (parseError) throw new Error("XML parse error");
  const items = Array.from(xml.querySelectorAll("item, entry")).map((it,idx)=>{
    const title = it.querySelector("title")?.textContent?.trim() || "";
    let link = it.querySelector("link")?.getAttribute("href") || it.querySelector("link")?.textContent || "";
    const pubDate = it.querySelector("pubDate")?.textContent || it.querySelector("updated")?.textContent || "";
    const description = it.querySelector("description")?.textContent || it.querySelector("summary")?.textContent || "";
    const source = (new URL(url)).hostname.replace(/^www\./,"");
    try{
      const u = new URL(link);
      if (u.hostname.includes("google.") && (u.searchParams.get("q")||u.searchParams.get("url"))) {
        link = u.searchParams.get("q") || u.searchParams.get("url");
      }
    }catch(_){}
    return {
      id: source+"_"+idx+"_"+(link||title).slice(0,40),
      title, url: link, originalUrl: link, source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      description: (description||"").replace(/<[^>]+>/g,""),
      image: "https://picsum.photos/seed/"+encodeURIComponent(title||source)+"/900/600",
      needsImageFetch: true, score: 0
    };
  });
  return items;
}
async function getOriginalArticleData(targetUrl){
  if (!/^https?:\/\//.test(targetUrl)) return null;
  try{
    const html = await proxyFetch(targetUrl);
    const doc = new DOMParser().parseFromString(html, "text/html");
    let image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
              || doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    if (!image){
      const img = doc.querySelector("article img, .article img, .content img, .post img, img");
      if (img){
        image = img.getAttribute("src") || img.getAttribute("data-src");
      }
    }
    if (image && !/^https?:\/\//.test(image)){
      try{
        const base = new URL(targetUrl);
        image = new URL(image, base.origin).toString();
      }catch(_){}
    }
    const enhancedTitle = doc.querySelector("meta[property='og:title']")?.content || "";
    const enhancedDescription = doc.querySelector("meta[property='og:description']")?.content
                             || doc.querySelector("meta[name='description']")?.content || "";
    return { image, enhancedTitle, enhancedDescription };
  }catch(e){
    return null;
  }
}

function App(){
  const [topic, setTopic] = useState(localStorage.getItem("news_last_topic") || "");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState({attempted:0, succeeded:0});

  React.useEffect(()=>{ localStorage.setItem("news_last_topic", topic); }, [topic]);

  async function fetchNews(q){
    setLoading(true); setArticles([]);
    const variants = heVariants(q).map(s=>s.toLowerCase());
    const endpoints = [...IL_RSS, ...INTL_RSS];
    setScan({attempted:endpoints.length, succeeded:0});
    let results = await Promise.allSettled(endpoints.map(fetchRSS));
    let succeeded = results.filter(r=>r.status==='fulfilled' && r.value.length>0).length;
    setScan({attempted:endpoints.length, succeeded});

    let merged=[]; const seen=new Set();
    for (const r of results){
      if (r.status!=='fulfilled') continue;
      for (const it of r.value){
        const key = (it.url||'')+'|'+(it.title||'').toLowerCase();
        if (!seen.has(key)){ seen.add(key); merged.push(it); }
      }
    }
    if (succeeded===0){
      setLoading(false);
      setArticles([]);
      return;
    }
    const filtered = merged.filter(item=>{
      let hay = ((item.title||'')+' '+(item.description||'')).toLowerCase()
                 .replace(/&nbsp;|nbsp;|nbsp/gi,' ').replace(/\u00a0/g,' ');
      return variants.length ? variants.some(v=>hay.includes(v)) : true;
    });
    let finalFiltered = filtered;
    if (finalFiltered.length === 0){
      finalFiltered = merged.slice(0, 120);
    }

    Promise.all(finalFiltered.map(async (it)=>{
      if (it.needsImageFetch && it.url){
        const meta = await getOriginalArticleData(it.url);
        if (meta){
          if (meta.image) it.image = meta.image;
          if (meta.enhancedTitle && meta.enhancedTitle.length > (it.title||'').length) it.enhancedTitle = meta.enhancedTitle;
          if (meta.enhancedDescription && meta.enhancedDescription.length > (it.description||'').length) it.enhancedDescription = meta.enhancedDescription;
        }
      }
      return it;
    })).then(updated=>{
      setArticles(normalizeAndSort(updated, q));
    }).catch(()=>{
      setArticles(normalizeAndSort(finalFiltered, q));
    }).finally(()=> setLoading(false));
  }

  return React.createElement('div', {className:'container'},
    React.createElement('div', {className:'header'},
      React.createElement('h1', {style:{margin:0}}, 'Topic News Aggregator'),
      React.createElement('div', null,
        React.createElement('span', {className:'pill'}, `Sources scanned: ${scan.succeeded}/${scan.attempted}`),
        React.createElement('span', {className:'pill'}, 'IL: Direct RSS'),
        React.createElement('span', {className:'pill'}, 'International: Direct RSS'),
        React.createElement('span', {className:'pill'}, 'Direct links')
      )
    ),
    React.createElement('div', {className:'search'},
      React.createElement('input', {
        value: topic, placeholder:'Search a topic to see results.',
        onChange: e=>setTopic(e.target.value),
        onKeyDown: e=>{ if (e.key==='Enter') fetchNews(topic); }
      }),
      React.createElement('button', {className:'btn', onClick: ()=>fetchNews(topic), disabled:loading}, loading?'Loading…':'Search'),
      React.createElement('button', {className:'btn', style:{background:'#334155'}, onClick: ()=>{setTopic(''); setArticles([]);} }, 'Clear')
    ),
    articles.length===0 && !loading ? React.createElement('div', {className:'empty'}, 'Search for a topic to see results.') : null,
    React.createElement('div', {className:'grid'},
      articles.map(a=> React.createElement('article', {key:a.id},
        React.createElement('img', {src:a.image, alt:''}),
        React.createElement('div', {className:'pad'},
          React.createElement('div', {className:'meta'},
            React.createElement('span', {className:'src'}, a.source),
            React.createElement('span', null, timeAgo(a.publishedAt))
          ),
          React.createElement('h3', {style:{margin:'8px 0 6px',fontSize:18,color:'#111827'}}, a.enhancedTitle || a.title),
          a.description ? React.createElement('p', {style:{margin:0,color:'#334155'}}, a.enhancedDescription || a.description) : null
        )
      ))
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
})();