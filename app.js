
(function(){
  'use strict';
  const { createElement: h, useState, useEffect, useMemo } = React;

  // --- Sources that work on GitHub Pages via rss2json ---
  const SOURCES = [
    // English / Global
    { name: 'BBC',      rss: 'https://feeds.bbci.co.uk/news/rss.xml' },
    { name: 'Reuters',  rss: 'https://feeds.reuters.com/reuters/topNews' },
    { name: 'CNN',      rss: 'http://rss.cnn.com/rss/edition.rss' },
    { name: 'Guardian', rss: 'https://www.theguardian.com/world/rss' },
    { name: 'AP',       rss: 'https://apnews.com/apf-topnews?output=rss' },
    // Hebrew / Israel
    { name: 'Ynet',         rss: 'https://www.ynet.co.il/Integration/StoryRss2.xml' },
    { name: 'Walla',        rss: 'https://rss.walla.co.il/feed/1?type=main' },
    { name: 'Israel Hayom', rss: 'https://www.israelhayom.co.il/rss' },
    { name: 'Globes',       rss: 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=1225' }
  ];

  const RSS2JSON = (rss) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`;

  function isHebrew(text){
    return /[\u0590-\u05FF]/.test(text || '');
  }

  function normalize(text){
    return (text || '').toLowerCase();
  }

  // Expand search variants (basic transliterations and common aliases)
  function variants(term){
    if(!term) return [];
    const v = new Set([term.trim(), term.trim().toLowerCase()]);
    const mapHebToEng = {
      'ירושלים':['jerusalem'], 'תל אביב':['tel aviv', 'tel-aviv'], 'ניו יורק':['new york','nyc'],
      'ישראל':['israel'], 'עזה':['gaza'], 'צהל':['idf']
    };
    const mapEngToHeb = {
      'jerusalem':['ירושלים'], 'tel aviv':['תל אביב'], 'new york':['ניו יורק'], 'israel':['ישראל'], 'gaza':['עזה'], 'idf':['צהל']
    };
    if(mapHebToEng[term]) mapHebToEng[term].forEach(x=>v.add(x));
    if(mapEngToHeb[term.toLowerCase()]) mapEngToHeb[term.toLowerCase()].forEach(x=>v.add(x));
    return Array.from(v);
  }

  function timeAgo(dstr){
    const d = new Date(dstr);
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff/3.6e6), m = Math.floor((diff%3.6e6)/6e4);
    if(h<=0) return `${m}m`;
    if(h<24) return `${h}h`;
    const days = Math.floor(h/24);
    return `${days}d`;
  }

  async function fetchSource(source){
    try{
      const r = await fetch(RSS2JSON(source.rss));
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const items = (data.items||[]).map((x, i)=>{
        let image = x.thumbnail || (x.enclosure && x.enclosure.link) || null;
        if(!image){
          // best-effort scrape from content
          const m = /\bsrc=["']([^"']+\.(?:jpg|jpeg|png|webp|gif))["']/i.exec(x.content||x.description||'');
          if(m) image = m[1];
        }
        const isImg = u => !!u && /^(https?:)?\/\//i.test(u);
        if(!isImg(image)) image = null;
        return {
          id: `${source.name}-${i}-${Date.now()}`,
          title: x.title || '',
          description: (x.description || x.content || '').replace(/<[^>]*>/g,'').trim().slice(0,220),
          url: x.link || '',
          image,
          publishedAt: x.pubDate || new Date().toISOString(),
          source: source.name
        };
      }).filter(a=>a.title && a.url);
      return items;
    }catch(e){
      console.warn('Source failed', source.name, e.message);
      return [];
    }
  }

  function App(){
    const [q, setQ] = useState('');
    const [dir, setDir] = useState('rtl');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [all, setAll] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [stats, setStats] = useState({sources:0, articles:0, updated:null});

    useEffect(()=>{
      (async ()=>{
        setLoading(true); setError('');
        const lists = await Promise.all(SOURCES.map(fetchSource));
        const merged = lists.flat();
        setAll(merged);
        setStats({sources: lists.filter(x=>x.length>0).length, articles: merged.length, updated: new Date().toLocaleTimeString()});
        setLoading(false);
      })();
    },[]);

    useEffect(()=>{
      const rtl = isHebrew(q);
      setDir(rtl?'rtl':'ltr');
      const v = variants(q);
      if(!q.trim()){
        setFiltered(all.slice(0,36));
        return;
      }
      const out = all.filter(a=>{
        const title = normalize(a.title), desc = normalize(a.description);
        return v.some(t=>{
          const n = normalize(t);
          return title.includes(n) || desc.includes(n);
        });
      });
      setFiltered(out);
    }, [q, all]);

    const pills = h('div', {className:'pills'},
      SOURCES.map(s=>h('span', {className:'source-pill', key:s.name}, s.name))
    );

    return h('div', {className:'container'},
      h('div', {className:'header'}, [
        h('div', {className:'brand'}, [
          h('div', {className:'logo'}, '🗞️'),
          h('div', {className:'title'}, 'News Aggregator')
        ]),
      ]),
      h('div', {className:'controls'}, [
        h('input', {
          className:'search ' + (dir==='rtl'?'rtl':'ltr'),
          placeholder:'חפש חדשות בעברית או באנגלית… / Search news…',
          value:q,
          onChange:e=>setQ(e.target.value)
        }),
        h('button', {className:'btn', onClick:()=>setQ('')}, 'נקה / Clear')
      ]),
      h('div', {className:'meta'}, `Sources: ${stats.sources}/${SOURCES.length} • Articles: ${stats.articles} • Updated: ${stats.updated||'…'}`),
      pills,
      loading && h('div', {className:'loading'}, 'Loading news…'),
      error && h('div', {className:'error'}, error),
      (!loading && filtered.length===0) && h('div', {className:'no-results'}, `No results for "${q}". Try a different term.`),
      h('div', {className:'grid'},
        filtered.map(a=>h('a', {className:'card', key:a.id, href:a.url, target:'_blank', rel:'noopener'}, [
          h('img', {src: a.image || 'https://picsum.photos/600/400?blur=2', alt:''}),
          h('div', {className:'content'}, [
            h('div', {className:'title'}, a.title),
            h('div', {className:'desc'}, a.description),
            h('div', {className:'footer'}, [
              h('span', null, a.source),
              h('span', null, timeAgo(a.publishedAt))
            ])
          ])
        ]))
      )
    );
  }

  ReactDOM.createRoot(document.getElementById('app')).render(h(App));
})();
