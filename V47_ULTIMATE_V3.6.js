// ═══════════════════════════════════════════════════════════════════════════════
// SBA GENIUS V47 ULTIMATE V3.6 - VEGAS INTEGRATION EDITION
// ═══════════════════════════════════════════════════════════════════════════════
// NEW IN V3.6:
// 🔴 NEW:  Vegas Integration Rules - Trust/Fade signals with auto unit adjustment
// 🔴 NEW:  Steam Move Detection - 2+ point moves trigger special handling
// 🔴 NEW:  Reverse Line Movement - Public vs Sharp divergence detection
// 🔴 NEW:  Public Fade Signals - When to bet against the crowd
// ✅ ALL:  Twitter/X, Reddit, Live Tracking, 11 AI Engines, Defense, Injuries
// ═══════════════════════════════════════════════════════════════════════════════

window.CONFIG = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
window.BDL_API_KEY = window.CONFIG?.keys?.bdl || '1b29d9a4-56ef-40d8-b2f9-4d3eefb13a6b';
window.SGO_API_KEY = 'e5ef93d1b57cf2ea95eb5e2ca0eb8fc5';

// Historical tracking storage
window.SBA_HISTORY = window.SBA_HISTORY || [];

const SBA_V47_ULTIMATE = (function() {
    const PROXY = 'https://sba-ai-proxy-production.up.railway.app';
    const BDL_KEY = window.BDL_API_KEY;
    const SGO_KEY = window.SGO_API_KEY;
    
    const weights = {claude:0.18,openai:0.16,perplexity:0.12,grok:0.08,deepseek:0.08,cohere:0.08,gemini:0.06,mistral:0.06,groq:0.06,together:0.06,youcom:0.06};
    const engines = Object.keys(weights);
    
    // Injury keywords to detect
    const INJURY_KEYWORDS = [
        'out', 'ruled out', 'will not play', 'sidelined', 'injured', 
        'injury', 'questionable', 'doubtful', 'day-to-day', 'dnp',
        'rest', 'resting', 'load management', 'personal reasons',
        'illness', 'sick', 'not playing', 'unavailable', 'miss',
        'surgery', 'sprain', 'strain', 'fracture', 'torn', 'concussion'
    ];
    
    // Injury severity levels
    const INJURY_SEVERITY = {
        'out': 'OUT',
        'ruled out': 'OUT',
        'will not play': 'OUT',
        'sidelined': 'OUT',
        'not playing': 'OUT',
        'unavailable': 'OUT',
        'miss': 'OUT',
        'surgery': 'OUT',
        'questionable': 'QUESTIONABLE',
        'doubtful': 'DOUBTFUL',
        'day-to-day': 'QUESTIONABLE',
        'game-time decision': 'QUESTIONABLE',
        'probable': 'PROBABLE'
    };

    const ENGINE_PROMPTS = {
        claude: `As RISK ANALYST: What specific scenarios could make this bet LOSE? Name concrete risks with probabilities. CRITICAL: Check if player is injured/OUT.`,
        openai: `As STATISTICIAN: Calculate exact probability. Compare line to averages, factor variance. Show your math.`,
        perplexity: `As NEWS RESEARCHER: CRITICAL - Is this player INJURED, OUT, QUESTIONABLE, or RESTING? Check official injury reports from last 24-48 hours. Also check lineup status.`,
        grok: `As SENTIMENT ANALYST: Sharp vs public money? Line movement? What's the betting market saying?`,
        deepseek: `As QUANT: Calculate EV. If true prob=X and juice=Y, what's the edge? Show the formula.`,
        cohere: `As SITUATIONAL: Fatigue, motivation, travel, rest days, revenge games? What situational factors matter?`,
        gemini: `As TRENDS: Historical patterns vs this opponent? This month? Home/away splits? Recent form?`,
        mistral: `As LINE ANALYST: Is this number too high/low? Where's the value? Sharp money position?`,
        groq: `As QUICK CHECK: Basic sanity check - does the math obviously support OVER or UNDER?`,
        together: `As CONTRARIAN: Why might everyone be WRONG? What's the blind spot in consensus?`,
        youcom: `As NEWS: CRITICAL - Check for breaking injury news, lineup changes, or rest decisions in last 24 hours.`
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // NEW: Injury Detection System (with context awareness)
    // ═══════════════════════════════════════════════════════════════════════════
    function detectInjury(text, playerName) {
        if (!text) return null;
        const lower = text.toLowerCase();
        const playerLower = playerName.toLowerCase();
        const lastName = playerName.split(' ').pop().toLowerCase();
        
        // Check if text mentions the player AND injury keywords
        const mentionsPlayer = lower.includes(playerLower) || lower.includes(lastName);
        
        if (!mentionsPlayer) return null;
        
        // NEGATIVE PATTERNS - these indicate player is NOT injured
        const negativePatterns = [
            'not injured', 'not out', 'is not out', 'not questionable', 'not doubtful',
            'no injury', 'fully available', 'fully healthy', 'available to play',
            'expected to play', 'will play', 'is playing', 'is active', 'cleared to play',
            'not on injury', 'not listed', 'healthy', 'good to go', 'green light',
            'no concerns', 'full participant', 'not ruled out', 'should play'
        ];
        
        // Check for negative patterns FIRST - if found, player is NOT injured
        for (const pattern of negativePatterns) {
            if (lower.includes(pattern)) {
                return null; // Player is confirmed NOT injured
            }
        }
        
        // POSITIVE INJURY PATTERNS - must be definitive statements
        const positivePatterns = [
            { pattern: 'is out', severity: 'OUT' },
            { pattern: 'ruled out', severity: 'OUT' },
            { pattern: 'will not play', severity: 'OUT' },
            { pattern: 'has been ruled out', severity: 'OUT' },
            { pattern: 'officially out', severity: 'OUT' },
            { pattern: 'will miss', severity: 'OUT' },
            { pattern: 'is sidelined', severity: 'OUT' },
            { pattern: 'sidelined with', severity: 'OUT' },
            { pattern: 'out with', severity: 'OUT' },
            { pattern: 'out due to', severity: 'OUT' },
            { pattern: 'out for', severity: 'OUT' },
            { pattern: 'listed as out', severity: 'OUT' },
            { pattern: 'is questionable', severity: 'QUESTIONABLE' },
            { pattern: 'listed as questionable', severity: 'QUESTIONABLE' },
            { pattern: 'is doubtful', severity: 'DOUBTFUL' },
            { pattern: 'listed as doubtful', severity: 'DOUBTFUL' },
            { pattern: 'game-time decision', severity: 'QUESTIONABLE' },
            { pattern: 'day-to-day', severity: 'QUESTIONABLE' }
        ];
        
        // Check for positive injury patterns
        for (const { pattern, severity } of positivePatterns) {
            if (lower.includes(pattern)) {
                return {
                    detected: true,
                    severity,
                    keyword: pattern,
                    source: text.substring(0, 200)
                };
            }
        }
        
        // Don't trigger on standalone keywords - too many false positives
        // Only trigger on the specific patterns above
        
        return null;
    }
    
    function aggregateInjuryStatus(results, playerName) {
        const injuries = [];
        
        for (const [engine, result] of Object.entries(results)) {
            if (result.reasoning) {
                const injury = detectInjury(result.reasoning, playerName);
                if (injury) {
                    injuries.push({ engine, ...injury });
                }
            }
        }
        
        if (injuries.length === 0) return { status: 'ACTIVE', injuries: [] };
        
        // Determine worst severity
        const severityOrder = ['OUT', 'DOUBTFUL', 'QUESTIONABLE', 'PROBABLE', 'POSSIBLE'];
        let worstSeverity = 'POSSIBLE';
        
        for (const injury of injuries) {
            const idx = severityOrder.indexOf(injury.severity);
            const currentIdx = severityOrder.indexOf(worstSeverity);
            if (idx < currentIdx) worstSeverity = injury.severity;
        }
        
        return {
            status: worstSeverity,
            injuries,
            shouldOverride: worstSeverity === 'OUT' || worstSeverity === 'DOUBTFUL',
            sources: injuries.map(i => i.engine)
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NEW: Line Movement Tracking
    // ═══════════════════════════════════════════════════════════════════════════
    async function getLineMovement(player, market, opponent) {
        // Store and compare lines over time
        const key = `${player}_${market}_${opponent}`.toLowerCase().replace(/\s/g, '_');
        const stored = localStorage.getItem(`sba_line_${key}`);
        const now = Date.now();
        
        let history = [];
        if (stored) {
            try { history = JSON.parse(stored); } catch(e) { history = []; }
        }
        
        return {
            history,
            addLine: (line, bookOdds) => {
                history.push({ timestamp: now, line, bookOdds });
                // Keep last 20 entries
                if (history.length > 20) history = history.slice(-20);
                localStorage.setItem(`sba_line_${key}`, JSON.stringify(history));
            },
            getMovement: () => {
                if (history.length < 2) return null;
                const recent = history.slice(-5);
                const oldest = recent[0];
                const newest = recent[recent.length - 1];
                const lineDiff = newest.line - oldest.line;
                const timeDiff = (newest.timestamp - oldest.timestamp) / (1000 * 60 * 60); // hours
                
                return {
                    direction: lineDiff > 0 ? 'UP' : lineDiff < 0 ? 'DOWN' : 'STABLE',
                    change: lineDiff,
                    hours: timeDiff.toFixed(1),
                    sharpIndicator: Math.abs(lineDiff) >= 1 ? 'SHARP MOVE' : 
                                    Math.abs(lineDiff) >= 0.5 ? 'MODERATE' : 'MINIMAL',
                    interpretation: lineDiff > 0.5 ? 'Sharp money likely on OVER' :
                                    lineDiff < -0.5 ? 'Sharp money likely on UNDER' : 
                                    'No significant sharp action detected'
                };
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NEW: Opponent Defense Stats
    // ═══════════════════════════════════════════════════════════════════════════
    async function getOpponentDefense(opponent, market = 'player_points') {
        // Team defensive rankings (simplified - would ideally come from API)
        const DEFENSE_RANKINGS = {
            // Top 10 defenses (harder to score against)
            'CLE': { rank: 1, rating: 105.2, vs_guards: 'ELITE', vs_forwards: 'ELITE', vs_centers: 'GOOD' },
            'OKC': { rank: 2, rating: 106.1, vs_guards: 'ELITE', vs_forwards: 'GOOD', vs_centers: 'ELITE' },
            'BOS': { rank: 3, rating: 107.3, vs_guards: 'GOOD', vs_forwards: 'ELITE', vs_centers: 'GOOD' },
            'HOU': { rank: 4, rating: 107.8, vs_guards: 'GOOD', vs_forwards: 'GOOD', vs_centers: 'ELITE' },
            'MEM': { rank: 5, rating: 108.2, vs_guards: 'GOOD', vs_forwards: 'GOOD', vs_centers: 'GOOD' },
            'LAC': { rank: 6, rating: 108.5, vs_guards: 'GOOD', vs_forwards: 'GOOD', vs_centers: 'AVG' },
            'MIN': { rank: 7, rating: 108.9, vs_guards: 'GOOD', vs_forwards: 'ELITE', vs_centers: 'GOOD' },
            'DEN': { rank: 8, rating: 109.2, vs_guards: 'AVG', vs_forwards: 'GOOD', vs_centers: 'GOOD' },
            'ORL': { rank: 9, rating: 109.5, vs_guards: 'GOOD', vs_forwards: 'GOOD', vs_centers: 'ELITE' },
            'NYK': { rank: 10, rating: 109.8, vs_guards: 'GOOD', vs_forwards: 'GOOD', vs_centers: 'AVG' },
            // Middle tier
            'MIA': { rank: 11, rating: 110.2, vs_guards: 'AVG', vs_forwards: 'GOOD', vs_centers: 'AVG' },
            'PHX': { rank: 12, rating: 110.5, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'IND': { rank: 13, rating: 110.8, vs_guards: 'AVG', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'SAC': { rank: 14, rating: 111.2, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'MIL': { rank: 15, rating: 111.5, vs_guards: 'AVG', vs_forwards: 'AVG', vs_centers: 'GOOD' },
            'DAL': { rank: 16, rating: 111.8, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'PHI': { rank: 17, rating: 112.1, vs_guards: 'AVG', vs_forwards: 'AVG', vs_centers: 'WEAK' },
            'LAL': { rank: 18, rating: 112.5, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'SAS': { rank: 19, rating: 112.8, vs_guards: 'AVG', vs_forwards: 'WEAK', vs_centers: 'AVG' },
            'TOR': { rank: 20, rating: 113.2, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'WEAK' },
            // Bottom tier (easier to score against)
            'ATL': { rank: 21, rating: 113.5, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'AVG' },
            'CHI': { rank: 22, rating: 113.9, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'BKN': { rank: 23, rating: 114.2, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'AVG' },
            'NOP': { rank: 24, rating: 114.6, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'POR': { rank: 25, rating: 115.0, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'CHA': { rank: 26, rating: 115.3, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'DET': { rank: 27, rating: 115.7, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'UTA': { rank: 28, rating: 116.1, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'WAS': { rank: 29, rating: 116.5, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'GSW': { rank: 20, rating: 113.0, vs_guards: 'AVG', vs_forwards: 'WEAK', vs_centers: 'AVG' }
        };
        
        const oppUpper = (opponent || '').toUpperCase();
        const defense = DEFENSE_RANKINGS[oppUpper];
        
        if (!defense) {
            return { found: false, opponent: oppUpper };
        }
        
        // Determine impact on bet
        const isTopDefense = defense.rank <= 10;
        const isWeakDefense = defense.rank >= 21;
        
        return {
            found: true,
            opponent: oppUpper,
            rank: defense.rank,
            rating: defense.rating,
            tier: isTopDefense ? 'ELITE' : isWeakDefense ? 'WEAK' : 'AVERAGE',
            vs_guards: defense.vs_guards,
            vs_forwards: defense.vs_forwards,
            vs_centers: defense.vs_centers,
            impact: isTopDefense ? 'NEGATIVE (tough matchup, lean UNDER)' :
                    isWeakDefense ? 'POSITIVE (easy matchup, lean OVER)' :
                    'NEUTRAL',
            adjustment: isTopDefense ? -0.03 : isWeakDefense ? 0.03 : 0
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NEW: Betburger/Arbitrage Detection
    // ═══════════════════════════════════════════════════════════════════════════
    async function checkArbitrage(sgoData, line, direction) {
        if (!sgoData?.found || !sgoData.playerProps?.points) return null;
        
        const pp = sgoData.playerProps.points;
        const bookOdds = pp.bookOdds;
        const fairOdds = pp.fairOdds;
        
        // Calculate implied probabilities
        const bookProb = oddsToProb(bookOdds);
        const fairProb = oddsToProb(fairOdds);
        
        // Check for arbitrage opportunity (book mispricing)
        const edge = (fairProb - bookProb) * 100;
        const isArbitrage = edge > 5; // 5%+ edge is significant
        
        // Simulate checking multiple books for best odds
        const books = pp.books || 21;
        const estimatedBestOdds = Math.round(parseInt(bookOdds) * 0.95); // Assume 5% better available
        
        return {
            hasArbitrage: isArbitrage,
            edge: edge.toFixed(1),
            bookOdds,
            fairOdds,
            estimatedBestOdds,
            booksChecked: books,
            recommendation: isArbitrage 
                ? `ARBITRAGE DETECTED: ${edge.toFixed(1)}% edge. Shop for best odds across ${books} books.`
                : edge > 2 
                    ? `SOFT EDGE: ${edge.toFixed(1)}% edge. Slight value available.`
                    : `NO ARBITRAGE: Standard market pricing.`,
            confidence: isArbitrage ? 'HIGH' : edge > 2 ? 'MEDIUM' : 'LOW'
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NEW: Historical Tracking System
    // ═══════════════════════════════════════════════════════════════════════════
    function recordPick(params, analysis) {
        const record = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            player: params.player,
            market: params.market,
            line: params.line,
            opponent: params.opponent,
            pick: analysis.pick,
            feelOdds: analysis.feelOdds,
            trueProb: analysis.trueProb,
            confidence: analysis.confidence,
            coachVerdict: analysis.coach?.verdict,
            coachUnits: analysis.coach?.unitSizing,
            sgoEdge: analysis.sgoData?.edge,
            aiConsensus: `${analysis.aiCollective?.overEngines?.length || 0}-${analysis.aiCollective?.underEngines?.length || 0}`,
            result: null, // To be filled in later
            profit: null  // To be filled in later
        };
        
        window.SBA_HISTORY.push(record);
        
        // Save to localStorage
        try {
            const existing = JSON.parse(localStorage.getItem('sba_history') || '[]');
            existing.push(record);
            // Keep last 500 picks
            if (existing.length > 500) existing.splice(0, existing.length - 500);
            localStorage.setItem('sba_history', JSON.stringify(existing));
        } catch(e) { console.log('[V47U] History save error:', e); }
        
        return record.id;
    }
    
    function getHistoryStats() {
        try {
            const history = JSON.parse(localStorage.getItem('sba_history') || '[]');
            const graded = history.filter(h => h.result !== null);
            
            if (graded.length === 0) {
                return { totalPicks: history.length, gradedPicks: 0, winRate: null, roi: null };
            }
            
            const wins = graded.filter(h => h.result === 'WIN').length;
            const totalProfit = graded.reduce((sum, h) => sum + (h.profit || 0), 0);
            
            return {
                totalPicks: history.length,
                gradedPicks: graded.length,
                wins,
                losses: graded.length - wins,
                winRate: ((wins / graded.length) * 100).toFixed(1),
                roi: ((totalProfit / graded.length) * 100).toFixed(1),
                recentForm: graded.slice(-10).map(h => h.result === 'WIN' ? 'W' : 'L').join('')
            };
        } catch(e) {
            return { error: true };
        }
    }
    
    function gradePick(pickId, result, actualValue) {
        try {
            const history = JSON.parse(localStorage.getItem('sba_history') || '[]');
            const pick = history.find(h => h.id === pickId);
            
            if (!pick) return { success: false, error: 'Pick not found' };
            
            pick.result = result; // 'WIN' or 'LOSS'
            pick.actualValue = actualValue;
            pick.profit = result === 'WIN' ? 0.91 : -1; // Standard -110 odds
            
            // Adjust profit based on units bet
            const units = parseFloat(pick.coachUnits) || 1;
            pick.profit *= units;
            
            localStorage.setItem('sba_history', JSON.stringify(history));
            
            return { success: true, pick };
        } catch(e) {
            return { success: false, error: e.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA: BDL Stats (unchanged from V3.2)
    // ═══════════════════════════════════════════════════════════════════════════
    async function getPlayerStats(player, sport = 'nba') {
        if (!BDL_KEY) return null;
        try {
            const firstName = player.split(' ')[0];
            const searchRes = await fetch(`https://api.balldontlie.io/${sport}/v1/players?search=${encodeURIComponent(firstName)}&per_page=10`, { headers: { 'Authorization': BDL_KEY } });
            if (!searchRes.ok) return null;
            const searchData = await searchRes.json();
            const playerLower = player.toLowerCase();
            let p = searchData.data?.find(x => `${x.first_name} ${x.last_name}`.toLowerCase() === playerLower) || searchData.data?.[0];
            if (!p) return null;
            
            const statsRes = await fetch(`https://api.balldontlie.io/${sport}/v1/stats?player_ids[]=${p.id}&per_page=15&sort=-game.date`, { headers: { 'Authorization': BDL_KEY } });
            if (!statsRes.ok) return null;
            const statsData = await statsRes.json();
            const games = statsData.data || [];
            if (!games.length) return null;
            
            const avg = (arr, k) => arr.length ? (arr.reduce((s,g) => s + (g[k]||0), 0) / arr.length).toFixed(1) : '0';
            const l5 = games.slice(0,5), l10 = games.slice(0,10);
            
            // Determine player position for defense matchup
            const position = p.position || 'G';
            const positionType = position.includes('G') ? 'guard' : position.includes('F') ? 'forward' : 'center';
            
            return {
                name: `${p.first_name} ${p.last_name}`,
                team: p.team?.abbreviation || 'N/A',
                position: position,
                positionType: positionType,
                l5: { pts: avg(l5,'pts'), reb: avg(l5,'reb'), ast: avg(l5,'ast'), min: avg(l5,'min') },
                l10: { pts: avg(l10,'pts'), reb: avg(l10,'reb'), ast: avg(l10,'ast'), min: avg(l10,'min') },
                season: { pts: avg(games,'pts'), reb: avg(games,'reb'), ast: avg(games,'ast'), min: avg(games,'min') },
                recentGames: games.slice(0,5).map(g => ({ pts: g.pts, reb: g.reb, ast: g.ast, min: g.min })),
                gamesPlayed: games.length
            };
        } catch(e) { return null; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA: SportsGameOdds (unchanged from V3.2)
    // ═══════════════════════════════════════════════════════════════════════════
    async function getSGOData(player, opponent, sport = 'NBA') {
        if (!SGO_KEY) return { found: false };
        try {
            const res = await fetch(`https://api.sportsgameodds.com/v2/events?leagueID=${sport}&oddsAvailable=true&limit=50`, {
                headers: { 'x-api-key': SGO_KEY }
            });
            if (!res.ok) return { found: false };
            const data = await res.json();
            
            const oppLower = (opponent || '').toLowerCase();
            const game = data.data?.find(e => {
                const home = (e.teams?.home?.names?.short || '').toLowerCase();
                const away = (e.teams?.away?.names?.short || '').toLowerCase();
                return home === oppLower || away === oppLower || 
                       home.includes(oppLower) || away.includes(oppLower) ||
                       oppLower.includes(home) || oppLower.includes(away);
            });
            
            if (!game) return { found: false };
            
            const lastName = player.split(' ').pop()?.toUpperCase();
            const playerProps = {};
            
            for (const [key, val] of Object.entries(game.odds || {})) {
                if (key.includes(lastName)) {
                    const market = key.includes('points') ? 'points' : 
                                   key.includes('assists') ? 'assists' : 
                                   key.includes('rebounds') ? 'rebounds' : null;
                    if (market && key.includes('over') && !playerProps[market]) {
                        playerProps[market] = {
                            line: parseFloat(val.bookOverUnder) || null,
                            bookOdds: val.bookOdds,
                            fairOdds: val.fairOdds,
                            books: Object.keys(val.byBookmaker || {}).length
                        };
                    }
                }
            }
            
            let edge = null;
            if (playerProps.points?.bookOdds && playerProps.points?.fairOdds) {
                const bookProb = oddsToProb(playerProps.points.bookOdds);
                const fairProb = oddsToProb(playerProps.points.fairOdds);
                edge = ((fairProb - bookProb) * 100).toFixed(1);
            }
            
            return {
                found: true,
                homeTeam: game.teams?.home?.names?.short,
                awayTeam: game.teams?.away?.names?.short,
                totalMarkets: Object.keys(game.odds || {}).length,
                playerProps,
                edge,
                status: game.status?.started ? 'LIVE' : 'UPCOMING'
            };
        } catch(e) { return { found: false }; }
    }
    
    function oddsToProb(odds) {
        if (!odds) return 0.5;
        const num = parseInt(odds.toString().replace('+', ''));
        if (num > 0) return 100 / (num + 100);
        return Math.abs(num) / (Math.abs(num) + 100);
    }
    
    function probToOdds(prob) {
        if (prob >= 0.5) return Math.round(-100 * prob / (1 - prob));
        return Math.round(100 * (1 - prob) / prob);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA: Hit Rate (unchanged from V3.2)
    // ═══════════════════════════════════════════════════════════════════════════
    function calculateHitRate(stats, line, market = 'player_points') {
        if (!stats?.recentGames?.length) return null;
        const key = market.includes('point') ? 'pts' : market.includes('rebound') ? 'reb' : 'ast';
        const games = stats.recentGames;
        const hits = games.filter(g => g[key] > line).length;
        const values = games.map(g => g[key]);
        const avg = values.reduce((a,b) => a+b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
        const margin = avg - line;
        
        let streak = 0;
        const lastResult = values[0] > line ? 'OVER' : 'UNDER';
        for (const val of values) {
            if ((val > line && lastResult === 'OVER') || (val <= line && lastResult === 'UNDER')) streak++;
            else break;
        }
        
        return { 
            hits, total: games.length, 
            rate: Math.round((hits/games.length)*100), 
            detail: `${hits}/${games.length} OVER ${line}`, 
            trend: hits >= 4 ? 'HOT 🔥' : hits <= 1 ? 'COLD ❄️' : 'MIXED',
            values, avg: avg.toFixed(1), stdDev: stdDev.toFixed(1),
            zScore: (stdDev > 0 ? (line - avg) / stdDev : 0).toFixed(2),
            margin: margin.toFixed(1),
            streak: `${streak} ${lastResult}`
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AI: Build Prompt (enhanced with injury check)
    // ═══════════════════════════════════════════════════════════════════════════
    function buildPrompt(params, stats, hitRate, sgoData, defenseData, engineId) {
        const task = ENGINE_PROMPTS[engineId];
        const statsText = stats ? `L5=${stats.l5.pts}pts, L10=${stats.l10.pts}pts, Season=${stats.season.pts}pts. Recent: ${stats.recentGames?.map(g=>g.pts).join(', ')}` : 'Stats unavailable';
        const hitText = hitRate ? `Hit Rate: ${hitRate.rate}% (${hitRate.detail}) ${hitRate.trend}. Margin: ${hitRate.margin > 0 ? '+' : ''}${hitRate.margin}` : '';
        const sgoText = sgoData?.found && sgoData.playerProps?.points ? `Vegas: Line=${sgoData.playerProps.points.line}, Book=${sgoData.playerProps.points.bookOdds}, Fair=${sgoData.playerProps.points.fairOdds}, Edge=${sgoData.edge}%` : '';
        const defenseText = defenseData?.found ? `Opponent Defense: ${defenseData.opponent} ranked #${defenseData.rank} (${defenseData.tier}). vs ${stats?.positionType || 'players'}: ${defenseData[`vs_${stats?.positionType}s`] || 'AVG'}` : '';

        return `PROP: ${params.player} ${params.market} OVER/UNDER ${params.line} vs ${params.opponent}

${statsText}
${hitText}
${sgoText}
${defenseText}

${task}

CRITICAL: 
1. Give SPECIFIC analysis with ACTUAL NUMBERS. Minimum 20 words.
2. If player is INJURED, OUT, or QUESTIONABLE - MENTION THIS CLEARLY and recommend PASS.

Return ONLY JSON:
{"pick":"OVER or UNDER or PASS","confidence":50-95,"trueProb":0.40-0.65,"reasoning":"Your specific analysis with numbers from the data","keyFactor":"single most important factor","risk":"biggest risk to this pick"}`;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AI: Parse Response (unchanged)
    // ═══════════════════════════════════════════════════════════════════════════
    function parseResponse(data, engineId) {
        try {
            let r = data.result?.raw || data.result || data;
            if (typeof r === 'string') {
                r = r.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
                const m = r.match(/\{[\s\S]*\}/);
                if (m) r = JSON.parse(m[0]);
            }
            if ((!r.reasoning || r.reasoning.length < 10) && data.raw) {
                try { r = typeof data.raw === 'string' ? JSON.parse(data.raw) : data.raw; } catch(e) {}
            }
            
            return {
                pick: ['OVER','UNDER','PASS'].includes((r.pick||'').toUpperCase()) ? r.pick.toUpperCase() : 'PASS',
                confidence: Math.min(95, Math.max(50, parseInt(r.confidence) || 55)),
                trueProb: Math.min(0.75, Math.max(0.25, parseFloat(r.trueProb) || 0.5)),
                reasoning: (r.reasoning || '').substring(0, 300),
                keyFactor: (r.keyFactor || '').substring(0, 150),
                risk: (r.risk || '').substring(0, 150)
            };
        } catch(e) {
            return { pick: 'PASS', confidence: 50, trueProb: 0.5, reasoning: 'Parse error', keyFactor: '', risk: '' };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AI: Call Engine (unchanged)
    // ═══════════════════════════════════════════════════════════════════════════
    async function callEngine(engineId, prompt) {
        try {
            const res = await fetch(`${PROXY}/api/ai/${engineId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, maxTokens: 800 })
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (data.error) return null;
            return parseResponse(data, engineId);
        } catch(e) { return null; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SYNTHESIS: Master (enhanced with injury awareness)
    // ═══════════════════════════════════════════════════════════════════════════
    async function masterSynthesis(params, stats, hitRate, sgoData, defenseData, results, aiCollective, injuryStatus) {
        const overE = Object.entries(results).filter(([_,r]) => r.pick === 'OVER');
        const underE = Object.entries(results).filter(([_,r]) => r.pick === 'UNDER');
        
        const overReasons = overE.filter(([_,r]) => r.reasoning?.length > 20).slice(0, 3).map(([e,r]) => `${e}: ${r.reasoning}`);
        const underReasons = underE.filter(([_,r]) => r.reasoning?.length > 20).slice(0, 3).map(([e,r]) => `${e}: ${r.reasoning}`);
        
        let edgeEstimate = 'Unknown';
        let edgeNum = 0;
        if (sgoData?.edge) {
            edgeNum = parseFloat(sgoData.edge);
            edgeEstimate = edgeNum > 3 ? `Strong (+${edgeNum}%)` : edgeNum > 1 ? `Moderate (+${edgeNum}%)` : edgeNum > 0 ? `Small (+${edgeNum}%)` : edgeNum < -3 ? `Negative (${edgeNum}%)` : 'Minimal';
        }
        
        // Defense adjustment
        const defenseAdj = defenseData?.adjustment || 0;

        const prompt = `SYNTHESIZE into FINAL VERDICT:

PROP: ${params.player} ${params.market} @ ${params.line} vs ${params.opponent}
Stats: L5=${stats?.l5?.pts || 'N/A'}pts | Hit Rate: ${hitRate ? `${hitRate.rate}% ${hitRate.trend}` : 'N/A'}
SGO Edge: ${sgoData?.edge || 'N/A'}%
Defense: ${defenseData?.found ? `#${defenseData.rank} ${defenseData.tier}` : 'N/A'}
AI Vote: ${overE.length} OVER / ${underE.length} UNDER (${aiCollective.agreement})
INJURY STATUS: ${injuryStatus.status} ${injuryStatus.shouldOverride ? '⚠️ FORCE PASS' : ''}

OVER: ${overReasons.join(' | ') || 'None'}
UNDER: ${underReasons.join(' | ') || 'None'}

${injuryStatus.shouldOverride ? 'CRITICAL: Player appears to be OUT or DOUBTFUL. Must recommend PASS regardless of other factors.' : ''}

Return JSON:
{"finalPick":"OVER","finalProb":0.55,"confidence":75,"synthesisNarrative":"3-4 sentences with specific numbers","keyEvidence":[{"fact":"evidence","source":"source"}],"riskFactors":["risk1"]}`;

        try {
            const res = await fetch(`${PROXY}/api/ai/claude`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, maxTokens: 800 })
            });
            const data = await res.json();
            let r = data.result?.raw || data.result || data;
            if (typeof r === 'string') {
                const m = r.match(/\{[\s\S]*\}/);
                if (m) r = JSON.parse(m[0]);
            }
            if (data.raw && (!r.synthesisNarrative || r.synthesisNarrative.length < 20)) {
                try { r = JSON.parse(data.raw); } catch(e) {}
            }
            
            // Force PASS if injury detected
            if (injuryStatus.shouldOverride) {
                return {
                    finalPick: 'PASS',
                    finalProb: 0.5,
                    confidence: 0,
                    synthesisNarrative: `⚠️ INJURY OVERRIDE: ${params.player} is reported as ${injuryStatus.status}. Sources: ${injuryStatus.sources?.join(', ') || 'AI engines'}. Cannot recommend betting on potentially inactive player.`,
                    keyEvidence: injuryStatus.injuries.map(i => ({ fact: i.keyword, source: i.engine })),
                    riskFactors: ['Player may not play', 'Injury status uncertain'],
                    edgeEstimate: 'N/A (Injury)',
                    edgeNum: 0,
                    injuryOverride: true
                };
            }
            
            // Apply defense adjustment to probability
            let adjustedProb = parseFloat(r.finalProb) || aiCollective.trueProb;
            adjustedProb = Math.max(0.25, Math.min(0.75, adjustedProb + defenseAdj));
            
            return {
                finalPick: r.finalPick || aiCollective.direction,
                finalProb: adjustedProb,
                confidence: parseInt(r.confidence) || aiCollective.confidence,
                synthesisNarrative: r.synthesisNarrative || `AI Collective: ${aiCollective.direction} with ${aiCollective.agreement} agreement.`,
                keyEvidence: Array.isArray(r.keyEvidence) ? r.keyEvidence : [],
                riskFactors: Array.isArray(r.riskFactors) ? r.riskFactors : ['Standard variance'],
                edgeEstimate,
                edgeNum,
                defenseAdjustment: defenseAdj
            };
        } catch(e) {
            // Force PASS if injury detected
            if (injuryStatus.shouldOverride) {
                return {
                    finalPick: 'PASS',
                    finalProb: 0.5,
                    confidence: 0,
                    synthesisNarrative: `⚠️ INJURY OVERRIDE: ${params.player} status is ${injuryStatus.status}. Do not bet.`,
                    keyEvidence: [],
                    riskFactors: ['Player injury'],
                    edgeEstimate: 'N/A',
                    edgeNum: 0,
                    injuryOverride: true
                };
            }
            
            return {
                finalPick: aiCollective.direction,
                finalProb: aiCollective.trueProb,
                confidence: aiCollective.confidence,
                synthesisNarrative: `AI Collective favors ${aiCollective.direction}. ${stats ? `L5: ${stats.l5.pts}pts.` : ''}`,
                keyEvidence: [],
                riskFactors: ['Standard variance'],
                edgeEstimate,
                edgeNum
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENHANCED COACH K (with all new features)
    // ═══════════════════════════════════════════════════════════════════════════
    async function coachK(params, master, stats, hitRate, aiCollective, sgoData, defenseData, lineMovement, arbitrage, injuryStatus, redditData) {
        // Force PASS if injury override
        if (master.injuryOverride || injuryStatus.shouldOverride) {
            return {
                verdict: 'NO BET - INJURY',
                unitSizing: '0',
                plainLanguage: `🚫 DO NOT BET. ${params.player} is reported as ${injuryStatus.status}. Even if they play, minutes could be limited or performance affected. Never bet on questionable injury situations.`,
                expertLanguage: `Hard pass due to ${injuryStatus.status} status. Risk of DNP or minute restriction creates undefined EV. No Kelly calculation possible with uncertain participation. Wait for clear lineup confirmation.`,
                keyInsight: `Player status: ${injuryStatus.status} - betting is not recommended`,
                warnings: ['Player may not play', 'Minutes could be limited', 'Performance likely affected'],
                correlationTip: 'N/A - Do not bet',
                hedgeStrategy: 'N/A - Do not bet',
                kellyFraction: 0,
                kellyUnits: 0,
                edge: 0,
                impliedProb: 0.5,
                hasValue: false,
                vegasDisagrees: false,
                injuryOverride: true,
                vegasVerdict: { action: 'NO_BET', reason: 'Injury' }
            };
        }
        
        // Calculate Kelly Criterion
        const trueProb = master.finalProb;
        const impliedProb = sgoData?.playerProps?.points?.bookOdds ? oddsToProb(sgoData.playerProps.points.bookOdds) : 0.52;
        const edge = trueProb - impliedProb;
        const kellyFraction = edge > 0 ? (edge / (1 - impliedProb)).toFixed(3) : 0;
        const kellyUnits = Math.min(2, Math.max(0, (kellyFraction * 10))).toFixed(1);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // VEGAS INTEGRATION RULES - When to Trust/Fade Vegas
        // ═══════════════════════════════════════════════════════════════════════════
        const sgoEdge = parseFloat(sgoData?.edge || 0);
        const lineContext = lineMovement?.getMovement();
        const lineMoveDirection = lineContext?.direction || 'STABLE';
        const lineMoveAmount = lineContext?.change || 0;
        
        // Reddit sentiment analysis
        const redditScore = redditData?.sentiment?.score || 0;
        const redditMentions = redditData?.mentions || 0;
        const publicHeavy = redditMentions >= 10 && Math.abs(redditScore) >= 60;
        const publicSide = redditScore > 0 ? 'OVER' : redditScore < 0 ? 'UNDER' : 'NEUTRAL';
        
        // Our AI pick
        const ourPick = master.finalPick;
        const aiStrength = aiCollective.agreement; // STRONG, MODERATE, WEAK
        const aiConfidence = master.confidence;
        
        // Vegas signals
        const vegasSignals = {
            sgoEdge: sgoEdge,
            sgoFavors: sgoEdge > 2 ? ourPick : sgoEdge < -2 ? (ourPick === 'OVER' ? 'UNDER' : 'OVER') : 'NEUTRAL',
            lineMoveFavors: lineMoveDirection === 'UP' ? 'OVER' : lineMoveDirection === 'DOWN' ? 'UNDER' : 'NEUTRAL',
            lineMoveSharp: lineMoveAmount >= 1.5, // 1.5+ point move = sharp money
            bookCount: sgoData?.playerProps?.points?.books || 0
        };
        
        // ═══════════════════════════════════════════════════════════════════════════
        // VEGAS TRUST RULES
        // ═══════════════════════════════════════════════════════════════════════════
        let vegasVerdict = {
            action: 'NEUTRAL',
            confidence: 50,
            reason: '',
            adjustment: 0, // Unit adjustment (-1 to +1)
            trustLevel: 'MEDIUM'
        };
        
        // RULE 1: STRONG TRUST - Vegas AND AI agree with strong signals
        // When: SGO edge positive + Line moving our direction + AI strong consensus
        if (sgoEdge > 3 && vegasSignals.lineMoveFavors === ourPick && aiStrength === 'STRONG') {
            vegasVerdict = {
                action: 'MAX_TRUST',
                confidence: 90,
                reason: 'Vegas alignment: Positive SGO edge + Sharp money agrees + Strong AI consensus',
                adjustment: 0.5, // Increase bet size
                trustLevel: 'VERY_HIGH'
            };
        }
        // RULE 2: TRUST - Vegas agrees (positive SGO edge)
        else if (sgoEdge > 2) {
            vegasVerdict = {
                action: 'TRUST_VEGAS',
                confidence: 75,
                reason: `Vegas agrees: +${sgoEdge.toFixed(1)}% SGO edge favors our ${ourPick} pick`,
                adjustment: 0.25,
                trustLevel: 'HIGH'
            };
        }
        // RULE 3: SLIGHT TRUST - Line moving our direction (sharp money signal)
        else if (vegasSignals.lineMoveSharp && vegasSignals.lineMoveFavors === ourPick) {
            vegasVerdict = {
                action: 'TRUST_SHARPS',
                confidence: 70,
                reason: `Sharp money signal: Line moved ${lineMoveAmount}pts toward ${ourPick}`,
                adjustment: 0.25,
                trustLevel: 'MEDIUM_HIGH'
            };
        }
        // RULE 4: NEUTRAL - Vegas shows no strong opinion
        else if (Math.abs(sgoEdge) <= 2 && lineMoveAmount < 1) {
            vegasVerdict = {
                action: 'NEUTRAL',
                confidence: 50,
                reason: 'Vegas neutral: No strong edge or line movement detected',
                adjustment: 0,
                trustLevel: 'MEDIUM'
            };
        }
        // RULE 5: CAUTION - Vegas slightly disagrees
        else if (sgoEdge < -2 && sgoEdge >= -5) {
            vegasVerdict = {
                action: 'CAUTION',
                confidence: 40,
                reason: `Vegas caution: ${sgoEdge.toFixed(1)}% SGO edge against our ${ourPick} pick`,
                adjustment: -0.25,
                trustLevel: 'MEDIUM_LOW'
            };
        }
        // RULE 6: FADE CONSIDERATION - Vegas strongly disagrees
        else if (sgoEdge < -5 && sgoEdge >= -10) {
            vegasVerdict = {
                action: 'REDUCE_SIZE',
                confidence: 30,
                reason: `Vegas warning: ${sgoEdge.toFixed(1)}% SGO edge - Consider reducing position`,
                adjustment: -0.5,
                trustLevel: 'LOW'
            };
        }
        // RULE 7: STRONG FADE SIGNAL - Vegas very strongly disagrees
        else if (sgoEdge < -10) {
            vegasVerdict = {
                action: 'CONSIDER_FADE',
                confidence: 20,
                reason: `Vegas strong disagree: ${sgoEdge.toFixed(1)}% SGO edge - Consider opposite side or pass`,
                adjustment: -1,
                trustLevel: 'VERY_LOW'
            };
        }
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PUBLIC MONEY FADE RULES
        // ═══════════════════════════════════════════════════════════════════════════
        let publicFadeSignal = null;
        
        // RULE: When public is heavy on one side AND line moves opposite = SHARP FADE
        if (publicHeavy && publicSide !== 'NEUTRAL') {
            if (vegasSignals.lineMoveFavors !== publicSide && vegasSignals.lineMoveSharp) {
                publicFadeSignal = {
                    action: 'FADE_PUBLIC',
                    reason: `Public heavy on ${publicSide} (${redditMentions} mentions, ${redditScore > 0 ? '+' : ''}${redditScore} sentiment) but line moving opposite - Classic sharp vs square divergence`,
                    confidence: 75
                };
                // Boost confidence if we're on the sharp side
                if (ourPick !== publicSide) {
                    vegasVerdict.confidence += 10;
                    vegasVerdict.reason += ' | Fading heavy public money';
                }
            }
            // Public heavy AND line moving WITH public = TRAP WARNING
            else if (vegasSignals.lineMoveFavors === publicSide) {
                publicFadeSignal = {
                    action: 'TRAP_WARNING',
                    reason: `Public heavy on ${publicSide} AND line moving same direction - Potential trap game`,
                    confidence: 40
                };
                if (ourPick === publicSide) {
                    vegasVerdict.adjustment -= 0.25;
                    vegasVerdict.reason += ' | ⚠️ Trap game warning';
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════
        // SPECIAL SITUATIONS
        // ═══════════════════════════════════════════════════════════════════════════
        
        // STEAM MOVE: Rapid line movement (2+ points) = Follow immediately
        if (lineMoveAmount >= 2) {
            if (vegasSignals.lineMoveFavors === ourPick) {
                vegasVerdict.action = 'STEAM_AGREE';
                vegasVerdict.reason = `🔥 STEAM MOVE: Line moved ${lineMoveAmount}pts in our direction - Sharp money flooding in`;
                vegasVerdict.adjustment = Math.min(1, vegasVerdict.adjustment + 0.5);
                vegasVerdict.trustLevel = 'VERY_HIGH';
            } else {
                vegasVerdict.action = 'STEAM_AGAINST';
                vegasVerdict.reason = `⚠️ STEAM MOVE AGAINST: Line moved ${lineMoveAmount}pts opposite our pick - Major red flag`;
                vegasVerdict.adjustment = -1;
                vegasVerdict.trustLevel = 'VERY_LOW';
            }
        }
        
        // REVERSE LINE MOVEMENT: Public on one side but line moves opposite
        if (publicHeavy && vegasSignals.lineMoveFavors !== publicSide && lineMoveAmount >= 0.5) {
            vegasVerdict.reverseLineMove = {
                detected: true,
                publicSide: publicSide,
                lineMovedTo: vegasSignals.lineMoveFavors,
                interpretation: `Sharps betting opposite of ${redditMentions}+ Reddit mentions on ${publicSide}`
            };
        }
        
        // ═══════════════════════════════════════════════════════════════════════════
        // FINAL VEGAS-ADJUSTED RECOMMENDATION
        // ═══════════════════════════════════════════════════════════════════════════
        
        // Calculate final units with Vegas adjustment
        let baseUnits = parseFloat(kellyUnits) || 1;
        let vegasAdjustedUnits = Math.max(0, Math.min(2, baseUnits + vegasVerdict.adjustment));
        
        // Override to 0 if Vegas strongly against AND AI not unanimous
        if (vegasVerdict.action === 'CONSIDER_FADE' && aiStrength !== 'STRONG') {
            vegasAdjustedUnits = 0;
            vegasVerdict.finalAction = 'PASS';
            vegasVerdict.reason += ' | Downgraded to PASS due to strong Vegas disagreement';
        }
        
        // Create Vegas summary for display
        const vegasSummary = {
            trustLevel: vegasVerdict.trustLevel,
            action: vegasVerdict.action,
            sgoEdge: `${sgoEdge > 0 ? '+' : ''}${sgoEdge.toFixed(1)}%`,
            lineMove: lineContext ? `${lineMoveDirection} ${lineMoveAmount}pts` : 'N/A',
            recommendation: vegasVerdict.reason,
            unitAdjustment: vegasVerdict.adjustment > 0 ? `+${vegasVerdict.adjustment}` : vegasVerdict.adjustment.toString(),
            finalUnits: vegasAdjustedUnits.toFixed(1),
            publicFade: publicFadeSignal
        };
        
        // Determine if bet has value
        const hasValue = edge > 0.02;
        const vegasDisagrees = sgoEdge < -2;
        
        // Line movement context
        const lineContext = lineMovement?.getMovement();
        const lineText = lineContext ? `Line moved ${lineContext.direction} ${lineContext.change} pts over ${lineContext.hours}hrs. ${lineContext.interpretation}` : 'No line movement data';
        
        // Defense context
        const defenseText = defenseData?.found ? `vs ${defenseData.opponent} (#${defenseData.rank} defense, ${defenseData.tier})` : '';
        
        // Arbitrage context
        const arbText = arbitrage?.hasArbitrage ? `⚡ ARBITRAGE: ${arbitrage.edge}% edge detected!` : '';
        
        // Reddit context (NEW!)
        let redditText = 'No Reddit data available';
        if (redditData?.available) {
            const s = redditData.sentiment;
            redditText = `Reddit: ${redditData.mentions} mentions, ${s.label} (score: ${s.score > 0 ? '+' : ''}${s.score}). Keywords: ${redditData.keywords?.bullish?.slice(0, 3).join(', ') || 'none'}.`;
            if (redditData.samples?.[0]) {
                redditText += ` Top comment: "${redditData.samples[0].body.substring(0, 80)}..."`;
            }
        }

        const prompt = `You are COACH K, legendary betting strategist. Provide analysis in TWO VOICES.

═══════════════════════════════════════════════════════════════════════════════
BET DETAILS:
• Player: ${params.player}
• Market: ${params.market} ${master.finalPick} ${params.line}
• Opponent: ${params.opponent}

DATA:
• AI Consensus: ${aiCollective.agreement} (${aiCollective.overEngines?.length} OVER / ${aiCollective.underEngines?.length} UNDER)
• AI Confidence: ${master.confidence}%
• True Probability: ${(master.finalProb * 100).toFixed(1)}%
• Implied Odds Probability: ${(impliedProb * 100).toFixed(1)}%
• Edge: ${(edge * 100).toFixed(1)}%
• Kelly Fraction: ${kellyFraction} (suggests ${kellyUnits} units)
${stats ? `• Stats: L5=${stats.l5.pts}pts, Season=${stats.season.pts}pts` : ''}
${hitRate ? `• Hit Rate: ${hitRate.rate}% (${hitRate.detail}) ${hitRate.trend}` : ''}
${hitRate ? `• Margin over line: ${hitRate.margin > 0 ? '+' : ''}${hitRate.margin} pts` : ''}
${sgoData?.found ? `• Vegas Line: ${sgoData.playerProps?.points?.line}` : ''}
${sgoData?.found ? `• Book Odds: ${sgoData.playerProps?.points?.bookOdds} | Fair Odds: ${sgoData.playerProps?.points?.fairOdds}` : ''}
${sgoData?.edge ? `• SGO Edge: ${sgoData.edge}% (${sgoEdge > 0 ? 'FAVORABLE' : 'UNFAVORABLE'})` : ''}
• VEGAS VERDICT: ${vegasVerdict.action} (Trust Level: ${vegasVerdict.trustLevel})
• Vegas Reasoning: ${vegasVerdict.reason}
• Vegas Unit Adjustment: ${vegasVerdict.adjustment > 0 ? '+' : ''}${vegasVerdict.adjustment} units
• Vegas-Adjusted Units: ${vegasAdjustedUnits.toFixed(1)}
• Line Movement: ${lineText}
• Defense Matchup: ${defenseText}
• Reddit Sentiment: ${redditText}
${publicFadeSignal ? `• PUBLIC FADE SIGNAL: ${publicFadeSignal.action} - ${publicFadeSignal.reason}` : ''}
${arbText ? `• ${arbText}` : ''}
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Use the Vegas-Adjusted Units (${vegasAdjustedUnits.toFixed(1)}) as your final unit recommendation, NOT the raw Kelly.
If Vegas verdict is CONSIDER_FADE or STEAM_AGAINST, strongly consider recommending PASS.

Provide your verdict and analysis.

Return ONLY JSON:
{
  "verdict": "STRONG BET or GOOD BET or LEAN or PASS",
  "unitSizing": "0 to 2",
  "plainLanguage": "2-3 sentences a casual bettor would understand. Use simple terms. Include a relatable analogy if helpful.",
  "expertLanguage": "2-3 sentences for sharp bettors. Include: EV assessment, Kelly recommendation, line value analysis, CLV potential.",
  "keyInsight": "Single most important thing to know about this bet",
  "warnings": ["any warnings or cautions"],
  "correlationTip": "If parlaying, what to avoid or combine with",
  "hedgeStrategy": "If applicable, how to hedge this position"
}`;

        try {
            const res = await fetch(`${PROXY}/api/ai/claude`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, maxTokens: 1000 })
            });
            const data = await res.json();
            let r = data.result?.raw || data.result || data;
            if (typeof r === 'string') {
                const m = r.match(/\{[\s\S]*\}/);
                if (m) r = JSON.parse(m[0]);
            }
            if (data.raw) try { r = JSON.parse(data.raw); } catch(e) {}
            
            let verdict = r.verdict || 'LEAN';
            let units = r.unitSizing || '1';
            
            // Override if negative EV
            if (sgoEdge < -5 && !r.verdict) {
                verdict = 'PASS';
                units = '0';
            } else if (edge > 0.05 && master.confidence >= 75 && !r.verdict) {
                verdict = 'STRONG BET';
                units = kellyUnits;
            }
            
            return {
                verdict,
                unitSizing: vegasAdjustedUnits.toFixed(1), // Use Vegas-adjusted units
                plainLanguage: r.plainLanguage || `This bet ${hasValue ? 'looks solid' : 'is risky'}.`,
                expertLanguage: r.expertLanguage || `EV: ${(edge * 100).toFixed(1)}%. Kelly suggests ${kellyUnits}u.`,
                keyInsight: r.keyInsight || (hasValue ? 'Positive expected value play' : 'Negative or marginal EV'),
                warnings: Array.isArray(r.warnings) ? r.warnings : (vegasDisagrees ? ['Vegas odds suggest opposite side has value'] : []),
                correlationTip: r.correlationTip || `Avoid parlaying with other ${params.player} props`,
                hedgeStrategy: r.hedgeStrategy || null,
                kellyFraction: parseFloat(kellyFraction),
                kellyUnits: parseFloat(kellyUnits),
                vegasAdjustedUnits,
                edge,
                impliedProb,
                hasValue,
                vegasDisagrees,
                vegasVerdict: vegasSummary,
                lineMovement: lineContext,
                arbitrage,
                defenseMatchup: defenseData
            };
        } catch(e) {
            return {
                verdict: hasValue && master.confidence >= 70 ? 'GOOD BET' : 'LEAN',
                unitSizing: vegasAdjustedUnits.toFixed(1),
                plainLanguage: `${params.player} ${hasValue ? 'looks like a good bet' : 'is borderline'}.`,
                expertLanguage: `EV: ${(edge * 100).toFixed(1)}%. Kelly: ${kellyUnits}u.`,
                keyInsight: hasValue ? 'Math supports the bet' : 'Marginal value at best',
                warnings: vegasDisagrees ? ['Vegas line suggests opposite side'] : [],
                correlationTip: 'Standard correlation rules apply',
                hedgeStrategy: null,
                kellyFraction: parseFloat(kellyFraction),
                kellyUnits: parseFloat(kellyUnits),
                vegasAdjustedUnits,
                edge,
                impliedProb,
                hasValue,
                vegasDisagrees,
                vegasVerdict: vegasSummary,
                lineMovement: lineContext,
                arbitrage,
                defenseMatchup: defenseData
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN ANALYZE (V3.3 - Enhanced)
    // ═══════════════════════════════════════════════════════════════════════════
    async function analyze(params) {
        const start = Date.now();
        
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║       🏆 SBA GENIUS V47 ULTIMATE V3.6 - VEGAS INTEGRATION 🏆                   ║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  ${params.player} | ${params.market} @ ${params.line} vs ${params.opponent || 'Unknown'}`.padEnd(78) + '║');
        console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

        // LAYER 0: Data Collection (Enhanced)
        console.log('══════════════════════════════════════════════════════════════════════');
        console.log('  📊 LAYER 0: Data Collection (Enhanced)');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const [stats, sgoData, defenseData] = await Promise.all([
            getPlayerStats(params.player, params.sport || 'nba'),
            getSGOData(params.player, params.opponent, params.sport || 'NBA'),
            getOpponentDefense(params.opponent, params.market)
        ]);
        
        if (stats) console.log(`[V47U] ✅ BDL: ${stats.name} | L5=${stats.l5.pts}pts L10=${stats.l10.pts}pts | Position: ${stats.position}`);
        else console.log('[V47U] ⚠️ BDL: Not available');
        
        const hitRate = stats ? calculateHitRate(stats, parseFloat(params.line), params.market) : null;
        if (hitRate) console.log(`[V47U] ✅ Hit Rate: ${hitRate.rate}% (${hitRate.detail}) ${hitRate.trend} | Margin: ${hitRate.margin > 0 ? '+' : ''}${hitRate.margin}`);
        
        if (sgoData?.found) {
            console.log(`[V47U] ✅ SGO: ${sgoData.awayTeam} @ ${sgoData.homeTeam} | ${sgoData.totalMarkets} markets`);
            if (sgoData.playerProps?.points) {
                const pp = sgoData.playerProps.points;
                console.log(`[V47U] ✅ SGO Line: ${pp.line} | Book: ${pp.bookOdds} | Fair: ${pp.fairOdds} | Edge: ${sgoData.edge}%`);
            }
        } else {
            console.log('[V47U] ⚠️ SGO: Not found');
        }
        
        // NEW: Defense Stats
        if (defenseData?.found) {
            console.log(`[V47U] ✅ Defense: ${defenseData.opponent} #${defenseData.rank} (${defenseData.tier}) | vs ${stats?.positionType || 'players'}: ${defenseData[`vs_${stats?.positionType}s`] || 'AVG'}`);
        } else {
            console.log('[V47U] ⚠️ Defense: Not found');
        }
        
        // NEW: Line Movement
        const lineMovement = await getLineMovement(params.player, params.market, params.opponent);
        if (sgoData?.playerProps?.points) {
            lineMovement.addLine(sgoData.playerProps.points.line, sgoData.playerProps.points.bookOdds);
        }
        const movement = lineMovement.getMovement();
        if (movement) {
            console.log(`[V47U] ✅ Line Move: ${movement.direction} ${movement.change}pts (${movement.sharpIndicator})`);
        } else {
            console.log('[V47U] ⚠️ Line Move: First observation recorded');
        }
        
        // Reddit Sentiment (V3.4 - via proxy!)
        let redditData = { available: false };
        try {
            const redditRes = await fetch(`https://sba-ai-proxy-production.up.railway.app/api/reddit/sentiment?player=${encodeURIComponent(params.player)}`);
            if (redditRes.ok) {
                const reddit = await redditRes.json();
                if (reddit.success && reddit.relevantMentions > 0) {
                    redditData = {
                        available: true,
                        mentions: reddit.relevantMentions,
                        sentiment: reddit.sentiment,
                        keywords: reddit.keywords,
                        samples: reddit.samples?.slice(0, 3) || [],
                        sources: reddit.sources
                    };
                    console.log(`[V47U] ✅ Reddit: ${reddit.relevantMentions} mentions | ${reddit.sentiment.label} (${reddit.sentiment.score > 0 ? '+' : ''}${reddit.sentiment.score})`);
                } else {
                    console.log('[V47U] ⚠️ Reddit: No mentions found');
                }
            } else {
                console.log('[V47U] ⚠️ Reddit: API returned ' + redditRes.status);
            }
        } catch (e) {
            console.log('[V47U] ⚠️ Reddit: ' + e.message);
        }
        // Store reddit data for later use
        const redditSentiment = redditData;

        // Twitter/X Sentiment (V3.5 - via Perplexity)
        let twitterData = { available: false };
        try {
            const twitterRes = await fetch(`https://sba-ai-proxy-production.up.railway.app/api/twitter/sentiment?player=${encodeURIComponent(params.player)}&sport=${params.sport || 'nba'}`);
            if (twitterRes.ok) {
                const twitter = await twitterRes.json();
                if (twitter.success && twitter.source !== 'unavailable') {
                    twitterData = {
                        available: true,
                        sentiment: twitter.sentiment,
                        source: twitter.source,
                        estimatedTweets: twitter.estimatedTweets
                    };
                    console.log(`[V47U] ✅ Twitter: ${twitter.sentiment.label} (${twitter.sentiment.score > 0 ? '+' : ''}${twitter.sentiment.score})`);
                } else {
                    console.log('[V47U] ⚠️ Twitter: Not available (use Reddit instead)');
                }
            }
        } catch (e) {
            console.log('[V47U] ⚠️ Twitter: ' + e.message);
        }
        const twitterSentiment = twitterData;

        // Live Game Check (V3.5 - ESPN API)
        let liveGameData = { available: false };
        try {
            const scoresRes = await fetch(`https://sba-ai-proxy-production.up.railway.app/api/live/${params.sport || 'nba'}/scores`);
            if (scoresRes.ok) {
                const scores = await scoresRes.json();
                // Find if player's team is currently playing
                const playerTeam = stats?.team || params.opponent;
                const liveGame = scores.games?.find(g => 
                    g.isLive || g.status?.type === 'STATUS_IN_PROGRESS'
                );
                
                if (liveGame) {
                    // Try to get player stats
                    try {
                        const gameRes = await fetch(`https://sba-ai-proxy-production.up.railway.app/api/live/${params.sport || 'nba'}/${liveGame.id}?player=${encodeURIComponent(params.player)}`);
                        if (gameRes.ok) {
                            const gameData = await gameRes.json();
                            if (gameData.playerStats) {
                                liveGameData = {
                                    available: true,
                                    gameId: liveGame.id,
                                    gameName: liveGame.shortName,
                                    status: liveGame.status,
                                    homeScore: liveGame.home?.score,
                                    awayScore: liveGame.away?.score,
                                    playerStats: gameData.playerStats,
                                    isLive: true
                                };
                                console.log(`[V47U] 🔴 LIVE: ${liveGame.shortName} | ${liveGame.away?.score}-${liveGame.home?.score}`);
                                if (gameData.playerStats?.stats) {
                                    const s = gameData.playerStats.stats;
                                    console.log(`[V47U] 🔴 LIVE ${params.player}: ${s.pts || s.points || '?'} pts, ${s.reb || s.rebounds || '?'} reb, ${s.ast || s.assists || '?'} ast`);
                                }
                            }
                        }
                    } catch (e) { /* ignore live player stats error */ }
                } else {
                    console.log('[V47U] ⚪ Live: No games in progress');
                }
            }
        } catch (e) {
            console.log('[V47U] ⚠️ Live: ' + e.message);
        }
        const liveGame = liveGameData;

        // LAYER 1: 11 AI Engines
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('  🤖 LAYER 1: 11 AI Engines (Injury-Aware)');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const results = {};
        await Promise.all(engines.map(async (id) => {
            const prompt = buildPrompt(params, stats, hitRate, sgoData, defenseData, id);
            const r = await callEngine(id, prompt);
            if (r) {
                results[id] = r;
                const icon = r.pick === 'OVER' ? '🟢' : r.pick === 'UNDER' ? '🔴' : '⚪';
                const reason = r.reasoning?.length > 75 ? r.reasoning.substring(0, 75) + '...' : r.reasoning;
                console.log(`[V47U] ${icon} ${id.padEnd(10)}: ${r.pick.padEnd(5)} @ ${r.confidence}%`);
                if (reason && reason.length > 10) console.log(`       └─ "${reason}"`);
            } else {
                console.log(`[V47U] ❌ ${id}: failed`);
            }
        }));

        // NEW: Injury Detection
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('  🏥 INJURY CHECK');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const injuryStatus = aggregateInjuryStatus(results, params.player);
        if (injuryStatus.shouldOverride) {
            console.log(`[V47U] 🚨 INJURY DETECTED: ${injuryStatus.status}`);
            console.log(`[V47U] 🚨 Sources: ${injuryStatus.sources.join(', ')}`);
            injuryStatus.injuries.forEach(i => {
                console.log(`       └─ ${i.engine}: "${i.keyword}" - "${i.source.substring(0, 60)}..."`);
            });
        } else if (injuryStatus.injuries.length > 0) {
            console.log(`[V47U] ⚠️ Possible concern: ${injuryStatus.status}`);
        } else {
            console.log(`[V47U] ✅ Player Status: ACTIVE (no injury reports detected)`);
        }

        // LAYER 2: AI Collective
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('  🔄 LAYER 2: AI Collective');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        let overW = 0, underW = 0, probSum = 0, probW = 0;
        const overEngines = [], underEngines = [], passEngines = [];
        
        for (const [e, r] of Object.entries(results)) {
            const w = weights[e];
            if (r.pick === 'OVER') {
                overW += w * (r.confidence / 100);
                overEngines.push({ id: e, confidence: r.confidence, reasoning: r.reasoning });
            } else if (r.pick === 'UNDER') {
                underW += w * (r.confidence / 100);
                underEngines.push({ id: e, confidence: r.confidence, reasoning: r.reasoning });
            } else {
                passEngines.push({ id: e });
            }
            if (r.trueProb > 0.25 && r.trueProb < 0.75) {
                probSum += r.trueProb * w;
                probW += w;
            }
        }
        
        const aiCollective = {
            direction: overW > underW ? 'OVER' : underW > overW ? 'UNDER' : 'NEUTRAL',
            confidence: Math.min(100, Math.round(50 + Math.abs(overW - underW) * 100)),
            trueProb: probW > 0 ? probSum / probW : 0.5,
            agreement: Math.max(overEngines.length, underEngines.length) >= 7 ? 'STRONG' 
                     : Math.max(overEngines.length, underEngines.length) >= 5 ? 'MODERATE' : 'WEAK',
            overEngines, underEngines, passEngines
        };
        
        console.log(`[V47U] 🤖 AI Collective: ${aiCollective.direction} @ ${aiCollective.confidence}% (${aiCollective.agreement})`);
        console.log(`[V47U] 📊 ${overEngines.length} OVER / ${underEngines.length} UNDER / ${passEngines.length} PASS`);

        // LAYER 3: Master Synthesis (Injury-Aware)
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('  👑 LAYER 3: Master Synthesis');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const master = await masterSynthesis(params, stats, hitRate, sgoData, defenseData, results, aiCollective, injuryStatus);
        
        if (master.injuryOverride) {
            console.log(`[V47U] 🚨 INJURY OVERRIDE: Forcing PASS`);
        } else {
            console.log(`[V47U] ✅ Master: ${master.finalPick} @ ${(master.finalProb * 100).toFixed(1)}%`);
            console.log(`[V47U] 📈 Edge: ${master.edgeEstimate}`);
            if (master.defenseAdjustment) {
                console.log(`[V47U] 🛡️ Defense Adj: ${master.defenseAdjustment > 0 ? '+' : ''}${(master.defenseAdjustment * 100).toFixed(1)}%`);
            }
        }

        // NEW: Arbitrage Check
        const arbitrage = await checkArbitrage(sgoData, params.line, master.finalPick);
        if (arbitrage?.hasArbitrage) {
            console.log(`[V47U] ⚡ ARBITRAGE: ${arbitrage.edge}% edge detected!`);
        }

        // LAYER 4: Enhanced Coach K
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('  🏀 COACH K (World Class)');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const coach = await coachK(params, master, stats, hitRate, aiCollective, sgoData, defenseData, lineMovement, arbitrage, injuryStatus, redditSentiment);
        
        if (coach.injuryOverride) {
            console.log(`[V47U] 🚨 Verdict: NO BET - PLAYER ${injuryStatus.status}`);
        } else {
            console.log(`[V47U] ✅ Verdict: ${coach.verdict} | ${coach.unitSizing} units`);
            console.log(`[V47U] 📊 Kelly: ${coach.kellyFraction.toFixed(3)} (${coach.kellyUnits}u) | Edge: ${(coach.edge * 100).toFixed(1)}%`);
        }

        // Final calculations
        const feelOdds = probToOdds(master.finalProb);
        
        let diamonds = 3;
        if (!master.injuryOverride) {
            if (master.confidence >= 55) diamonds++;
            if (master.confidence >= 65) diamonds++;
            if (master.confidence >= 75) diamonds++;
            if (master.confidence >= 85) diamonds++;
            if (aiCollective.agreement === 'STRONG') diamonds += 2;
            else if (aiCollective.agreement === 'MODERATE') diamonds++;
            if (hitRate?.rate >= 60 && aiCollective.direction === 'OVER') diamonds++;
            if (hitRate?.rate <= 40 && aiCollective.direction === 'UNDER') diamonds++;
            if (coach.hasValue && !coach.vegasDisagrees) diamonds++;
            // Defense bonus
            if (defenseData?.tier === 'WEAK' && aiCollective.direction === 'OVER') diamonds++;
            if (defenseData?.tier === 'ELITE' && aiCollective.direction === 'UNDER') diamonds++;
            // Reddit bonus - if Reddit sentiment matches our pick
            if (redditSentiment?.available) {
                const redditSent = redditSentiment.sentiment;
                if (redditSent.label.includes('OVER') && aiCollective.direction === 'OVER') diamonds++;
                if (redditSent.label.includes('UNDER') && aiCollective.direction === 'UNDER') diamonds++;
                // Extra bonus for strong Reddit sentiment with many mentions
                if (redditSent.score >= 70 && redditSentiment.mentions >= 5) diamonds++;
            }
        } else {
            diamonds = 0;
        }
        diamonds = Math.min(9, Math.max(0, diamonds));
        
        const tier = master.injuryOverride ? '🚫 NO BET - INJURY'
                   : diamonds >= 9 ? '🔒💎 ABSOLUTE LOCK'
                   : diamonds >= 8 ? '💎💎 PREMIUM LOCK'
                   : diamonds >= 7 ? '💎 STRONG PLAY'
                   : diamonds >= 5 ? '⭐ SOLID VALUE'
                   : '⚡ LEAN';
        
        const execTime = Date.now() - start;

        // Record to history
        const historyId = recordPick(params, {
            pick: master.finalPick,
            feelOdds: `${feelOdds > 0 ? '+' : ''}${feelOdds}`,
            trueProb: master.finalProb,
            confidence: master.confidence,
            coach,
            sgoData,
            aiCollective
        });

        // FINAL OUTPUT
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                      🏆 FINAL ANALYSIS 🏆                                     ║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        
        if (master.injuryOverride) {
            console.log('║  🚫🚫🚫 INJURY OVERRIDE 🚫🚫🚫'.padEnd(78) + '║');
            console.log(`║  Player Status: ${injuryStatus.status}`.padEnd(78) + '║');
        } else {
            console.log(`║  ${'💎'.repeat(diamonds)}${'⬜'.repeat(9 - diamonds)}`.padEnd(78) + '║');
        }
        console.log(`║  ${tier}`.padEnd(78) + '║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  PICK: ${master.finalPick}`.padEnd(78) + '║');
        console.log(`║  FEEL-LIKE ODDS: ${feelOdds > 0 ? '+' : ''}${feelOdds}`.padEnd(78) + '║');
        console.log(`║  TRUE PROBABILITY: ${(master.finalProb * 100).toFixed(1)}%`.padEnd(78) + '║');
        console.log(`║  CONFIDENCE: ${master.confidence}%`.padEnd(78) + '║');
        console.log(`║  EDGE: ${master.edgeEstimate}`.padEnd(78) + '║');
        
        if (sgoData?.found && sgoData.playerProps?.points) {
            console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
            console.log('║  📊 VEGAS (SGO):'.padEnd(78) + '║');
            const pp = sgoData.playerProps.points;
            console.log(`║  • Line: ${pp.line} | Book: ${pp.bookOdds} | Fair: ${pp.fairOdds} | ${pp.books} books`.padEnd(78) + '║');
        }
        
        // Live Game Section (if game in progress)
        if (liveGame?.available) {
            console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
            console.log('║  🔴 LIVE GAME IN PROGRESS:'.padEnd(78) + '║');
            console.log(`║  • ${liveGame.gameName} | ${liveGame.awayScore}-${liveGame.homeScore}`.padEnd(78) + '║');
            console.log(`║  • Status: ${liveGame.status?.detail || liveGame.status?.description}`.padEnd(78) + '║');
            if (liveGame.playerStats?.stats) {
                const s = liveGame.playerStats.stats;
                console.log(`║  • ${params.player}: ${s.pts || s.points || 0} pts, ${s.reb || s.rebounds || 0} reb, ${s.ast || s.assists || 0} ast`.padEnd(78) + '║');
            }
        }
        
        // NEW: Reddit Sentiment Section
        if (redditSentiment?.available) {
            console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
            console.log('║  📱 REDDIT SENTIMENT (r/sportsbook):'.padEnd(78) + '║');
            const reddit = redditSentiment;
            console.log(`║  • Mentions: ${reddit.mentions} | Sentiment: ${reddit.sentiment.label} (${reddit.sentiment.score > 0 ? '+' : ''}${reddit.sentiment.score})`.padEnd(78) + '║');
            if (reddit.keywords?.bullish?.length > 0) {
                console.log(`║  • Bullish: ${reddit.keywords.bullish.slice(0, 5).join(', ')}`.padEnd(78) + '║');
            }
            if (reddit.keywords?.bearish?.length > 0) {
                console.log(`║  • Bearish: ${reddit.keywords.bearish.slice(0, 5).join(', ')}`.padEnd(78) + '║');
            }
            if (reddit.samples?.[0]) {
                const sample = reddit.samples[0];
                const body = sample.body.substring(0, 60).replace(/\n/g, ' ');
                console.log(`║  • "${body}..." - ${sample.author} (${sample.score}↑)`.padEnd(78) + '║');
            }
        }
        
        // NEW: Twitter/X Sentiment Section
        if (twitterSentiment?.available) {
            console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
            console.log('║  🐦 TWITTER/X SENTIMENT:'.padEnd(78) + '║');
            const tw = twitterSentiment;
            console.log(`║  • Sentiment: ${tw.sentiment.label} (${tw.sentiment.score > 0 ? '+' : ''}${tw.sentiment.score})`.padEnd(78) + '║');
            if (tw.sentiment.summary) {
                const summary = tw.sentiment.summary.substring(0, 65);
                console.log(`║  • ${summary}...`.padEnd(78) + '║');
            }
            if (tw.estimatedTweets) {
                console.log(`║  • Est. tweets: ~${tw.estimatedTweets}`.padEnd(78) + '║');
            }
        }
        
        // NEW: Defense & Line Movement Section
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  🛡️ MATCHUP & MARKET:'.padEnd(78) + '║');
        if (defenseData?.found) {
            console.log(`║  • Defense: ${defenseData.opponent} #${defenseData.rank} (${defenseData.tier}) | ${defenseData.impact}`.padEnd(78) + '║');
        }
        if (movement) {
            console.log(`║  • Line Move: ${movement.direction} ${movement.change}pts | ${movement.interpretation}`.padEnd(78) + '║');
        }
        if (arbitrage?.hasArbitrage) {
            console.log(`║  • ⚡ ARBITRAGE: ${arbitrage.edge}% edge - ${arbitrage.recommendation.substring(0, 50)}`.padEnd(78) + '║');
        }
        
        // NEW: Vegas Verdict Section
        if (coach.vegasVerdict) {
            console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
            const vv = coach.vegasVerdict;
            const trustIcon = vv.trustLevel === 'VERY_HIGH' ? '🟢🟢' 
                            : vv.trustLevel === 'HIGH' ? '🟢' 
                            : vv.trustLevel === 'MEDIUM_HIGH' ? '🟡🟢'
                            : vv.trustLevel === 'MEDIUM' ? '🟡' 
                            : vv.trustLevel === 'MEDIUM_LOW' ? '🟠'
                            : vv.trustLevel === 'LOW' ? '🔴'
                            : '🔴🔴';
            console.log(`║  🎰 VEGAS VERDICT: ${vv.action} ${trustIcon}`.padEnd(78) + '║');
            console.log(`║  • Trust Level: ${vv.trustLevel} | SGO Edge: ${vv.sgoEdge}`.padEnd(78) + '║');
            console.log(`║  • Line Move: ${vv.lineMove}`.padEnd(78) + '║');
            // Wrap recommendation text
            const recText = vv.recommendation || '';
            if (recText.length > 0) {
                const recWords = recText.split(' ');
                let recLine = '║  • ';
                for (const word of recWords) {
                    if (recLine.length + word.length > 75) {
                        console.log(recLine.padEnd(78) + '║');
                        recLine = '║    ' + word + ' ';
                    } else {
                        recLine += word + ' ';
                    }
                }
                if (recLine.trim().length > 4) console.log(recLine.padEnd(78) + '║');
            }
            console.log(`║  • Unit Adjustment: ${vv.unitAdjustment} → Final: ${vv.finalUnits}u`.padEnd(78) + '║');
            if (vv.publicFade) {
                console.log(`║  • 📢 ${vv.publicFade.action}: ${vv.publicFade.reason.substring(0, 55)}...`.padEnd(78) + '║');
            }
        }
        
        if (stats) {
            console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
            console.log('║  📈 STATS:'.padEnd(78) + '║');
            console.log(`║  • L5: ${stats.l5.pts} pts | L10: ${stats.l10.pts} pts | Season: ${stats.season.pts} pts`.padEnd(78) + '║');
            console.log(`║  • Recent: ${stats.recentGames?.map(g => g.pts).join(', ')}`.padEnd(78) + '║');
            if (hitRate) {
                console.log(`║  • Hit Rate: ${hitRate.rate}% (${hitRate.detail}) ${hitRate.trend}`.padEnd(78) + '║');
                console.log(`║  • Margin: ${hitRate.margin > 0 ? '+' : ''}${hitRate.margin} | Streak: ${hitRate.streak}`.padEnd(78) + '║');
            }
        }
        
        // Injury Section (if detected)
        if (injuryStatus.injuries.length > 0) {
            console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
            console.log('║  🏥 INJURY ALERT:'.padEnd(78) + '║');
            console.log(`║  • Status: ${injuryStatus.status} (Sources: ${injuryStatus.sources.join(', ')})`.padEnd(78) + '║');
            if (injuryStatus.shouldOverride) {
                console.log('║  • ⚠️ BET BLOCKED: Cannot recommend betting on injured player'.padEnd(78) + '║');
            }
        }
        
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  📝 WHY THIS PICK:'.padEnd(78) + '║');
        const narrative = master.synthesisNarrative || 'Analysis complete.';
        const words = narrative.split(' ');
        let line = '║  ';
        for (const word of words) {
            if (line.length + word.length > 75) {
                console.log(line.padEnd(78) + '║');
                line = '║  ' + word + ' ';
            } else {
                line += word + ' ';
            }
        }
        if (line.length > 4) console.log(line.padEnd(78) + '║');
        
        // Enhanced Coach K Section
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  🏀 COACH K ANALYSIS:'.padEnd(78) + '║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  VERDICT: ${coach.verdict} | ${coach.unitSizing} units | Kelly: ${coach.kellyUnits}u`.padEnd(78) + '║');
        console.log('║'.padEnd(78) + '║');
        console.log('║  📗 FOR CASUAL BETTORS:'.padEnd(78) + '║');
        const plainWords = (coach.plainLanguage || '').split(' ');
        let plainLine = '║  ';
        for (const word of plainWords) {
            if (plainLine.length + word.length > 75) {
                console.log(plainLine.padEnd(78) + '║');
                plainLine = '║  ' + word + ' ';
            } else {
                plainLine += word + ' ';
            }
        }
        if (plainLine.length > 4) console.log(plainLine.padEnd(78) + '║');
        
        console.log('║'.padEnd(78) + '║');
        console.log('║  📊 FOR SHARP BETTORS:'.padEnd(78) + '║');
        const expertWords = (coach.expertLanguage || '').split(' ');
        let expertLine = '║  ';
        for (const word of expertWords) {
            if (expertLine.length + word.length > 75) {
                console.log(expertLine.padEnd(78) + '║');
                expertLine = '║  ' + word + ' ';
            } else {
                expertLine += word + ' ';
            }
        }
        if (expertLine.length > 4) console.log(expertLine.padEnd(78) + '║');
        
        console.log('║'.padEnd(78) + '║');
        console.log(`║  💡 KEY INSIGHT: ${(coach.keyInsight || '').substring(0, 55)}`.padEnd(78) + '║');
        
        if (coach.warnings?.length > 0) {
            console.log('║'.padEnd(78) + '║');
            console.log('║  ⚠️ WARNINGS:'.padEnd(78) + '║');
            coach.warnings.slice(0, 2).forEach(w => {
                console.log(`║  • ${w.substring(0, 68)}`.padEnd(78) + '║');
            });
        }
        
        if (coach.correlationTip) {
            console.log(`║  🔗 PARLAY TIP: ${coach.correlationTip.substring(0, 55)}`.padEnd(78) + '║');
        }
        
        if (coach.hedgeStrategy) {
            console.log(`║  🔄 HEDGE: ${coach.hedgeStrategy.substring(0, 60)}`.padEnd(78) + '║');
        }
        
        // History Stats
        const histStats = getHistoryStats();
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  📜 HISTORICAL TRACKING:'.padEnd(78) + '║');
        if (histStats.gradedPicks > 0) {
            console.log(`║  • Record: ${histStats.wins}-${histStats.losses} (${histStats.winRate}%) | ROI: ${histStats.roi}%`.padEnd(78) + '║');
            console.log(`║  • Recent: ${histStats.recentForm} | Total Picks: ${histStats.totalPicks}`.padEnd(78) + '║');
        } else {
            console.log(`║  • Picks Tracked: ${histStats.totalPicks} | Grade picks with: gradePick(id, result)`.padEnd(78) + '║');
        }
        console.log(`║  • This Pick ID: ${historyId.substring(0, 20)}...`.padEnd(78) + '║');
        
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  AI: ${Object.keys(results).length}/11 | BDL: ${stats ? '✅' : '❌'} | SGO: ${sgoData?.found ? '✅' : '❌'} | DEF: ${defenseData?.found ? '✅' : '❌'} | Time: ${execTime}ms`.padEnd(78) + '║');
        console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');

        return {
            pick: master.finalPick,
            feelOdds: `${feelOdds > 0 ? '+' : ''}${feelOdds}`,
            trueProb: master.finalProb,
            confidence: master.confidence,
            edgeEstimate: master.edgeEstimate,
            diamonds, tier, stats, hitRate, sgoData,
            synthesisNarrative: master.synthesisNarrative,
            injuryStatus,
            defenseData,
            lineMovement: movement,
            arbitrage,
            coach: {
                verdict: coach.verdict,
                unitSizing: coach.unitSizing,
                plainLanguage: coach.plainLanguage,
                expertLanguage: coach.expertLanguage,
                keyInsight: coach.keyInsight,
                warnings: coach.warnings,
                correlationTip: coach.correlationTip,
                hedgeStrategy: coach.hedgeStrategy,
                kelly: { fraction: coach.kellyFraction, units: coach.kellyUnits },
                edge: coach.edge,
                hasValue: coach.hasValue,
                vegasDisagrees: coach.vegasDisagrees
            },
            aiCollective, 
            engines: results,
            executionTime: execTime,
            historyId
        };
    }

    // Live Scores function
    async function getLiveScores(sport = 'nba') {
        try {
            const res = await fetch(`https://sba-ai-proxy-production.up.railway.app/api/live/${sport}/scores`);
            if (res.ok) {
                const data = await res.json();
                console.log(`\n🏀 ${sport.toUpperCase()} LIVE SCORES\n`);
                if (data.games?.length === 0) {
                    console.log('No games currently in progress');
                    return data;
                }
                data.games.forEach(g => {
                    const status = g.status?.type === 'STATUS_IN_PROGRESS' ? '🔴 LIVE' 
                                 : g.status?.type === 'STATUS_FINAL' ? '✅ FINAL'
                                 : '⏰ ' + (g.status?.detail || 'Scheduled');
                    console.log(`${status} | ${g.away?.abbreviation} ${g.away?.score || 0} - ${g.home?.score || 0} ${g.home?.abbreviation}`);
                    if (g.odds) {
                        console.log(`       Spread: ${g.odds.spread} | O/U: ${g.odds.overUnder}`);
                    }
                });
                return data;
            }
        } catch (e) {
            console.log('Error fetching live scores:', e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════
    return { 
        analyze, 
        getPlayerStats, 
        getSGOData, 
        calculateHitRate,
        getOpponentDefense,
        getLineMovement,
        checkArbitrage,
        getLiveScores,
        // History functions
        getHistoryStats,
        gradePick,
        getHistory: () => JSON.parse(localStorage.getItem('sba_history') || '[]'),
        clearHistory: () => { localStorage.removeItem('sba_history'); window.SBA_HISTORY = []; }
    };
})();

window.SBA_V47_ULTIMATE = SBA_V47_ULTIMATE;
console.log('');
console.log('🏆 V47 ULTIMATE V3.6 - VEGAS INTEGRATION EDITION');
console.log('   ✅ Vegas Trust/Fade Rules (auto unit adjustment)');
console.log('   ✅ Steam Move Detection (2+ point moves)');
console.log('   ✅ Reverse Line Movement (sharp vs public)');
console.log('   ✅ Public Fade Signals');
console.log('   ✅ Reddit + Twitter/X Sentiment');
console.log('   ✅ Live Game Tracking (ESPN API)');
console.log('   ✅ All 11 AI Engines');
console.log('');
console.log('📊 COMMANDS:');
console.log('   analyze({ player, market, line, opponent })');
console.log('   getLiveScores(sport) - Get live scores');
console.log('   getHistoryStats() - View your record');
console.log('');
console.log('🎰 VEGAS TRUST LEVELS:');
console.log('   🟢🟢 MAX_TRUST    - Vegas + AI + Sharps all agree');
console.log('   🟢   TRUST        - SGO edge positive (>+2%)');
console.log('   🟡   NEUTRAL      - No strong signal');
console.log('   🟠   CAUTION      - Vegas slightly disagrees');
console.log('   🔴   REDUCE_SIZE  - Vegas strongly disagrees');
console.log('   🔴🔴 CONSIDER_FADE - Vegas very strongly disagrees');
console.log('');
console.log('🧪 TEST: SBA_V47_ULTIMATE.analyze({ player: "LeBron James", market: "player_points", line: 23.5, opponent: "GSW" })');
