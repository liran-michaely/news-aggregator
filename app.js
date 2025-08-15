(function() {
    const { useState, useEffect, createElement: h } = React;

    // News API configuration - using NewsAPI.org for reliable results
    const NEWS_API_KEY = 'demo'; // Using demo key for now
    const NEWS_SOURCES = [
        { id: 'bbc-news', name: 'BBC News', language: 'en' },
        { id: 'cnn', name: 'CNN', language: 'en' },
        { id: 'reuters', name: 'Reuters', language: 'en' },
        { id: 'associated-press', name: 'Associated Press', language: 'en' },
        { id: 'the-times-of-israel', name: 'Times of Israel', language: 'en' }
    ];

    // Alternative RSS-to-JSON sources for better coverage - TESTED AND WORKING
    const RSS_SOURCES = [
        // English sources
        {
            name: 'BBC World',
            language: 'en',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.bbci.co.uk%2Fnews%2Fworld%2Frss.xml'
        },
        {
            name: 'CNN Top Stories',
            language: 'en', 
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Frss.cnn.com%2Frss%2Fedition.rss'
        },
        {
            name: 'Reuters',
            language: 'en',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.reuters.com%2Freuters%2FtopNews'
        },
        {
            name: 'Times of Israel',
            language: 'en',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.timesofisrael.com%2Ffeed%2F'
        },
        {
            name: 'Jerusalem Post',
            language: 'en',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.jpost.com%2Frss%2Frssfeedsfrontpage.aspx'
        },
        // Hebrew sources - VERIFIED WORKING
        {
            name: 'Ynet חדשות',
            language: 'he',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.ynet.co.il%2Fintegration%2Fstoryrss2.xml'
        },
        {
            name: 'וואלה! חדשות',
            language: 'he',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Frss.walla.co.il%2Ffeed%2F1'
        },
        {
            name: 'ישראל היום',
            language: 'he',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.israelhayom.co.il%2Frss'
        },
        // NOTE: Other Hebrew sources (Haaretz, Maariv, Globes, Calcalist) are not working with RSS-to-JSON
    ];

    // Utility functions
    function extractImageFromContent(content) {
        if (!content) return null;
        
        // Extract image from HTML content
        const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
        if (imgMatch) {
            return imgMatch[1];
        }
        
        // Look for common image patterns
        const urlMatch = content.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/i);
        if (urlMatch) {
            return urlMatch[1];
        }
        
        return null;
    }

    function isValidImageUrl(url) {
        if (!url) return false;
        try {
            new URL(url);
            return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
        } catch {
            return false;
        }
    }

    function timeAgo(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
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
        
        const term = searchTerm.toLowerCase().trim();
        const variants = new Set([term]);
        
        // Hebrew to English transliterations
        const hebrewToEnglish = {
            'מעלה אדומים': ['maale adumim', 'ma\'ale adumim', 'maaleh adumim', 'ma\'aleh adumim'],
            'ירושלים': ['jerusalem', 'yerushalayim'],
            'תל אביב': ['tel aviv'],
            'חיפה': ['haifa'],
            'באר שבע': ['beer sheva', 'beersheba'],
            'אילת': ['eilat'],
            'נתניה': ['netanya'],
            'רמת גן': ['ramat gan'],
            'פתח תקווה': ['petah tikva', 'petach tikva'],
            'חולון': ['holon'],
            'בת ים': ['bat yam'],
            'רחובות': ['rehovot'],
            'אשדוד': ['ashdod'],
            'אשקלון': ['ashkelon'],
            'הרצליה': ['herzliya'],
            'כפר סבא': ['kfar saba'],
            'רעננה': ['raanana'],
            'גבעתיים': ['givatayim'],
            'ישראל': ['israel'],
            'פלסטין': ['palestine'],
            'עזה': ['gaza'],
            'רמאללה': ['ramallah'],
            'חברון': ['hebron'],
            'נבלוס': ['nablus'],
            'יהודה ושומרון': ['judea and samaria', 'west bank'],
            'גדה מערבית': ['west bank'],
            'גליל': ['galilee'],
            'נגב': ['negev'],
            'כנסת': ['knesset'],
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
            'חיסון': ['vaccine', 'vaccination']
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
            'vaccination': ['חיסון']
        };
        
        const originalTerm = searchTerm.trim();
        const lowerTerm = originalTerm.toLowerCase();
        
        // Add Hebrew variants if searching in Hebrew
        if (hebrewToEnglish[originalTerm]) {
            hebrewToEnglish[originalTerm].forEach(variant => variants.add(variant));
        }
        
        // Add English variants if searching in English
        if (englishToHebrew[lowerTerm]) {
            englishToHebrew[lowerTerm].forEach(variant => variants.add(variant));
        }
        
        // Handle partial matches for compound terms
        const words = originalTerm.split(/\s+/);
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
            console.error(`❌ ${source.name} failed:`, error.message);
            return [];
        }
    }

    async function fetchAllNews() {
        console.log('🚀 Starting news fetch...');
        
        const fetchPromises = RSS_SOURCES.map(source => fetchFromRSSSource(source));
        const results = await Promise.allSettled(fetchPromises);
        
        const allArticles = [];
        let successCount = 0;
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.length > 0) {
                allArticles.push(...result.value);
                successCount++;
            }
        });
        
        // Remove duplicates based on title similarity
        const uniqueArticles = [];
        const seenTitles = new Set();
        
        for (const article of allArticles) {
            const titleKey = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
            if (!seenTitles.has(titleKey)) {
                seenTitles.add(titleKey);
                uniqueArticles.push(article);
            }
        }
        
        console.log(`📊 Total: ${uniqueArticles.length} unique articles from ${successCount}/${RSS_SOURCES.length} sources`);
        return uniqueArticles;
    }

    // React components
    function LoadingSpinner() {
        return h('div', { 
            style: { 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '40px',
                color: '#fff'
            } 
        }, '🔄 Loading news...');
    }

    function ErrorMessage({ message }) {
        return h('div', {
            style: {
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                margin: '16px 0',
                color: '#fff'
            }
        }, `❌ ${message}`);
    }

    function StatusBar({ attempted, succeeded, totalArticles }) {
        return h('div', {
            style: {
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '20px'
            }
        }, [
            h('span', { 
                key: 'sources',
                className: 'pill',
                style: { background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)' }
            }, `Sources: ${succeeded}/${attempted}`),
            h('span', { 
                key: 'articles',
                className: 'pill',
                style: { background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }
            }, `Articles: ${totalArticles}`),
            h('span', { 
                key: 'updated',
                className: 'pill' 
            }, `Updated: ${new Date().toLocaleTimeString()}`)
        ]);
    }

    function ArticleCard({ article }) {
        const [imageError, setImageError] = useState(false);
        
        return h('article', {
            style: {
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                ':hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
                }
            },
            onClick: () => window.open(article.url, '_blank')
        }, [
            // Image section
            article.image && !imageError ? h('img', {
                key: 'image',
                src: article.image,
                alt: article.title,
                style: {
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    display: 'block'
                },
                onError: () => setImageError(true)
            }) : h('div', {
                key: 'placeholder',
                style: {
                    width: '100%',
                    height: '200px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px'
                }
            }, '📰'),
            
            // Content section
            h('div', {
                key: 'content',
                style: { padding: '16px' }
            }, [
                // Metadata
                h('div', {
                    key: 'meta',
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                        fontSize: '12px',
                        color: '#64748b'
                    }
                }, [
                    h('span', {
                        key: 'source',
                        style: {
                            background: '#e2e8f0',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            color: '#1e293b'
                        }
                    }, article.source),
                    h('span', { key: 'time' }, timeAgo(article.publishedAt))
                ]),
                
                // Title
                h('h3', {
                    key: 'title',
                    style: {
                        margin: '0 0 8px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        lineHeight: '1.4',
                        color: '#1e293b'
                    }
                }, article.title),
                
                // Description
                h('p', {
                    key: 'description',
                    style: {
                        margin: 0,
                        fontSize: '14px',
                        lineHeight: '1.5',
                        color: '#64748b'
                    }
                }, article.description)
            ])
        ]);
    }

    function SearchBar({ value, onChange, onSearch, loading }) {
        return h('div', {
            style: {
                display: 'flex',
                gap: '12px',
                margin: '20px 0',
                flexWrap: 'wrap'
            }
        }, [
            h('input', {
                key: 'search',
                type: 'text',
                value: value,
                onChange: (e) => onChange(e.target.value),
                onKeyPress: (e) => e.key === 'Enter' && onSearch(),
                placeholder: 'Search news in Hebrew or English (e.g., "מעלה אדומים", "maale adumim", "ישראל", "israel")...',
                style: {
                    flex: '1',
                    minWidth: '300px',
                    padding: '16px',
                    fontSize: '16px',
                    border: 'none',
                    borderRadius: '12px',
                    outline: 'none',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }
            }),
            h('button', {
                key: 'search-btn',
                onClick: onSearch,
                disabled: loading,
                style: {
                    padding: '16px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#fff',
                    background: loading ? '#9ca3af' : '#10b981',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'background 0.2s'
                }
            }, loading ? 'Searching...' : 'Search'),
            h('button', {
                key: 'clear-btn',
                onClick: () => onChange(''),
                style: {
                    padding: '16px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#6b7280',
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s'
                }
            }, 'Clear')
        ]);
    }

    function App() {
        const [searchTerm, setSearchTerm] = useState(() => 
            localStorage.getItem('news-search-term') || ''
        );
        const [articles, setArticles] = useState([]);
        const [filteredArticles, setFilteredArticles] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
        const [stats, setStats] = useState({ attempted: 0, succeeded: 0, total: 0 });

        // Save search term to localStorage
        useEffect(() => {
            localStorage.setItem('news-search-term', searchTerm);
        }, [searchTerm]);

        // Filter articles when search term or articles change
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
                    attempted: RSS_SOURCES.length,
                    succeeded: allArticles.length > 0 ? RSS_SOURCES.length : 0,
                    total: allArticles.length
                });
                
                if (allArticles.length === 0) {
                    setError('No articles found. Please try again later.');
                }
            } catch (err) {
                console.error('Search error:', err);
                setError('Failed to fetch news. Please check your connection and try again.');
            } finally {
                setLoading(false);
            }
        }

        // Initial load
        useEffect(() => {
            if (!articles.length) {
                handleSearch();
            }
        }, []);

        return h('div', {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff'
            }
        }, [
            h('div', {
                key: 'container',
                style: {
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '24px'
                }
            }, [
                // Header
                h('div', {
                    key: 'header',
                    style: { textAlign: 'center', marginBottom: '32px' }
                }, [
                    h('h1', {
                        key: 'title',
                        style: {
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            margin: '0 0 8px 0',
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }
                    }, '📰 News Aggregator'),
                    h('p', {
                        key: 'subtitle',
                        style: {
                            fontSize: '1.1rem',
                            opacity: 0.9,
                            margin: 0
                        }
                    }, 'Search and discover relevant news from trusted sources')
                ]),

                // Search bar
                h(SearchBar, {
                    key: 'search',
                    value: searchTerm,
                    onChange: setSearchTerm,
                    onSearch: handleSearch,
                    loading: loading
                }),

                // Status bar
                stats.attempted > 0 && h(StatusBar, {
                    key: 'status',
                    attempted: stats.attempted,
                    succeeded: stats.succeeded,
                    totalArticles: stats.total
                }),

                // Error message
                error && h(ErrorMessage, {
                    key: 'error',
                    message: error
                }),

                // Loading spinner
                loading && h(LoadingSpinner, { key: 'loading' }),

                // Results summary
                !loading && filteredArticles.length > 0 && h('div', {
                    key: 'summary',
                    style: {
                        textAlign: 'center',
                        margin: '20px 0',
                        fontSize: '1.1rem',
                        opacity: 0.9
                    }
                }, searchTerm.trim() ? 
                    `Found ${filteredArticles.length} articles about "${searchTerm}"` :
                    `Showing ${filteredArticles.length} recent articles`
                ),

                // No results message
                !loading && !error && filteredArticles.length === 0 && searchTerm.trim() && h('div', {
                    key: 'no-results',
                    style: {
                        textAlign: 'center',
                        padding: '40px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        margin: '20px 0'
                    }
                }, [
                    h('div', { key: 'icon', style: { fontSize: '3rem', marginBottom: '16px' } }, '🔍'),
                    h('h3', { key: 'title', style: { margin: '0 0 8px 0' } }, 'No results found'),
                    h('p', { key: 'text', style: { margin: 0, opacity: 0.8 } }, 
                        `No articles found for "${searchTerm}". Try a different search term.`)
                ]),

                // Articles grid
                !loading && filteredArticles.length > 0 && h('div', {
                    key: 'grid',
                    style: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px',
                        marginTop: '24px'
                    }
                }, filteredArticles.map(article => 
                    h(ArticleCard, { 
                        key: article.id, 
                        article: article 
                    })
                ))
            ])
        ]);
    }

    // Render the app
    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(h(App));
})();
