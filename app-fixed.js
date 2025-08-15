// News Aggregator App - Clean Hebrew Search Implementation

(function() {
    'use strict';

    const { createElement: h, useState, useEffect, useMemo } = React;

    // Utility functions
    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    function scoreRelevance(article, searchTerm) {
        if (!searchTerm) return 0;
        
        const terms = getSearchVariants(searchTerm);
        const title = article.title || '';
        const description = article.description || '';
        
        let score = 0;
        
        // Check all term variants
        for (const term of terms) {
            const isHebrew = /[\u0590-\u05FF]/.test(term);
            
            if (isHebrew) {
                // For Hebrew, check exact matches
                if (title.includes(term)) score += 10;
                if (description.includes(term)) score += 5;
            } else {
                // For English, use case-insensitive matching
                const lowerTitle = title.toLowerCase();
                const lowerDescription = description.toLowerCase();
                const lowerTerm = term.toLowerCase();
                if (lowerTitle.includes(lowerTerm)) score += 10;
                if (lowerDescription.includes(lowerTerm)) score += 5;
            }
        }
        
        // Recent articles get slight boost
        const hoursOld = (Date.now() - new Date(article.publishedAt)) / (1000 * 60 * 60);
        if (hoursOld < 24) score += 2;
        
        return score;
    }

    // Hebrew search term variants and transliterations
    function getSearchVariants(searchTerm) {
        if (!searchTerm) return [];
        
        const variants = new Set();
        const searchInput = searchTerm.trim();
        variants.add(searchInput);
        variants.add(searchInput.toLowerCase());
        
        // Hebrew to English transliterations
        const hebrewToEnglish = {
            'מעלה אדומים': ['maale adumim', 'ma\'ale adumim', 'maaleh adumim', 'ma\'aleh adumim'],
            'ירושלים': ['jerusalem'],
            'תל אביב': ['tel aviv'],
            'חיפה': ['haifa'],
            'באר שבע': ['beer sheva', 'beersheba'],
            'אילת': ['eilat'],
            'ישראל': ['israel'],
            'פלסטין': ['palestine'],
            'עזה': ['gaza'],
            'גדה מערבית': ['west bank'],
            'יהודה ושומרון': ['west bank'],
            'צהל': ['idf', 'israel defense forces'],
            'שב״כ': ['shin bet', 'shabak'],
            'משטרה': ['police'],
            'בית משפט': ['court'],
            'ביטחון': ['security'],
            'טרור': ['terror', 'terrorism'],
            'פיגוע': ['attack', 'terror attack'],
            'התנחלות': ['settlement'],
            'מתנחל': ['settler'],
            'פיברומיאלגיה': ['fibromyalgia'],
            'פיברומילאגיה': ['fibromyalgia'],
            'מורפים': ['morphine', 'opioids', 'painkillers', 'narcotics', 'opiates'],
            'מורפין': ['morphine', 'opioids', 'painkillers', 'narcotics'],
            'כאב': ['pain'],
            'כאבים': ['pain', 'pains'],
            'רפואה': ['medicine', 'medical'],
            'בריאות': ['health'],
            'תרופות': ['medication', 'drugs', 'medicine'],
            'תרופה': ['medication', 'drug', 'medicine'],
            'חולים': ['patients', 'sick'],
            'בית חולים': ['hospital'],
            'רופא': ['doctor', 'physician'],
            'אחות': ['nurse'],
            'טיפול': ['treatment', 'therapy'],
            'מחלה': ['disease', 'illness'],
            'וירוס': ['virus'],
            'קורונה': ['corona', 'covid'],
            'חיסון': ['vaccine', 'vaccination'],
            'ניו יורק': ['new york', 'nyc', 'manhattan', 'brooklyn'],
            'לוס אנג\'לס': ['los angeles', 'la'],
            'לונדון': ['london'],
            'פריז': ['paris'],
            'ברלין': ['berlin'],
            'רומא': ['rome'],
            'מדריד': ['madrid'],
            'מוסקבה': ['moscow'],
            'וושינגטון': ['washington', 'dc'],
            'אמריקה': ['america', 'usa', 'united states'],
            'ארה״ב': ['usa', 'america', 'united states'],
            'בריטניה': ['britain', 'uk', 'england'],
            'גרמניה': ['germany'],
            'צרפת': ['france'],
            'איטליה': ['italy'],
            'ספרד': ['spain'],
            'רוסיה': ['russia'],
            'סין': ['china'],
            'יפן': ['japan'],
            'הודו': ['india'],
            'מצרים': ['egypt'],
            'ירדן': ['jordan'],
            'לבנון': ['lebanon'],
            'סוריה': ['syria'],
            'עיראק': ['iraq'],
            'איראן': ['iran'],
            'טורקיה': ['turkey'],
            'סעודיה': ['saudi arabia', 'saudi'],
            'איחוד האמירויות': ['uae', 'united arab emirates'],
            'קטר': ['qatar'],
            'כווית': ['kuwait'],
            'בחריין': ['bahrain'],
            'עומאן': ['oman']
        };
        
        // English to Hebrew transliterations
        const englishToHebrew = {
            'maale adumim': ['מעלה אדומים'],
            'ma\'ale adumim': ['מעלה אדומים'],
            'maaleh adumim': ['מעלה אדומים'],
            'ma\'aleh adumim': ['מעלה אדומים'],
            'jerusalem': ['ירושלים'],
            'tel aviv': ['תל אביב'],
            'haifa': ['חיפה'],
            'beer sheva': ['באר שבע'],
            'beersheba': ['באר שבע'],
            'eilat': ['אילת'],
            'israel': ['ישראל'],
            'palestine': ['פלסטין'],
            'gaza': ['עזה'],
            'west bank': ['גדה מערבית', 'יהודה ושומרון'],
            'settlement': ['התנחלות'],
            'settler': ['מתנחל'],
            'fibromyalgia': ['פיברומיאלגיה', 'פיברומילאגיה'],
            'morphine': ['מורפים', 'מורפין'],
            'opioids': ['מורפים', 'אופיואידים'],
            'opiates': ['מורפים'],
            'painkillers': ['משכני כאבים', 'מורפים'],
            'narcotics': ['סמים', 'מורפים'],
            'pain': ['כאב', 'כאבים'],
            'medicine': ['רפואה', 'תרופות'],
            'medical': ['רפואי', 'רפואה'],
            'health': ['בריאות'],
            'medication': ['תרופות', 'תרופה'],
            'drugs': ['תרופות', 'סמים'],
            'patients': ['חולים'],
            'sick': ['חולים'],
            'hospital': ['בית חולים'],
            'doctor': ['רופא'],
            'physician': ['רופא'],
            'nurse': ['אחות'],
            'treatment': ['טיפול'],
            'therapy': ['טיפול'],
            'disease': ['מחלה'],
            'illness': ['מחלה'],
            'virus': ['וירוס'],
            'corona': ['קורונה'],
            'covid': ['קורונה'],
            'vaccine': ['חיסון'],
            'vaccination': ['חיסון'],
            'new york': ['ניו יורק'],
            'nyc': ['ניו יורק'],
            'manhattan': ['מנהטן', 'ניו יורק'],
            'brooklyn': ['ברוקלין', 'ניו יורק'],
            'los angeles': ['לוס אנג\'לס'],
            'la': ['לוס אנג\'לס'],
            'london': ['לונדון'],
            'paris': ['פריז'],
            'berlin': ['ברלין'],
            'rome': ['רומא'],
            'madrid': ['מדריד'],
            'moscow': ['מוסקבה'],
            'washington': ['וושינגטון'],
            'dc': ['וושינגטון'],
            'america': ['אמריקה', 'ארה״ב'],
            'usa': ['ארה״ב', 'אמריקה'],
            'united states': ['ארה״ב', 'אמריקה'],
            'britain': ['בריטניה'],
            'uk': ['בריטניה'],
            'england': ['בריטניה', 'אנגליה'],
            'germany': ['גרמניה'],
            'france': ['צרפת'],
            'italy': ['איטליה'],
            'spain': ['ספרד'],
            'russia': ['רוסיה'],
            'china': ['סין'],
            'japan': ['יפן'],
            'india': ['הודו'],
            'egypt': ['מצרים'],
            'jordan': ['ירדן'],
            'lebanon': ['לבנון'],
            'syria': ['סוריה'],
            'iraq': ['עיראק'],
            'iran': ['איראן'],
            'turkey': ['טורקיה'],
            'saudi arabia': ['סעודיה'],
            'saudi': ['סעודיה'],
            'uae': ['איחוד האמירויות'],
            'united arab emirates': ['איחוד האמירויות'],
            'qatar': ['קטר'],
            'kuwait': ['כווית'],
            'bahrain': ['בחריין'],
            'oman': ['עומאן']
        };
        
        // Add Hebrew variants if searching in Hebrew
        if (hebrewToEnglish[searchInput]) {
            hebrewToEnglish[searchInput].forEach(variant => variants.add(variant));
        }
        
        // Add English variants if searching in English
        const lowerInput = searchInput.toLowerCase();
        if (englishToHebrew[lowerInput]) {
            englishToHebrew[lowerInput].forEach(variant => variants.add(variant));
        }
        
        // Handle partial matches for compound terms
        const words = searchInput.split(/\s+/);
        if (words.length > 1) {
            words.forEach(word => {
                const trimmedWord = word.trim();
                const lowerWord = word.toLowerCase().trim();
                
                if (hebrewToEnglish[trimmedWord]) {
                    hebrewToEnglish[trimmedWord].forEach(variant => variants.add(variant));
                }
                if (englishToHebrew[lowerWord]) {
                    englishToHebrew[lowerWord].forEach(variant => variants.add(variant));
                }
            });
        }
        
        return Array.from(variants);
    }

    // API functions
    async function fetchFromRSSSource(source) {
        try {
            console.log(`🔄 Fetching ${source.name}...`);
            
            const response = await fetch(source.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status !== 'ok') {
                console.warn(`⚠️ ${source.name}: ${data.message || 'API error'}`);
                return [];
            }
            
            const articles = (data.items || []).map((item, index) => {
                let image = item.thumbnail || 
                           item.enclosure?.link || 
                           extractImageFromContent(item.content || item.description);
                           
                if (!isValidImageUrl(image)) {
                    image = null;
                }
                
                return {
                    id: `${source.name.toLowerCase().replace(/\s+/g, '-')}-${index}-${Date.now()}`,
                    title: item.title || '',
                    description: (item.description || item.content || '').replace(/<[^>]*>/g, '').trim().slice(0, 200),
                    url: item.link || '',
                    image: image,
                    publishedAt: item.pubDate || new Date().toISOString(),
                    source: source.name,
                    score: 0
                };
            }).filter(article => article.title && article.url);
            
            console.log(`✅ ${source.name}: ${articles.length} articles`);
            return articles;
            
        } catch (error) {
            console.error(`❌ ${source.name}: ${error.message}`);
            return [];
        }
    }

    function extractImageFromContent(content) {
        if (!content) return null;
        
        const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
        if (imgMatch) return imgMatch[1];
        
        const urlMatch = content.match(/https?:\/\/[^\s<>"]+\.(jpg|jpeg|png|gif|webp)/i);
        if (urlMatch) return urlMatch[0];
        
        return null;
    }

    function isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.length < 10) return false;
        return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) && 
               /^https?:\/\//.test(url);
    }

    async function fetchAllNews() {
        const sources = [
            { name: 'BBC News', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/rss.xml' },
            { name: 'Reuters', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.reuters.com/reuters/topNews' },
            { name: 'CNN', url: 'https://api.rss2json.com/v1/api.json?rss_url=http://rss.cnn.com/rss/edition.rss' },
            { name: 'Associated Press', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.washingtonpost.com/rss/world' },
            { name: 'NPR News', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.npr.org/1001/rss.xml' },
            { name: 'Ynet', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.ynet.co.il/Integration/StoryRss2.xml' },
            { name: 'Walla', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://rss.walla.co.il/feed/1?type=main' },
            { name: 'Israel Hayom', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.israelhayom.co.il/rss' }
        ];

        const promises = sources.map(source => fetchFromRSSSource(source));
        const results = await Promise.all(promises);
        
        const allArticles = results.flat();
        console.log(`📊 Total articles fetched: ${allArticles.length}`);
        
        return allArticles;
    }

    // Main App Component
    function NewsApp() {
        const [searchTerm, setSearchTerm] = useState('');
        const [articles, setArticles] = useState([]);
        const [filteredArticles, setFilteredArticles] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState('');
        const [stats, setStats] = useState({ sources: 0, articles: 0, lastUpdate: null });

        // Load articles on mount
        useEffect(() => {
            handleSearch();
        }, []);

        // Filter articles when search term changes
        useEffect(() => {
            if (!searchTerm.trim()) {
                setFilteredArticles(articles.slice(0, 20)); // Show recent articles
                return;
            }

            const searchVariants = getSearchVariants(searchTerm);
            const filtered = articles.filter(article => {
                // Get text content for searching - handle both Hebrew and English
                const title = article.title || '';
                const description = article.description || '';
                
                // Check if any search variant matches (case-insensitive for English, exact for Hebrew)
                return searchVariants.some(variant => {
                    const isHebrew = /[\u0590-\u05FF]/.test(variant);
                    
                    if (isHebrew) {
                        // For Hebrew, check exact matches and substrings
                        return title.includes(variant) || description.includes(variant);
                    } else {
                        // For English, use case-insensitive matching
                        const lowerTitle = title.toLowerCase();
                        const lowerDescription = description.toLowerCase();
                        const lowerVariant = variant.toLowerCase();
                        return lowerTitle.includes(lowerVariant) || lowerDescription.includes(lowerVariant);
                    }
                });
            });

            console.log(`🔍 Search "${searchTerm}" with variants:`, searchVariants);
            console.log(`📊 Found ${filtered.length} matching articles out of ${articles.length} total`);

            // Score and sort by relevance
            const scored = filtered.map(article => ({
                ...article,
                score: scoreRelevance(article, searchTerm)
            })).sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return new Date(b.publishedAt) - new Date(a.publishedAt);
            });

            setFilteredArticles(scored.slice(0, 20));
        }, [articles, searchTerm]);

        async function handleSearch() {
            setLoading(true);
            setError('');
            
            try {
                const allArticles = await fetchAllNews();
                setArticles(allArticles);
                setStats({
                    sources: 8,
                    articles: allArticles.length,
                    lastUpdate: new Date().toLocaleTimeString()
                });
            } catch (err) {
                setError('Failed to fetch news. Please try again.');
                console.error('Search error:', err);
            } finally {
                setLoading(false);
            }
        }

        function handleClear() {
            setSearchTerm('');
        }

        // Render the app
        return h('div', { className: 'app' }, [
            // Header
            h('div', { className: 'header' }, [
                h('h1', { className: 'title' }, [
                    h('span', { className: 'icon' }, '📰'),
                    ' News Aggregator'
                ]),
                h('p', { className: 'subtitle' }, 'Search and discover relevant news from trusted sources')
            ]),
            
            // Search Bar
            h('div', { className: 'search-container' }, [
                h('input', {
                    type: 'text',
                    className: 'search-input',
                    placeholder: 'חפש חדשות (Search news in Hebrew or English)...',
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value),
                    onKeyDown: (e) => {
                        if (e.key === 'Enter') {
                            handleSearch();
                        }
                    }
                }),
                h('button', {
                    className: 'search-button',
                    onClick: handleSearch,
                    disabled: loading
                }, loading ? '...' : 'Search'),
                h('button', {
                    className: 'clear-button',
                    onClick: handleClear
                }, 'Clear')
            ]),
            
            // Stats
            h('div', { className: 'stats' }, [
                h('span', { className: 'stat' }, `Sources: ${stats.sources}/8`),
                h('span', { className: 'stat' }, `Articles: ${stats.articles}`),
                h('span', { className: 'stat' }, `Updated: ${stats.lastUpdate || 'Loading...'}`)
            ]),
            
            // Error Message
            error && h('div', { className: 'error' }, [
                h('span', { className: 'error-icon' }, '⚠️'),
                error
            ]),
            
            // Search Results Summary
            !loading && filteredArticles.length > 0 && h('div', {
                className: 'results-summary'
            }, [
                h('h2', { className: 'results-title' }, [
                    h('span', { className: 'results-icon' }, '🔍'),
                    searchTerm.trim() ? 
                    `Found ${filteredArticles.length} articles about "${searchTerm}"` :
                    `Showing ${filteredArticles.length} recent articles`
                ])
            ]),
            
            // No Results
            !loading && !error && filteredArticles.length === 0 && searchTerm.trim() && h('div', {
                className: 'no-results'
            }, [
                h('div', { className: 'no-results-icon' }, '🔍'),
                h('h2', { className: 'no-results-title' }, 'No results found'),
                h('p', { className: 'no-results-message' }, 
                    `No articles found for "${searchTerm}". Try a different search term.`
                )
            ]),
            
            // Loading
            loading && h('div', { className: 'loading' }, [
                h('div', { className: 'loading-spinner' }, '🔄'),
                'Loading news...'
            ]),
            
            // Articles Grid
            !loading && filteredArticles.length > 0 && h('div', {
                className: 'articles-grid'
            }, filteredArticles.map(article => 
                h('article', {
                    key: article.id,
                    className: 'article-card',
                    onClick: () => window.open(article.url, '_blank')
                }, [
                    article.image && h('div', {
                        className: 'article-image',
                        style: { backgroundImage: `url(${article.image})` }
                    }),
                    h('div', { className: 'article-content' }, [
                        h('h3', { className: 'article-title' }, article.title),
                        h('p', { className: 'article-description' }, article.description),
                        h('div', { className: 'article-meta' }, [
                            h('span', { className: 'article-source' }, article.source),
                            h('span', { className: 'article-time' }, formatTimeAgo(article.publishedAt))
                        ])
                    ])
                ])
            ))
        ]);
    }

    // Initialize the app
    ReactDOM.render(h(NewsApp), document.getElementById('root'));
})();
