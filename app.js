(function(){
const { useEffect, useState } = React;

// Direct RSS sources - Israel (Hebrew) and US (English) only
const IL_RSS = [
  "https://www.ynet.co.il/Integration/StoryRss2.xml",
  "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FrontPage1",
  "https://rcs.mako.co.il/rss/news-israel.xml",
  "https://www.calcalist.co.il/GeneralRSS/0,16335,,00.xml"
];

const US_RSS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.cnn.com/rss/edition.rss",
  "https://feeds.npr.org/1001/rss.xml",
  "https://feeds.foxnews.com/foxnews/latest"
];

// Fallback sources if main ones fail
const FALLBACK_RSS = [
  "https://feeds.reuters.com/reuters/topNews",
  "https://feeds.washingtonpost.com/rss/world",
  "https://feeds.nbcnews.com/nbcnews/public/news",
  "https://feeds.skynews.com/feeds/rss/world.xml"
];

function heVariants(q){
  const set = new Set([q]);
  if (q.includes("פיברומילאגיה")) set.add("פיברומיאלגיה");
  set.add(q.replace(/ילאגיה/g,"יאלגיה"));
  return Array.from(set).filter(Boolean);
}
function timeAgo(iso){
  if(!iso) return "";
  const parsed = Date.parse(iso);
  if (isNaN(parsed)) return "";
  const t = Date.now() - parsed;
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
  // Use a more reliable proxy service that works better with GitHub Pages
// Alternative working proxy services
const PROXY_SERVICES = [
  { 
    name: "CORS-Proxy", 
    url: (u) => `https://proxy.cors.sh/${u}`, 
    headers: { 'x-cors-api-key': 'temp_public' },
    emoji: "🌐" 
  },
  { 
    name: "Proxy-CORS", 
    url: (u) => `https://api.proxycors.com/?url=${encodeURIComponent(u)}`, 
    emoji: "🔄" 
  },
  { 
    name: "Heroku-Proxy", 
    url: (u) => `https://safe-cors-anywhere.herokuapp.com/${u}`, 
    emoji: "�" 
  },
  { 
    name: "AllOrigins-Raw", 
    url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, 
    emoji: "�" 
  }
];

async function proxyFetch(url, timeout = 12000) {
  console.log(`� Starting fetch for: ${url}`);
  
  // Try direct fetch first for feeds that might allow CORS
  try {
    console.log(`🎯 Attempting direct fetch...`);
    const directResponse = await fetch(url, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'NewsAggregator/1.0'
      },
      signal: AbortSignal.timeout(8000)
    });
    
    if (directResponse.ok) {
      const text = await directResponse.text();
      if (text && text.length > 50 && (text.includes('<rss') || text.includes('<feed') || text.includes('<item'))) {
        console.log(`✅ Direct fetch succeeded: ${text.length} chars`);
        return text;
      }
    }
  } catch (e) {
    console.log(`❌ Direct fetch failed: ${e.message}`);
  }
  
  // Try proxy services
  for (const proxy of PROXY_SERVICES) {
    try {
      console.log(`${proxy.emoji} Trying ${proxy.name}...`);
      
      const fetchOptions = {
        signal: AbortSignal.timeout(timeout),
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          ...(proxy.headers || {})
        }
      };
      
      const response = await fetch(proxy.url(url), fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      
      // Validate RSS content
      if (!text || text.length < 50) {
        throw new Error(`Content too short: ${text.length} chars`);
      }
      
      if (!text.includes('<rss') && !text.includes('<feed') && !text.includes('<item') && !text.includes('<entry')) {
        throw new Error('Content does not appear to be RSS/XML');
      }
      
      console.log(`✅ ${proxy.name} succeeded: ${text.length} chars`);
      return text;
      
    } catch (error) {
      console.log(`❌ ${proxy.name} failed: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('❌ All proxy services failed - RSS feed may be temporarily unavailable');
}  for (const proxy of proxies) {
    try {
      console.log(`🔄 Trying ${proxy.name} for ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(proxy.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (compatible; NewsReader/1.0)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await proxy.parseResponse(response);
      
      // Validate we got RSS content
      if (text && text.length > 200 && (text.includes('<rss') || text.includes('<feed') || text.includes('<?xml'))) {
        console.log(`✅ Successfully fetched via ${proxy.name}`);
        return text;
      } else {
        throw new Error(`Invalid RSS content from ${proxy.name}`);
      }
      
    } catch (error) {
      console.log(`❌ ${proxy.name} failed: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('All proxy services failed');
}
async function fetchRSS(url){
  console.log(`� Fetching RSS from: ${new URL(url).hostname}`);
  
  try {
    const xmlText = await proxyFetch(url);
    
    // Clean up the XML text to handle encoding and entity issues
    const cleanXml = xmlText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove invalid XML characters
      .replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;') // Fix unescaped ampersands
      .replace(/^\s*<\?xml[^>]*\?>\s*/, '') // Remove XML declaration if present
      .trim();
    
    // Try to parse as XML
    const xml = new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8"?>${cleanXml}`, "application/xml");
    const parseError = xml.querySelector('parsererror');
    
    if (parseError) {
      console.warn(`⚠️ XML parse error for ${url}, trying as HTML...`);
      // Try parsing as HTML in case it's not proper XML
      const htmlDoc = new DOMParser().parseFromString(cleanXml, "text/html");
      const items = Array.from(htmlDoc.querySelectorAll("item, entry"));
      if (items.length === 0) {
        throw new Error("No RSS items found in feed");
      }
      const results = parseRSSItems(htmlDoc, url);
      console.log(`✅ Parsed ${results.length} items from ${new URL(url).hostname} (HTML fallback)`);
      return results;
    }
    
    const results = parseRSSItems(xml, url);
    console.log(`✅ Parsed ${results.length} items from ${new URL(url).hostname}`);
    return results;
    
  } catch (error) {
    console.error(`❌ Failed to fetch RSS from ${new URL(url).hostname}:`, error.message);
    return [];
  }
}

function parseRSSItems(doc, url) {
  const sourceDomain = new URL(url).hostname.replace(/^www\./, "");
  
  const items = Array.from(doc.querySelectorAll("item, entry")).map((it,idx)=>{
    const title = it.querySelector("title")?.textContent?.trim() || "";
    let link = it.querySelector("link")?.getAttribute("href") || it.querySelector("link")?.textContent || "";
    const pubDate = it.querySelector("pubDate")?.textContent || it.querySelector("updated")?.textContent || "";
    const description = it.querySelector("description")?.textContent || it.querySelector("summary")?.textContent || "";
    const source = sourceDomain;
    
    // Try to get image from RSS feed with domain validation
    let rssImage = it.querySelector("enclosure[type^='image']")?.getAttribute("url") ||
                   it.querySelector("media\\:thumbnail, thumbnail")?.getAttribute("url") ||
                   it.querySelector("media\\:content[medium='image'], content[medium='image']")?.getAttribute("url");
    
    // Validate RSS image domain
    if (rssImage) {
      try {
        const imageUrl = new URL(rssImage);
        const imageDomain = imageUrl.hostname;
        const isSameDomain = imageDomain === sourceDomain || imageDomain.includes(sourceDomain);
        const isTrustedCDN = imageDomain.includes('cloudfront.net') || 
                           imageDomain.includes('cloudinary.com') ||
                           imageDomain.includes('images.') ||
                           imageDomain.includes('static.') ||
                           imageDomain.includes('cdn.') ||
                           imageDomain.includes('media.');
        
        if (!isSameDomain && !isTrustedCDN) {
          console.log(`🚫 RSS: Blocked image from untrusted domain: ${imageDomain} for source ${sourceDomain}`);
          rssImage = null;
        }
      } catch (e) {
        rssImage = null;
      }
    }
    
    try{
      const base = new URL(url);
      if (link) {
        link = new URL(link, base).toString();
        const u = new URL(link);
        if (u.hostname.includes("google.") && (u.searchParams.get("q")||u.searchParams.get("url"))) {
          link = u.searchParams.get("q") || u.searchParams.get("url");
        }
      }
    }catch(_){ }
    
    return {
      id: source+"_"+idx+"_"+(link||title).slice(0,40),
      title, url: link, originalUrl: link, source,
      publishedAt: (()=>{ if (!pubDate) return new Date().toISOString(); const d = new Date(pubDate); return isNaN(d) ? new Date().toISOString() : d.toISOString(); })(),
      description: (description||"").replace(/<[^>]+>/g,""),
      image: rssImage, // Use validated RSS image if available
      needsImageFetch: !rssImage, score: 0
    };
  });
  return items;
}
async function getOriginalArticleData(targetUrl){
  if (!/^https?:\/\//.test(targetUrl)) return null;
  try{
    const html = await proxyFetch(targetUrl);
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    // Extract domain from the original article URL
    const articleDomain = new URL(targetUrl).hostname;
    
    let image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
              || doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    
    if (!image){
      const img = doc.querySelector("article img, .article img, .content img, .post img, img");
      if (img){
        image = img.getAttribute("src") || img.getAttribute("data-src");
      }
    }
    
    // Validate and fix image URL
    if (image) {
      try {
        // If relative URL, make it absolute using the article's domain
        if (!/^https?:\/\//.test(image)) {
          const base = new URL(targetUrl);
          image = new URL(image, base.origin).toString();
        }
        
        // Ensure image is from the same domain or trusted CDN
        const imageUrl = new URL(image);
        const imageDomain = imageUrl.hostname;
        
        // Only allow images from the same domain or well-known CDNs
        const isSameDomain = imageDomain === articleDomain || imageDomain.includes(articleDomain.replace('www.', ''));
        const isTrustedCDN = imageDomain.includes('cloudfront.net') || 
                           imageDomain.includes('cloudinary.com') ||
                           imageDomain.includes('imgur.com') ||
                           imageDomain.includes('images.') ||
                           imageDomain.includes('static.') ||
                           imageDomain.includes('cdn.') ||
                           imageDomain.includes('media.');
        
        if (!isSameDomain && !isTrustedCDN) {
          console.log(`🚫 Blocked image from untrusted domain: ${imageDomain} for article from ${articleDomain}`);
          image = null;
        }
        
        // Validate image file extension
        if (image && !/(\.jpg|\.jpeg|\.png|\.webp|\.gif)(\?|$)/i.test(image)) {
          console.log(`🚫 Invalid image format for: ${image}`);
          image = null;
        }
        
      } catch (e) {
        console.log(`🚫 Invalid image URL: ${image}`);
        image = null;
      }
    }
    
    const enhancedTitle = doc.querySelector("meta[property='og:title']")?.content || "";
    const enhancedDescription = doc.querySelector("meta[property='og:description']")?.content
                             || doc.querySelector("meta[name='description']")?.content || "";
    
    return { image, enhancedTitle, enhancedDescription };
  }catch(e){
    console.error(`❌ Failed to fetch article data from ${targetUrl}:`, e.message);
    return null;
  }
}

function App(){
  const [topic, setTopic] = useState(localStorage.getItem("news_last_topic") || "");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scan, setScan] = useState({attempted:0, succeeded:0});

  React.useEffect(()=>{ localStorage.setItem("news_last_topic", topic); }, [topic]);

  async function fetchNews(q){
    setLoading(true); 
    setArticles([]);
    setError("");
    
    try {
      const variants = heVariants(q).map(s=>s.toLowerCase());
      const endpoints = [...IL_RSS, ...US_RSS];
      console.log(`Total RSS sources configured: ${endpoints.length}`);
      setScan({attempted:endpoints.length, succeeded:0});
      
      // Fetch RSS feeds with timeout and limit concurrent requests
      const fetchWithTimeout = (url) => {
        return Promise.race([
          fetchRSS(url),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 15000)
          )
        ]);
      };
      
      // Process in smaller batches to avoid overwhelming the proxies
      const batchSize = 3;
      const results = [];
      
      for (let i = 0; i < endpoints.length; i += batchSize) {
        const batch = endpoints.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(url => fetchWithTimeout(url))
        );
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < endpoints.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      let succeeded = results.filter(r=>r.status==='fulfilled' && r.value.length>0).length;
      console.log(`RSS fetch results: ${succeeded} succeeded out of ${endpoints.length} total`);
      
      // If most sources failed, try fallback sources
      if (succeeded < 2 && FALLBACK_RSS.length > 0) {
        console.log('Trying fallback RSS sources...');
        const fallbackResults = await Promise.allSettled(
          FALLBACK_RSS.map(url => fetchWithTimeout(url))
        );
        results.push(...fallbackResults);
        succeeded = results.filter(r=>r.status==='fulfilled' && r.value.length>0).length;
        setScan({attempted:endpoints.length + FALLBACK_RSS.length, succeeded});
      } else {
        setScan({attempted:endpoints.length, succeeded});
      }

      if (succeeded === 0) {
        setError("Unable to fetch news from any sources due to CORS restrictions. This is a temporary issue with external RSS feeds. Please try again later.");
        setLoading(false);
        return;
      }

      // Only show warning if less than 60% of sources are working (3 out of 5)
      if (succeeded < endpoints.length * 0.6) {
        setError(`Warning: Only ${succeeded} out of ${endpoints.length} news sources are working due to CORS issues. Results may be limited.`);
      }

      let merged=[]; const seen=new Set();
      for (const r of results){
        if (r.status!=='fulfilled') continue;
        for (const it of r.value){
          const key = (it.url||'')+'|'+(it.title||'').toLowerCase();
          if (!seen.has(key)){ seen.add(key); merged.push(it); }
        }
      }
      
      const filtered = merged.filter(item=>{
        if (!q || q.trim() === '') return true; // Show all if no search query
        
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const searchQuery = q.toLowerCase().trim();
        
        // Check for exact phrase in title or description
        const matchesTitle = title.includes(searchQuery);
        const matchesDescription = description.includes(searchQuery);
        const matches = matchesTitle || matchesDescription;
        
        // Debug log for troubleshooting
        if (matches) {
          console.log(`Found match for "${searchQuery}":`, {
            title: item.title,
            matchesTitle,
            matchesDescription
          });
        }
        
        return matches;
      });
      let finalFiltered = filtered;
      // Only show recent articles when no search query is provided
      if (!q || q.trim() === '') {
        finalFiltered = merged.slice(0, 120);
      }
      // If there's a search query but no results, finalFiltered will remain empty (which is correct)

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
    } catch (error) {
      console.error("Error fetching news:", error);
      setError("An error occurred while fetching news. Please try again.");
      setLoading(false);
    }
  }

  return React.createElement('div', {className:'container'},
    React.createElement('div', {className:'header'},
      React.createElement('h1', {style:{margin:0}}, 'Topic News Aggregator'),
      React.createElement('div', null,
        React.createElement('span', {className:'pill'}, `Sources scanned: ${scan.succeeded}/${scan.attempted}`),
        React.createElement('span', {className:'pill'}, 'Israel: Hebrew RSS'),
        React.createElement('span', {className:'pill'}, 'US: English RSS'),
        React.createElement('span', {className:'pill'}, 'No Google News')
      )
    ),
    React.createElement('div', {className:'search'},
      React.createElement('input', {
        value: topic, placeholder:'Search a topic to see results.',
        onChange: e=>setTopic(e.target.value),
        onKeyDown: e=>{ if (e.key==='Enter') fetchNews(topic); }
      }),
      React.createElement('button', {className:'btn', onClick: ()=>fetchNews(topic), disabled:loading}, loading?'Loading…':'Search'),
      React.createElement('button', {className:'btn', style:{background:'#334155'}, onClick: ()=>{setTopic(''); setArticles([]); setError('');} }, 'Clear')
    ),
    error ? React.createElement('div', {className:'error', style:{background:'rgba(239,68,68,0.1)', color:'#dc2626', padding:'12px', borderRadius:'8px', margin:'12px 0'}}, error) : null,
    articles.length===0 && !loading && !error ? React.createElement('div', {className:'empty'}, 'Search for a topic to see results.') : null,
    React.createElement('div', {className:'grid'},
      articles.map(a=>
        React.createElement('a', {
          key: a.id,
          href: a.url || '#',
          target: '_blank',
          rel: 'noopener noreferrer',
          style: { textDecoration: 'none', color: 'inherit' }
        },
          React.createElement('article', null,
            // Only show image if one exists from content
            a.image ? React.createElement('img', {
              src: a.image, 
              alt: '',
              style: { objectFit: 'cover', width: '100%', height: '180px' }
            }) : null,
            React.createElement('div', {className:'pad'},
              React.createElement('div', {className:'meta'},
                React.createElement('span', {className:'src'}, a.source),
                React.createElement('span', null, timeAgo(a.publishedAt))
              ),
              React.createElement('h3', {style:{margin:'8px 0 6px',fontSize:18,color:'#111827'}}, a.enhancedTitle || a.title),
              a.description ? React.createElement('p', {style:{margin:0,color:'#334155'}}, a.enhancedDescription || a.description) : null
            )
          )
        )
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
})();