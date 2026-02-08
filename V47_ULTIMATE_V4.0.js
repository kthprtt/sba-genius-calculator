// ═══════════════════════════════════════════════════════════════════════════════
// SBA GENIUS V47 ULTIMATE V4.0 - UNIVERSAL SPORTS EDITION
// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 NEW: Multi-Sport Support (NBA, NFL, MLB, NHL, NCAAB, NCAAF, Soccer)
// 🔴 NEW: Offense Stats (Team Pace, O-Rating, Scoring Trends)
// 🔴 NEW: Universal Defense Rankings (All Sports)
// 🔴 NEW: Market-Specific Prompts (Points, Rebounds, Assists, Yards, Strikeouts, Goals)
// 🔴 NEW: Sport-Specific Reddit (r/nba, r/nfl, r/baseball, r/hockey, r/soccer)
// 🔴 NEW: Universal Stats via ESPN API
// 🔴 NEW: Weather & Travel Impact (Outdoor Sports)
// ✅ ALL: Vegas Integration, Twitter/X, 11 AI Engines, Injury Detection
// ═══════════════════════════════════════════════════════════════════════════════

window.CONFIG = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
window.BDL_API_KEY = window.CONFIG?.keys?.bdl || '1b29d9a4-56ef-40d8-b2f9-4d3eefb13a6b';
window.SGO_API_KEY = 'e5ef93d1b57cf2ea95eb5e2ca0eb8fc5';
window.SBA_HISTORY = window.SBA_HISTORY || [];

const SBA_V47_ULTIMATE = (function() {
    const PROXY = 'https://sba-ai-proxy-production.up.railway.app';
    const BDL_KEY = window.BDL_API_KEY;
    const SGO_KEY = window.SGO_API_KEY;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SPORT CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    const SPORT_CONFIG = {
        nba: {
            name: 'NBA',
            league: 'NBA',
            subreddits: ['nba', 'sportsbook', 'NBAbetting'],
            markets: ['player_points', 'player_rebounds', 'player_assists', 'player_pra', 'player_threes'],
            statKeys: { points: 'pts', rebounds: 'reb', assists: 'ast', threes: 'fg3m', pra: ['pts', 'reb', 'ast'] },
            hasDefense: true,
            hasOffense: true,
            outdoor: false
        },
        nfl: {
            name: 'NFL',
            league: 'NFL',
            subreddits: ['nfl', 'sportsbook', 'fantasyfootball'],
            markets: ['player_passing_yards', 'player_rushing_yards', 'player_receiving_yards', 'player_touchdowns', 'player_completions'],
            statKeys: { passing_yards: 'pass_yds', rushing_yards: 'rush_yds', receiving_yards: 'rec_yds', touchdowns: 'td', completions: 'cmp' },
            hasDefense: true,
            hasOffense: true,
            outdoor: true
        },
        mlb: {
            name: 'MLB',
            league: 'MLB',
            subreddits: ['baseball', 'sportsbook', 'fantasybaseball'],
            markets: ['player_hits', 'player_strikeouts', 'player_home_runs', 'player_rbis', 'player_total_bases'],
            statKeys: { hits: 'h', strikeouts: 'so', home_runs: 'hr', rbis: 'rbi', total_bases: 'tb' },
            hasDefense: true,
            hasOffense: true,
            outdoor: true
        },
        nhl: {
            name: 'NHL',
            league: 'NHL',
            subreddits: ['hockey', 'sportsbook', 'fantasyhockey'],
            markets: ['player_points', 'player_goals', 'player_assists', 'player_shots', 'player_saves'],
            statKeys: { points: 'pts', goals: 'g', assists: 'a', shots: 'sog', saves: 'sv' },
            hasDefense: true,
            hasOffense: true,
            outdoor: false
        },
        ncaab: {
            name: 'NCAAB',
            league: 'NCAAMB',
            subreddits: ['collegebasketball', 'sportsbook'],
            markets: ['player_points', 'player_rebounds', 'player_assists'],
            statKeys: { points: 'pts', rebounds: 'reb', assists: 'ast' },
            hasDefense: true,
            hasOffense: true,
            outdoor: false
        },
        ncaaf: {
            name: 'NCAAF',
            league: 'NCAAFB',
            subreddits: ['cfb', 'sportsbook'],
            markets: ['player_passing_yards', 'player_rushing_yards', 'player_receiving_yards'],
            statKeys: { passing_yards: 'pass_yds', rushing_yards: 'rush_yds', receiving_yards: 'rec_yds' },
            hasDefense: true,
            hasOffense: true,
            outdoor: true
        },
        soccer: {
            name: 'Soccer',
            league: 'EPL', // Default to EPL, can be changed
            subreddits: ['soccer', 'sportsbook', 'SoccerBetting'],
            markets: ['player_goals', 'player_assists', 'player_shots', 'player_tackles'],
            statKeys: { goals: 'g', assists: 'a', shots: 'sog', tackles: 'tkl' },
            hasDefense: true,
            hasOffense: true,
            outdoor: true
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // MARKET CONFIGURATION - What stat to analyze for each market
    // ═══════════════════════════════════════════════════════════════════════════
    const MARKET_CONFIG = {
        // NBA Markets
        player_points: { stat: 'pts', display: 'Points', sport: 'nba' },
        player_rebounds: { stat: 'reb', display: 'Rebounds', sport: 'nba' },
        player_assists: { stat: 'ast', display: 'Assists', sport: 'nba' },
        player_pra: { stat: ['pts', 'reb', 'ast'], display: 'PRA', sport: 'nba', combined: true },
        player_threes: { stat: 'fg3m', display: '3-Pointers', sport: 'nba' },
        player_steals: { stat: 'stl', display: 'Steals', sport: 'nba' },
        player_blocks: { stat: 'blk', display: 'Blocks', sport: 'nba' },
        player_turnovers: { stat: 'turnover', display: 'Turnovers', sport: 'nba' },
        
        // NFL Markets
        player_passing_yards: { stat: 'pass_yds', display: 'Passing Yards', sport: 'nfl' },
        player_rushing_yards: { stat: 'rush_yds', display: 'Rushing Yards', sport: 'nfl' },
        player_receiving_yards: { stat: 'rec_yds', display: 'Receiving Yards', sport: 'nfl' },
        player_touchdowns: { stat: 'td', display: 'Touchdowns', sport: 'nfl' },
        player_completions: { stat: 'cmp', display: 'Completions', sport: 'nfl' },
        player_interceptions: { stat: 'int', display: 'Interceptions', sport: 'nfl' },
        player_receptions: { stat: 'rec', display: 'Receptions', sport: 'nfl' },
        
        // MLB Markets
        player_hits: { stat: 'h', display: 'Hits', sport: 'mlb' },
        player_strikeouts: { stat: 'so', display: 'Strikeouts', sport: 'mlb' },
        player_home_runs: { stat: 'hr', display: 'Home Runs', sport: 'mlb' },
        player_rbis: { stat: 'rbi', display: 'RBIs', sport: 'mlb' },
        player_total_bases: { stat: 'tb', display: 'Total Bases', sport: 'mlb' },
        player_runs: { stat: 'r', display: 'Runs', sport: 'mlb' },
        player_walks: { stat: 'bb', display: 'Walks', sport: 'mlb' },
        pitcher_strikeouts: { stat: 'k', display: 'Pitcher Ks', sport: 'mlb' },
        pitcher_outs: { stat: 'outs', display: 'Outs Recorded', sport: 'mlb' },
        
        // NHL Markets
        player_goals: { stat: 'g', display: 'Goals', sport: 'nhl' },
        player_nhl_assists: { stat: 'a', display: 'Assists', sport: 'nhl' },
        player_nhl_points: { stat: 'pts', display: 'Points', sport: 'nhl' },
        player_shots: { stat: 'sog', display: 'Shots on Goal', sport: 'nhl' },
        player_saves: { stat: 'sv', display: 'Saves', sport: 'nhl' },
        
        // Soccer Markets
        player_soccer_goals: { stat: 'g', display: 'Goals', sport: 'soccer' },
        player_soccer_assists: { stat: 'a', display: 'Assists', sport: 'soccer' },
        player_soccer_shots: { stat: 'sog', display: 'Shots', sport: 'soccer' }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // AI ENGINE WEIGHTS AND PROMPTS
    // ═══════════════════════════════════════════════════════════════════════════
    const weights = {claude:0.18,openai:0.16,perplexity:0.12,grok:0.08,deepseek:0.08,cohere:0.08,gemini:0.06,mistral:0.06,groq:0.06,together:0.06,youcom:0.06};
    const engines = Object.keys(weights);
    
    // Injury keywords
    const INJURY_KEYWORDS = [
        'out', 'ruled out', 'will not play', 'sidelined', 'injured', 
        'injury', 'questionable', 'doubtful', 'day-to-day', 'dnp',
        'rest', 'resting', 'load management', 'personal reasons',
        'illness', 'sick', 'not playing', 'unavailable', 'miss',
        'surgery', 'sprain', 'strain', 'fracture', 'torn', 'concussion',
        'IL', 'injured list', 'disabled list', 'IR', 'injured reserve',
        'scratched', 'benched', 'inactive'
    ];
    
    const INJURY_SEVERITY = {
        'out': 'OUT', 'ruled out': 'OUT', 'will not play': 'OUT', 'sidelined': 'OUT',
        'not playing': 'OUT', 'unavailable': 'OUT', 'miss': 'OUT', 'surgery': 'OUT',
        'IL': 'OUT', 'injured list': 'OUT', 'disabled list': 'OUT', 'IR': 'OUT',
        'injured reserve': 'OUT', 'scratched': 'OUT', 'inactive': 'OUT',
        'questionable': 'QUESTIONABLE', 'doubtful': 'DOUBTFUL', 'day-to-day': 'QUESTIONABLE',
        'game-time decision': 'QUESTIONABLE', 'probable': 'PROBABLE'
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // MARKET-SPECIFIC ENGINE PROMPTS
    // ═══════════════════════════════════════════════════════════════════════════
    function getEnginePrompt(engineId, market, sport) {
        const marketConfig = MARKET_CONFIG[market] || {};
        const statName = marketConfig.display || market;
        const sportConfig = SPORT_CONFIG[sport] || SPORT_CONFIG.nba;
        
        const basePrompts = {
            claude: `As RISK ANALYST for ${sportConfig.name} ${statName}: What specific scenarios could make this bet LOSE? Name concrete risks. CRITICAL: Check if player is injured/OUT.`,
            openai: `As STATISTICIAN for ${sportConfig.name} ${statName}: Calculate exact probability. Compare line to recent averages, factor in variance and opponent. Show your math.`,
            perplexity: `As NEWS RESEARCHER for ${sportConfig.name}: CRITICAL - Is this player INJURED, OUT, QUESTIONABLE, or RESTING? Check official injury reports. Also check lineup status and recent news.`,
            grok: `As BETTING ANALYST for ${sportConfig.name} ${statName}: Sharp vs public money? Line movement? What's the market telling us?`,
            deepseek: `As QUANT for ${sportConfig.name} ${statName}: Calculate EV. What's the mathematical edge? Show the formula and numbers.`,
            cohere: `As SITUATIONAL ANALYST for ${sportConfig.name}: Fatigue, travel, rest days, rivalry games, playoff implications? What situational factors matter for ${statName}?`,
            gemini: `As TRENDS ANALYST for ${sportConfig.name} ${statName}: Historical patterns vs this opponent? Home/away splits? Recent form in this specific stat?`,
            mistral: `As LINE ANALYST for ${sportConfig.name} ${statName}: Is this number too high/low based on projections? Where's the value?`,
            groq: `As QUICK CHECK for ${sportConfig.name} ${statName}: Basic sanity check - do the numbers obviously support OVER or UNDER?`,
            together: `As CONTRARIAN for ${sportConfig.name} ${statName}: Why might consensus be WRONG? What's the blind spot?`,
            youcom: `As NEWS SCOUT for ${sportConfig.name}: Check for breaking news - injuries, lineup changes, rest decisions, weather (if outdoor) in last 24 hours.`
        };
        
        // Sport-specific additions
        if (sport === 'mlb' && market.includes('pitcher')) {
            basePrompts.claude = `As PITCHING ANALYST: Analyze this pitcher's recent form, opponent batting stats, and park factors. Check for arm fatigue or injury concerns.`;
            basePrompts.gemini = `As PITCHING TRENDS: Recent K rate, pitch count trends, performance vs this lineup historically?`;
        }
        
        if (sport === 'nfl') {
            basePrompts.cohere = `As NFL SITUATIONAL: Weather impact? Indoor/outdoor? Division rivalry? Travel distance? Short week? Playoff implications?`;
        }
        
        if (sport === 'nhl') {
            basePrompts.cohere = `As NHL SITUATIONAL: Back-to-back game? Travel? Goalie matchup? Special teams usage? Line combinations?`;
        }
        
        return basePrompts[engineId] || basePrompts.claude;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UNIVERSAL DEFENSE RANKINGS (All Sports)
    // ═══════════════════════════════════════════════════════════════════════════
    const DEFENSE_RANKINGS = {
        // NBA Defense Rankings (vs different positions)
        nba: {
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
            'MIA': { rank: 11, rating: 110.2, vs_guards: 'AVG', vs_forwards: 'GOOD', vs_centers: 'AVG' },
            'PHX': { rank: 12, rating: 110.5, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'IND': { rank: 13, rating: 110.8, vs_guards: 'AVG', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'SAC': { rank: 14, rating: 111.2, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'MIL': { rank: 15, rating: 111.5, vs_guards: 'AVG', vs_forwards: 'AVG', vs_centers: 'GOOD' },
            'DAL': { rank: 16, rating: 111.8, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'PHI': { rank: 17, rating: 112.1, vs_guards: 'AVG', vs_forwards: 'AVG', vs_centers: 'WEAK' },
            'LAL': { rank: 18, rating: 112.5, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'AVG' },
            'SAS': { rank: 19, rating: 112.8, vs_guards: 'AVG', vs_forwards: 'WEAK', vs_centers: 'AVG' },
            'GSW': { rank: 20, rating: 113.0, vs_guards: 'AVG', vs_forwards: 'WEAK', vs_centers: 'AVG' },
            'TOR': { rank: 21, rating: 113.2, vs_guards: 'WEAK', vs_forwards: 'AVG', vs_centers: 'WEAK' },
            'ATL': { rank: 22, rating: 113.5, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'AVG' },
            'CHI': { rank: 23, rating: 113.9, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'BKN': { rank: 24, rating: 114.2, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'AVG' },
            'NOP': { rank: 25, rating: 114.6, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'POR': { rank: 26, rating: 115.0, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'CHA': { rank: 27, rating: 115.3, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'DET': { rank: 28, rating: 115.7, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'UTA': { rank: 29, rating: 116.1, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' },
            'WAS': { rank: 30, rating: 116.5, vs_guards: 'WEAK', vs_forwards: 'WEAK', vs_centers: 'WEAK' }
        },
        
        // NFL Defense Rankings (vs pass/rush)
        nfl: {
            'BAL': { rank: 1, rating: 17.2, vs_pass: 'ELITE', vs_rush: 'ELITE' },
            'DEN': { rank: 2, rating: 18.5, vs_pass: 'ELITE', vs_rush: 'GOOD' },
            'CLE': { rank: 3, rating: 19.1, vs_pass: 'GOOD', vs_rush: 'ELITE' },
            'SF': { rank: 4, rating: 19.4, vs_pass: 'GOOD', vs_rush: 'ELITE' },
            'PHI': { rank: 5, rating: 19.8, vs_pass: 'ELITE', vs_rush: 'AVG' },
            'BUF': { rank: 6, rating: 20.1, vs_pass: 'GOOD', vs_rush: 'GOOD' },
            'KC': { rank: 7, rating: 20.5, vs_pass: 'GOOD', vs_rush: 'GOOD' },
            'PIT': { rank: 8, rating: 20.8, vs_pass: 'GOOD', vs_rush: 'AVG' },
            'DAL': { rank: 9, rating: 21.2, vs_pass: 'AVG', vs_rush: 'GOOD' },
            'NYJ': { rank: 10, rating: 21.5, vs_pass: 'GOOD', vs_rush: 'AVG' },
            'GB': { rank: 11, rating: 21.9, vs_pass: 'AVG', vs_rush: 'AVG' },
            'MIN': { rank: 12, rating: 22.2, vs_pass: 'AVG', vs_rush: 'AVG' },
            'MIA': { rank: 13, rating: 22.6, vs_pass: 'AVG', vs_rush: 'AVG' },
            'DET': { rank: 14, rating: 22.9, vs_pass: 'AVG', vs_rush: 'AVG' },
            'LAR': { rank: 15, rating: 23.3, vs_pass: 'AVG', vs_rush: 'WEAK' },
            'IND': { rank: 16, rating: 23.6, vs_pass: 'WEAK', vs_rush: 'AVG' },
            'NO': { rank: 17, rating: 24.0, vs_pass: 'WEAK', vs_rush: 'AVG' },
            'CHI': { rank: 18, rating: 24.3, vs_pass: 'WEAK', vs_rush: 'AVG' },
            'SEA': { rank: 19, rating: 24.7, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'TB': { rank: 20, rating: 25.0, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'HOU': { rank: 21, rating: 25.4, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'ARI': { rank: 22, rating: 25.7, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'NE': { rank: 23, rating: 26.1, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'ATL': { rank: 24, rating: 26.4, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'NYG': { rank: 25, rating: 26.8, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'TEN': { rank: 26, rating: 27.1, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'JAX': { rank: 27, rating: 27.5, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'LV': { rank: 28, rating: 27.8, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'LAC': { rank: 29, rating: 28.2, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'CIN': { rank: 30, rating: 28.5, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'WAS': { rank: 31, rating: 28.9, vs_pass: 'WEAK', vs_rush: 'WEAK' },
            'CAR': { rank: 32, rating: 29.2, vs_pass: 'WEAK', vs_rush: 'WEAK' }
        },
        
        // MLB Team Pitching Rankings (lower ERA = better)
        mlb: {
            'LAD': { rank: 1, era: 3.12, vs_righty: 'ELITE', vs_lefty: 'GOOD', k_rate: 'ELITE' },
            'ATL': { rank: 2, era: 3.25, vs_righty: 'GOOD', vs_lefty: 'ELITE', k_rate: 'GOOD' },
            'HOU': { rank: 3, era: 3.38, vs_righty: 'GOOD', vs_lefty: 'GOOD', k_rate: 'ELITE' },
            'PHI': { rank: 4, era: 3.45, vs_righty: 'GOOD', vs_lefty: 'GOOD', k_rate: 'GOOD' },
            'TB': { rank: 5, era: 3.52, vs_righty: 'AVG', vs_lefty: 'ELITE', k_rate: 'GOOD' },
            'TEX': { rank: 6, era: 3.61, vs_righty: 'GOOD', vs_lefty: 'AVG', k_rate: 'AVG' },
            'MIL': { rank: 7, era: 3.68, vs_righty: 'AVG', vs_lefty: 'GOOD', k_rate: 'AVG' },
            'BAL': { rank: 8, era: 3.75, vs_righty: 'AVG', vs_lefty: 'AVG', k_rate: 'AVG' },
            'ARI': { rank: 9, era: 3.82, vs_righty: 'AVG', vs_lefty: 'AVG', k_rate: 'AVG' },
            'SEA': { rank: 10, era: 3.89, vs_righty: 'AVG', vs_lefty: 'AVG', k_rate: 'AVG' },
            'MIN': { rank: 11, era: 3.96, vs_righty: 'AVG', vs_lefty: 'WEAK', k_rate: 'AVG' },
            'SD': { rank: 12, era: 4.03, vs_righty: 'WEAK', vs_lefty: 'AVG', k_rate: 'AVG' },
            'NYY': { rank: 13, era: 4.10, vs_righty: 'WEAK', vs_lefty: 'AVG', k_rate: 'AVG' },
            'CLE': { rank: 14, era: 4.17, vs_righty: 'AVG', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'SF': { rank: 15, era: 4.24, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'AVG' },
            'TOR': { rank: 16, era: 4.35, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'BOS': { rank: 17, era: 4.45, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'NYM': { rank: 18, era: 4.55, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'DET': { rank: 19, era: 4.65, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'KC': { rank: 20, era: 4.75, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'CHC': { rank: 21, era: 4.85, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'PIT': { rank: 22, era: 4.95, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'CIN': { rank: 23, era: 5.05, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'MIA': { rank: 24, era: 5.15, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'LAA': { rank: 25, era: 5.25, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'CWS': { rank: 26, era: 5.35, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'STL': { rank: 27, era: 5.45, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'OAK': { rank: 28, era: 5.55, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'WAS': { rank: 29, era: 5.65, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' },
            'COL': { rank: 30, era: 5.85, vs_righty: 'WEAK', vs_lefty: 'WEAK', k_rate: 'WEAK' }
        },
        
        // NHL Defense/Goalie Rankings
        nhl: {
            'BOS': { rank: 1, gaa: 2.35, vs_forwards: 'ELITE', sv_pct: 'ELITE' },
            'VGK': { rank: 2, gaa: 2.48, vs_forwards: 'GOOD', sv_pct: 'ELITE' },
            'CAR': { rank: 3, gaa: 2.55, vs_forwards: 'ELITE', sv_pct: 'GOOD' },
            'DAL': { rank: 4, gaa: 2.62, vs_forwards: 'GOOD', sv_pct: 'GOOD' },
            'NJ': { rank: 5, gaa: 2.69, vs_forwards: 'GOOD', sv_pct: 'GOOD' },
            'NYR': { rank: 6, gaa: 2.76, vs_forwards: 'AVG', sv_pct: 'ELITE' },
            'WPG': { rank: 7, gaa: 2.83, vs_forwards: 'AVG', sv_pct: 'GOOD' },
            'COL': { rank: 8, gaa: 2.90, vs_forwards: 'AVG', sv_pct: 'AVG' },
            'FLA': { rank: 9, gaa: 2.97, vs_forwards: 'AVG', sv_pct: 'AVG' },
            'LAK': { rank: 10, gaa: 3.04, vs_forwards: 'AVG', sv_pct: 'AVG' },
            'EDM': { rank: 11, gaa: 3.11, vs_forwards: 'WEAK', sv_pct: 'AVG' },
            'TOR': { rank: 12, gaa: 3.18, vs_forwards: 'WEAK', sv_pct: 'AVG' },
            'MIN': { rank: 13, gaa: 3.25, vs_forwards: 'AVG', sv_pct: 'WEAK' },
            'TB': { rank: 14, gaa: 3.32, vs_forwards: 'WEAK', sv_pct: 'AVG' },
            'VAN': { rank: 15, gaa: 3.39, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'SEA': { rank: 16, gaa: 3.46, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'NSH': { rank: 17, gaa: 3.53, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'OTT': { rank: 18, gaa: 3.60, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'STL': { rank: 19, gaa: 3.67, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'BUF': { rank: 20, gaa: 3.74, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'NYI': { rank: 21, gaa: 3.81, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'DET': { rank: 22, gaa: 3.88, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'PHI': { rank: 23, gaa: 3.95, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'CGY': { rank: 24, gaa: 4.02, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'ARI': { rank: 25, gaa: 4.09, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'CHI': { rank: 26, gaa: 4.16, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'PIT': { rank: 27, gaa: 4.23, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'ANA': { rank: 28, gaa: 4.30, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'MTL': { rank: 29, gaa: 4.37, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'CBJ': { rank: 30, gaa: 4.44, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'SJ': { rank: 31, gaa: 4.51, vs_forwards: 'WEAK', sv_pct: 'WEAK' },
            'UTA': { rank: 32, gaa: 4.58, vs_forwards: 'WEAK', sv_pct: 'WEAK' }
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // OFFENSE RANKINGS (Team Pace & Scoring - NEW!)
    // ═══════════════════════════════════════════════════════════════════════════
    const OFFENSE_RANKINGS = {
        // NBA Offense (pace = possessions per game, higher = more opportunities)
        nba: {
            'IND': { rank: 1, pace: 103.5, oRating: 118.2, trend: 'HOT' },
            'ATL': { rank: 2, pace: 102.8, oRating: 117.5, trend: 'HOT' },
            'MIL': { rank: 3, pace: 102.2, oRating: 117.0, trend: 'STABLE' },
            'SAC': { rank: 4, pace: 101.5, oRating: 116.5, trend: 'STABLE' },
            'BOS': { rank: 5, pace: 100.9, oRating: 119.5, trend: 'HOT' },
            'OKC': { rank: 6, pace: 100.3, oRating: 118.8, trend: 'HOT' },
            'DAL': { rank: 7, pace: 99.8, oRating: 117.2, trend: 'STABLE' },
            'PHX': { rank: 8, pace: 99.2, oRating: 116.8, trend: 'STABLE' },
            'DEN': { rank: 9, pace: 98.7, oRating: 117.5, trend: 'STABLE' },
            'LAL': { rank: 10, pace: 98.1, oRating: 115.2, trend: 'COLD' },
            'NOP': { rank: 11, pace: 97.6, oRating: 114.8, trend: 'COLD' },
            'GSW': { rank: 12, pace: 97.0, oRating: 114.5, trend: 'STABLE' },
            'TOR': { rank: 13, pace: 96.5, oRating: 113.8, trend: 'STABLE' },
            'CHA': { rank: 14, pace: 96.0, oRating: 112.5, trend: 'COLD' },
            'POR': { rank: 15, pace: 95.5, oRating: 112.0, trend: 'COLD' },
            'CHI': { rank: 16, pace: 95.0, oRating: 111.5, trend: 'COLD' },
            'SAS': { rank: 17, pace: 94.5, oRating: 111.0, trend: 'COLD' },
            'WAS': { rank: 18, pace: 94.0, oRating: 110.5, trend: 'COLD' },
            'DET': { rank: 19, pace: 93.5, oRating: 110.0, trend: 'COLD' },
            'UTA': { rank: 20, pace: 93.0, oRating: 109.5, trend: 'COLD' },
            'BKN': { rank: 21, pace: 92.5, oRating: 109.0, trend: 'COLD' },
            'MIA': { rank: 22, pace: 92.0, oRating: 112.0, trend: 'STABLE' },
            'PHI': { rank: 23, pace: 91.5, oRating: 111.5, trend: 'COLD' },
            'MIN': { rank: 24, pace: 91.0, oRating: 113.0, trend: 'STABLE' },
            'LAC': { rank: 25, pace: 90.5, oRating: 114.0, trend: 'STABLE' },
            'CLE': { rank: 26, pace: 90.0, oRating: 116.0, trend: 'STABLE' },
            'HOU': { rank: 27, pace: 89.5, oRating: 112.5, trend: 'STABLE' },
            'NYK': { rank: 28, pace: 89.0, oRating: 115.5, trend: 'STABLE' },
            'ORL': { rank: 29, pace: 88.5, oRating: 111.0, trend: 'STABLE' },
            'MEM': { rank: 30, pace: 88.0, oRating: 110.5, trend: 'COLD' }
        },
        
        // NFL Offense
        nfl: {
            'KC': { rank: 1, ppg: 28.5, pass_rank: 2, rush_rank: 8, trend: 'HOT' },
            'DET': { rank: 2, ppg: 27.8, pass_rank: 3, rush_rank: 5, trend: 'HOT' },
            'MIA': { rank: 3, ppg: 27.2, pass_rank: 1, rush_rank: 15, trend: 'HOT' },
            'SF': { rank: 4, ppg: 26.5, pass_rank: 8, rush_rank: 1, trend: 'STABLE' },
            'DAL': { rank: 5, ppg: 26.0, pass_rank: 4, rush_rank: 12, trend: 'STABLE' },
            'BUF': { rank: 6, ppg: 25.5, pass_rank: 5, rush_rank: 10, trend: 'STABLE' },
            'PHI': { rank: 7, ppg: 25.0, pass_rank: 10, rush_rank: 2, trend: 'STABLE' },
            'JAX': { rank: 8, ppg: 24.5, pass_rank: 6, rush_rank: 7, trend: 'STABLE' },
            'CIN': { rank: 9, ppg: 24.0, pass_rank: 7, rush_rank: 18, trend: 'COLD' },
            'LAR': { rank: 10, ppg: 23.5, pass_rank: 9, rush_rank: 14, trend: 'STABLE' },
            'TB': { rank: 11, ppg: 23.0, pass_rank: 11, rush_rank: 20, trend: 'COLD' },
            'SEA': { rank: 12, ppg: 22.5, pass_rank: 12, rush_rank: 9, trend: 'STABLE' },
            'BAL': { rank: 13, ppg: 22.0, pass_rank: 20, rush_rank: 3, trend: 'STABLE' },
            'GB': { rank: 14, ppg: 21.5, pass_rank: 15, rush_rank: 11, trend: 'STABLE' },
            'HOU': { rank: 15, ppg: 21.0, pass_rank: 14, rush_rank: 16, trend: 'STABLE' },
            'IND': { rank: 16, ppg: 20.5, pass_rank: 18, rush_rank: 6, trend: 'COLD' }
            // ... more teams
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY: Sport Detection from Input
    // ═══════════════════════════════════════════════════════════════════════════
    function detectSport(params) {
        // If sport explicitly provided
        if (params.sport) {
            return params.sport.toLowerCase();
        }
        
        // Detect from market type
        const market = (params.market || '').toLowerCase();
        if (market.includes('passing') || market.includes('rushing') || market.includes('receiving') || market.includes('touchdown')) {
            return 'nfl';
        }
        if (market.includes('strikeout') || market.includes('hits') || market.includes('rbi') || market.includes('total_bases') || market.includes('pitcher')) {
            return 'mlb';
        }
        if (market.includes('goals') || market.includes('saves') || market.includes('shots')) {
            // Could be NHL or Soccer - check opponent
            const opp = (params.opponent || '').toUpperCase();
            if (DEFENSE_RANKINGS.nhl[opp]) return 'nhl';
            if (DEFENSE_RANKINGS.nba[opp]) return 'nba'; // Could be NBA threes
            return 'nhl'; // Default to NHL for goals
        }
        
        // Detect from opponent team abbreviation
        const opp = (params.opponent || '').toUpperCase();
        if (DEFENSE_RANKINGS.nba[opp]) return 'nba';
        if (DEFENSE_RANKINGS.nfl[opp]) return 'nfl';
        if (DEFENSE_RANKINGS.mlb[opp]) return 'mlb';
        if (DEFENSE_RANKINGS.nhl[opp]) return 'nhl';
        
        // Default to NBA
        return 'nba';
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY: Get stat key for market
    // ═══════════════════════════════════════════════════════════════════════════
    function getStatKey(market) {
        const config = MARKET_CONFIG[market];
        if (config) {
            return config.stat;
        }
        // Fallback mapping
        if (market.includes('point')) return 'pts';
        if (market.includes('rebound')) return 'reb';
        if (market.includes('assist')) return 'ast';
        if (market.includes('three')) return 'fg3m';
        return 'pts';
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INJURY DETECTION (unchanged from V3.6)
    // ═══════════════════════════════════════════════════════════════════════════
    function detectInjury(text, playerName) {
        if (!text) return null;
        const lower = text.toLowerCase();
        const playerLower = playerName.toLowerCase();
        const lastName = playerName.split(' ').pop().toLowerCase();
        
        const mentionsPlayer = lower.includes(playerLower) || lower.includes(lastName);
        if (!mentionsPlayer) return null;
        
        const negativePatterns = [
            'not injured', 'not out', 'is not out', 'not questionable', 'not doubtful',
            'no injury', 'fully available', 'fully healthy', 'available to play',
            'expected to play', 'will play', 'is playing', 'is active', 'cleared to play',
            'not on injury', 'not listed', 'healthy', 'good to go', 'green light',
            'no concerns', 'full participant', 'not ruled out', 'should play'
        ];
        
        for (const pattern of negativePatterns) {
            if (lower.includes(pattern)) return null;
        }
        
        const positivePatterns = [
            { pattern: 'is out', severity: 'OUT' },
            { pattern: 'ruled out', severity: 'OUT' },
            { pattern: 'will miss', severity: 'OUT' },
            { pattern: 'will not play', severity: 'OUT' },
            { pattern: 'sidelined', severity: 'OUT' },
            { pattern: 'is questionable', severity: 'QUESTIONABLE' },
            { pattern: 'is doubtful', severity: 'DOUBTFUL' },
            { pattern: 'day-to-day', severity: 'QUESTIONABLE' },
            { pattern: 'game-time decision', severity: 'QUESTIONABLE' }
        ];
        
        for (const { pattern, severity } of positivePatterns) {
            if (lower.includes(pattern)) {
                return { detected: true, keyword: pattern, severity };
            }
        }
        
        return null;
    }

    function aggregateInjuryStatus(results, playerName) {
        const injuries = [];
        const sources = [];
        
        for (const [engine, result] of Object.entries(results)) {
            if (result.reasoning) {
                const injury = detectInjury(result.reasoning, playerName);
                if (injury) {
                    injuries.push({ engine, ...injury });
                    sources.push(engine);
                }
            }
        }
        
        if (injuries.length === 0) {
            return { status: 'ACTIVE', injuries: [], shouldOverride: false, sources: [] };
        }
        
        const hasOut = injuries.some(i => i.severity === 'OUT');
        const hasDoubtful = injuries.some(i => i.severity === 'DOUBTFUL');
        const hasQuestionable = injuries.some(i => i.severity === 'QUESTIONABLE');
        
        let status = 'ACTIVE';
        let shouldOverride = false;
        
        if (hasOut && injuries.filter(i => i.severity === 'OUT').length >= 2) {
            status = 'OUT';
            shouldOverride = true;
        } else if (hasOut) {
            status = 'LIKELY OUT';
            shouldOverride = true;
        } else if (hasDoubtful && injuries.length >= 2) {
            status = 'DOUBTFUL';
            shouldOverride = true;
        } else if (hasQuestionable) {
            status = 'QUESTIONABLE';
            shouldOverride = false;
        }
        
        return { status, injuries, shouldOverride, sources };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA: Universal Stats Fetcher (ESPN API for all sports)
    // ═══════════════════════════════════════════════════════════════════════════
    async function getPlayerStats(player, sport = 'nba', market = 'player_points') {
        const sportConfig = SPORT_CONFIG[sport] || SPORT_CONFIG.nba;
        const statKey = getStatKey(market);
        
        // Try BallDontLie first for NBA (more detailed)
        if (sport === 'nba' && BDL_KEY) {
            try {
                const bdlStats = await getBDLStats(player, statKey);
                if (bdlStats) return bdlStats;
            } catch(e) { console.log('[V4] BDL fallback to ESPN'); }
        }
        
        // Use ESPN API for all sports
        try {
            return await getESPNStats(player, sport, statKey, market);
        } catch(e) {
            console.log(`[V4] ESPN stats error: ${e.message}`);
            return null;
        }
    }

    async function getBDLStats(player, statKey = 'pts') {
        if (!BDL_KEY) return null;
        try {
            const firstName = player.split(' ')[0];
            const searchRes = await fetch(`https://api.balldontlie.io/nba/v1/players?search=${encodeURIComponent(firstName)}&per_page=10`, { headers: { 'Authorization': BDL_KEY } });
            if (!searchRes.ok) return null;
            const searchData = await searchRes.json();
            const playerLower = player.toLowerCase();
            let p = searchData.data?.find(x => `${x.first_name} ${x.last_name}`.toLowerCase() === playerLower) || searchData.data?.[0];
            if (!p) return null;
            
            const statsRes = await fetch(`https://api.balldontlie.io/nba/v1/stats?player_ids[]=${p.id}&per_page=15&sort=-game.date`, { headers: { 'Authorization': BDL_KEY } });
            if (!statsRes.ok) return null;
            const statsData = await statsRes.json();
            const games = statsData.data || [];
            if (!games.length) return null;
            
            const avg = (arr, k) => arr.length ? (arr.reduce((s,g) => s + (g[k]||0), 0) / arr.length).toFixed(1) : '0';
            const l5 = games.slice(0,5), l10 = games.slice(0,10);
            
            const position = p.position || 'G';
            const positionType = position.includes('G') ? 'guard' : position.includes('F') ? 'forward' : 'center';
            
            // Get all relevant stats
            const getStats = (arr) => ({
                pts: avg(arr, 'pts'),
                reb: avg(arr, 'reb'),
                ast: avg(arr, 'ast'),
                fg3m: avg(arr, 'fg3m'),
                stl: avg(arr, 'stl'),
                blk: avg(arr, 'blk'),
                min: avg(arr, 'min'),
                pra: (parseFloat(avg(arr, 'pts')) + parseFloat(avg(arr, 'reb')) + parseFloat(avg(arr, 'ast'))).toFixed(1)
            });
            
            return {
                name: `${p.first_name} ${p.last_name}`,
                team: p.team?.abbreviation || 'N/A',
                position, positionType,
                sport: 'nba',
                l5: getStats(l5),
                l10: getStats(l10),
                season: getStats(games),
                recentGames: games.slice(0,5).map(g => ({ 
                    pts: g.pts, reb: g.reb, ast: g.ast, fg3m: g.fg3m,
                    pra: (g.pts||0) + (g.reb||0) + (g.ast||0),
                    min: g.min 
                })),
                gamesPlayed: games.length,
                statKey
            };
        } catch(e) { return null; }
    }

    async function getESPNStats(player, sport, statKey, market) {
        // ESPN doesn't have a public stats API, so we'll use the proxy's search capability
        try {
            const res = await fetch(`${PROXY}/api/ai/perplexity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Get ${player}'s last 5 game stats for ${MARKET_CONFIG[market]?.display || market} in ${SPORT_CONFIG[sport]?.name || sport}. Return ONLY JSON: {"l5_avg": number, "l10_avg": number, "season_avg": number, "last5_values": [numbers], "games_played": number}`,
                    maxTokens: 300
                })
            });
            const data = await res.json();
            let raw = data.result?.raw || data.raw || '';
            
            // Parse JSON from response
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) {
                const stats = JSON.parse(match[0]);
                return {
                    name: player,
                    sport,
                    l5: { [statKey]: stats.l5_avg?.toString() || '0' },
                    l10: { [statKey]: stats.l10_avg?.toString() || '0' },
                    season: { [statKey]: stats.season_avg?.toString() || '0' },
                    recentGames: (stats.last5_values || []).map(v => ({ [statKey]: v })),
                    gamesPlayed: stats.games_played || 5,
                    statKey
                };
            }
        } catch(e) { console.log(`[V4] ESPN fallback error: ${e.message}`); }
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA: Opponent Defense/Offense Stats
    // ═══════════════════════════════════════════════════════════════════════════
    async function getOpponentDefense(opponent, sport = 'nba', market = 'player_points', playerPosition = null) {
        const sportDefense = DEFENSE_RANKINGS[sport];
        if (!sportDefense) return { found: false, opponent };
        
        const oppUpper = (opponent || '').toUpperCase();
        const defense = sportDefense[oppUpper];
        
        if (!defense) return { found: false, opponent: oppUpper };
        
        const totalTeams = Object.keys(sportDefense).length;
        const isTopDefense = defense.rank <= Math.floor(totalTeams * 0.33);
        const isWeakDefense = defense.rank >= Math.floor(totalTeams * 0.67);
        
        // Determine position-specific impact
        let positionImpact = 'AVG';
        if (sport === 'nba' && playerPosition) {
            const posKey = playerPosition === 'guard' ? 'vs_guards' : playerPosition === 'forward' ? 'vs_forwards' : 'vs_centers';
            positionImpact = defense[posKey] || 'AVG';
        } else if (sport === 'nfl') {
            const isPassMarket = market.includes('passing') || market.includes('receiving');
            positionImpact = isPassMarket ? defense.vs_pass : defense.vs_rush;
        } else if (sport === 'mlb') {
            positionImpact = defense.k_rate || 'AVG';
        } else if (sport === 'nhl') {
            positionImpact = defense.vs_forwards || 'AVG';
        }
        
        // Calculate adjustment
        let adjustment = 0;
        if (positionImpact === 'ELITE') adjustment = -0.05;
        else if (positionImpact === 'GOOD') adjustment = -0.02;
        else if (positionImpact === 'WEAK') adjustment = 0.05;
        
        if (isTopDefense) adjustment -= 0.03;
        if (isWeakDefense) adjustment += 0.03;
        
        return {
            found: true,
            sport,
            opponent: oppUpper,
            rank: defense.rank,
            rating: defense.rating || defense.era || defense.gaa || defense.ppg,
            tier: isTopDefense ? 'ELITE' : isWeakDefense ? 'WEAK' : 'AVERAGE',
            positionImpact,
            adjustment,
            impact: adjustment > 0.02 ? 'FAVORABLE' : adjustment < -0.02 ? 'UNFAVORABLE' : 'NEUTRAL',
            details: defense
        };
    }

    async function getTeamOffense(team, sport = 'nba') {
        const sportOffense = OFFENSE_RANKINGS[sport];
        if (!sportOffense) return { found: false };
        
        const teamUpper = (team || '').toUpperCase();
        const offense = sportOffense[teamUpper];
        
        if (!offense) return { found: false, team: teamUpper };
        
        return {
            found: true,
            sport,
            team: teamUpper,
            rank: offense.rank,
            pace: offense.pace,
            oRating: offense.oRating,
            ppg: offense.ppg,
            trend: offense.trend,
            impact: offense.trend === 'HOT' ? 'BOOST' : offense.trend === 'COLD' ? 'CONCERN' : 'NEUTRAL'
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA: Sport-Specific Reddit Sentiment
    // ═══════════════════════════════════════════════════════════════════════════
    async function getRedditSentiment(player, sport = 'nba') {
        const sportConfig = SPORT_CONFIG[sport] || SPORT_CONFIG.nba;
        const subreddits = sportConfig.subreddits || ['sportsbook'];
        
        try {
            // Call proxy with sport-specific subreddits
            const res = await fetch(`${PROXY}/api/reddit/sentiment?player=${encodeURIComponent(player)}&sport=${sport}&subreddits=${subreddits.join(',')}`);
            if (!res.ok) return { available: false };
            const data = await res.json();
            return {
                available: data.mentions > 0,
                mentions: data.mentions || 0,
                sentiment: data.sentiment || { label: 'NEUTRAL', score: 0 },
                keywords: data.keywords || {},
                samples: data.samples || [],
                subreddits: data.subreddits || subreddits,
                sport
            };
        } catch(e) {
            return { available: false, error: e.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA: Twitter Sentiment (unchanged)
    // ═══════════════════════════════════════════════════════════════════════════
    async function getTwitterSentiment(player, sport = 'nba', market = 'player_points') {
        try {
            const sportConfig = SPORT_CONFIG[sport] || SPORT_CONFIG.nba;
            const marketConfig = MARKET_CONFIG[market] || {};
            const res = await fetch(`${PROXY}/api/twitter/sentiment?player=${encodeURIComponent(player)}&sport=${sport}&market=${marketConfig.display || market}`);
            if (!res.ok) {
                return { available: false, message: 'Twitter API not available' };
            }
            const data = await res.json();
            return {
                available: true,
                sentiment: data.sentiment || { label: 'NEUTRAL', score: 0 },
                summary: data.summary || '',
                tweetCount: data.tweetCount || 0,
                sport
            };
        } catch(e) {
            return { available: false, error: e.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA: SGO Odds (unchanged but with sport support)
    // ═══════════════════════════════════════════════════════════════════════════
    async function getSGOData(player, opponent, sport = 'nba', market = 'player_points') {
        if (!SGO_KEY) return { found: false };
        const sportConfig = SPORT_CONFIG[sport] || SPORT_CONFIG.nba;
        const leagueID = sportConfig.league || 'NBA';
        
        try {
            const res = await fetch(`https://api.sportsgameodds.com/v2/events?leagueID=${leagueID}&oddsAvailable=true&limit=50`, {
                headers: { 'x-api-key': SGO_KEY }
            });
            if (!res.ok) return { found: false };
            const data = await res.json();
            
            const oppLower = (opponent || '').toLowerCase();
            const game = data.data?.find(e => {
                const home = (e.teams?.home?.names?.short || '').toLowerCase();
                const away = (e.teams?.away?.names?.short || '').toLowerCase();
                return home === oppLower || away === oppLower || 
                       home.includes(oppLower) || away.includes(oppLower);
            });
            
            if (!game) return { found: false };
            
            const lastName = player.split(' ').pop()?.toUpperCase();
            const playerProps = {};
            const marketConfig = MARKET_CONFIG[market] || {};
            const marketKey = marketConfig.display?.toLowerCase().replace(/\s/g, '') || 'points';
            
            for (const [key, val] of Object.entries(game.odds || {})) {
                if (key.includes(lastName)) {
                    const propMarket = key.includes('points') ? 'points' : 
                                       key.includes('assists') ? 'assists' : 
                                       key.includes('rebounds') ? 'rebounds' :
                                       key.includes('yards') ? 'yards' :
                                       key.includes('strikeout') ? 'strikeouts' :
                                       key.includes('goals') ? 'goals' : null;
                    if (propMarket && key.includes('over') && !playerProps[propMarket]) {
                        playerProps[propMarket] = {
                            line: parseFloat(val.bookOverUnder) || null,
                            bookOdds: val.bookOdds,
                            fairOdds: val.fairOdds,
                            books: Object.keys(val.byBookmaker || {}).length
                        };
                    }
                }
            }
            
            const relevantProp = playerProps[marketKey] || playerProps.points || Object.values(playerProps)[0];
            let edge = null;
            if (relevantProp?.bookOdds && relevantProp?.fairOdds) {
                const bookProb = oddsToProb(relevantProp.bookOdds);
                const fairProb = oddsToProb(relevantProp.fairOdds);
                edge = ((fairProb - bookProb) * 100).toFixed(1);
            }
            
            return {
                found: true,
                sport,
                homeTeam: game.teams?.home?.names?.short,
                awayTeam: game.teams?.away?.names?.short,
                totalMarkets: Object.keys(game.odds || {}).length,
                playerProps,
                relevantProp,
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
    // DATA: Hit Rate Calculator (market-aware)
    // ═══════════════════════════════════════════════════════════════════════════
    function calculateHitRate(stats, line, market = 'player_points') {
        if (!stats?.recentGames?.length) return null;
        
        const statKey = getStatKey(market);
        const marketConfig = MARKET_CONFIG[market] || {};
        
        // Handle combined stats like PRA
        let values;
        if (marketConfig.combined && Array.isArray(statKey)) {
            values = stats.recentGames.map(g => statKey.reduce((sum, k) => sum + (g[k] || 0), 0));
        } else {
            const key = typeof statKey === 'string' ? statKey : 'pts';
            values = stats.recentGames.map(g => g[key] || 0);
        }
        
        const hits = values.filter(v => v > line).length;
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
            hits, total: values.length, 
            rate: Math.round((hits/values.length)*100), 
            detail: `${hits}/${values.length} OVER ${line}`, 
            trend: hits >= 4 ? 'HOT 🔥' : hits <= 1 ? 'COLD ❄️' : 'MIXED',
            values, avg: avg.toFixed(1), stdDev: stdDev.toFixed(1),
            zScore: (stdDev > 0 ? (line - avg) / stdDev : 0).toFixed(2),
            margin: margin.toFixed(1),
            streak: `${streak} ${lastResult}`,
            statKey: typeof statKey === 'string' ? statKey : 'combined'
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LINE MOVEMENT TRACKER (unchanged)
    // ═══════════════════════════════════════════════════════════════════════════
    function getLineMovement(player, market, currentLine) {
        const key = `${player}_${market}`.replace(/\s/g, '_');
        const now = Date.now();
        let history = [];
        
        try {
            const stored = localStorage.getItem(`sba_line_${key}`);
            if (stored) history = JSON.parse(stored);
        } catch(e) {}
        
        return {
            history,
            addLine: (line, bookOdds) => {
                history.push({ timestamp: now, line, bookOdds });
                if (history.length > 20) history = history.slice(-20);
                try { localStorage.setItem(`sba_line_${key}`, JSON.stringify(history)); } catch(e) {}
            },
            getMovement: () => {
                if (history.length < 2) return null;
                const recent = history.slice(-5);
                const oldest = recent[0];
                const newest = recent[recent.length - 1];
                const lineDiff = newest.line - oldest.line;
                const timeDiff = (newest.timestamp - oldest.timestamp) / (1000 * 60 * 60);
                
                return {
                    direction: lineDiff > 0 ? 'UP' : lineDiff < 0 ? 'DOWN' : 'STABLE',
                    change: lineDiff,
                    hours: timeDiff.toFixed(1),
                    sharpIndicator: Math.abs(lineDiff) >= 1 ? 'SHARP MOVE' : Math.abs(lineDiff) >= 0.5 ? 'MODERATE' : 'MINIMAL',
                    interpretation: lineDiff > 0.5 ? 'Sharp money likely on OVER' : lineDiff < -0.5 ? 'Sharp money likely on UNDER' : 'No significant sharp action detected'
                };
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AI ENGINE CALLER (unchanged structure, market-aware prompts)
    // ═══════════════════════════════════════════════════════════════════════════
    async function callEngine(engineId, params, stats, hitRate, sgoData, defenseData, offenseData, sport, market) {
        const prompt = buildPrompt(params, stats, hitRate, sgoData, defenseData, offenseData, engineId, sport, market);
        
        try {
            const res = await fetch(`${PROXY}/api/ai/${engineId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, maxTokens: 600 })
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            return parseAIResponse(data, engineId);
        } catch(e) {
            return { pick: 'PASS', confidence: 50, trueProb: 0.5, reasoning: `Error: ${e.message}`, error: true };
        }
    }

    function buildPrompt(params, stats, hitRate, sgoData, defenseData, offenseData, engineId, sport, market) {
        const sportConfig = SPORT_CONFIG[sport] || SPORT_CONFIG.nba;
        const marketConfig = MARKET_CONFIG[market] || {};
        const statKey = getStatKey(market);
        const statDisplay = marketConfig.display || market;
        
        // Get the right stat values
        const getStatVal = (obj, key) => {
            if (Array.isArray(key)) {
                return key.reduce((sum, k) => sum + parseFloat(obj?.[k] || 0), 0).toFixed(1);
            }
            return obj?.[key] || obj?.pts || 'N/A';
        };
        
        const statsText = stats ? 
            `L5=${getStatVal(stats.l5, statKey)} | L10=${getStatVal(stats.l10, statKey)} | Season=${getStatVal(stats.season, statKey)}. Recent: ${hitRate?.values?.join(', ') || 'N/A'}` : 
            'Stats unavailable';
        
        const hitText = hitRate ? `Hit Rate: ${hitRate.rate}% (${hitRate.detail}) ${hitRate.trend}. Margin: ${hitRate.margin > 0 ? '+' : ''}${hitRate.margin}` : '';
        
        const sgoText = sgoData?.found && sgoData.relevantProp ? 
            `Vegas: Line=${sgoData.relevantProp.line}, Book=${sgoData.relevantProp.bookOdds}, Fair=${sgoData.relevantProp.fairOdds}, Edge=${sgoData.edge}%` : '';
        
        const defenseText = defenseData?.found ? 
            `Opponent Defense: ${defenseData.opponent} ranked #${defenseData.rank} (${defenseData.tier}). Impact: ${defenseData.impact}` : '';
        
        const offenseText = offenseData?.found ?
            `Team Offense: #${offenseData.rank} pace, ${offenseData.trend} trend. ${sport === 'nba' ? `Pace: ${offenseData.pace}` : `PPG: ${offenseData.ppg}`}` : '';

        const task = getEnginePrompt(engineId, market, sport);

        return `${sportConfig.name} PROP: ${params.player} ${statDisplay} OVER/UNDER ${params.line} vs ${params.opponent}

${statsText}
${hitText}
${sgoText}
${defenseText}
${offenseText}

${task}

CRITICAL: 
1. Give SPECIFIC analysis with ACTUAL NUMBERS for ${statDisplay}. Minimum 20 words.
2. If player is INJURED, OUT, or QUESTIONABLE - MENTION THIS CLEARLY and recommend PASS.

Return ONLY JSON:
{"pick":"OVER or UNDER or PASS","confidence":50-95,"trueProb":0.40-0.65,"reasoning":"Your specific analysis with numbers","keyFactor":"most important factor","risk":"biggest risk"}`;
    }

    function parseAIResponse(data, engineId) {
        try {
            let r = data.result?.raw || data.result || data;
            if (typeof r === 'string') {
                r = r.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
                const m = r.match(/\{[\s\S]*\}/);
                if (m) r = JSON.parse(m[0]);
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
            return { pick: 'PASS', confidence: 50, trueProb: 0.5, reasoning: 'Parse error', error: true };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AI COLLECTIVE (unchanged)
    // ═══════════════════════════════════════════════════════════════════════════
    function calculateAICollective(results) {
        let overScore = 0, underScore = 0, passScore = 0;
        let overEngines = [], underEngines = [], passEngines = [];
        let totalWeight = 0;
        let probSum = 0, probCount = 0;
        
        for (const [engine, result] of Object.entries(results)) {
            if (result.error) continue;
            const w = weights[engine] || 0.05;
            totalWeight += w;
            
            if (result.pick === 'OVER') {
                overScore += w;
                overEngines.push(engine);
            } else if (result.pick === 'UNDER') {
                underScore += w;
                underEngines.push(engine);
            } else {
                passScore += w;
                passEngines.push(engine);
            }
            
            if (result.trueProb && result.pick !== 'PASS') {
                probSum += result.trueProb * w;
                probCount += w;
            }
        }
        
        const direction = overScore > underScore ? 'OVER' : underScore > overScore ? 'UNDER' : 'PASS';
        const majorityPct = Math.round((Math.max(overScore, underScore) / totalWeight) * 100);
        const trueProb = probCount > 0 ? probSum / probCount : 0.5;
        
        let agreement = 'WEAK';
        if (majorityPct >= 90) agreement = 'STRONG';
        else if (majorityPct >= 75) agreement = 'MODERATE';
        
        return {
            direction,
            overScore: (overScore / totalWeight * 100).toFixed(0),
            underScore: (underScore / totalWeight * 100).toFixed(0),
            confidence: majorityPct,
            agreement,
            trueProb,
            overEngines,
            underEngines,
            passEngines
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MASTER SYNTHESIS (Sport/Market Aware)
    // ═══════════════════════════════════════════════════════════════════════════
    async function masterSynthesis(params, stats, hitRate, sgoData, defenseData, offenseData, results, aiCollective, injuryStatus, sport, market) {
        const sportConfig = SPORT_CONFIG[sport] || SPORT_CONFIG.nba;
        const marketConfig = MARKET_CONFIG[market] || {};
        const statKey = getStatKey(market);
        
        // Base probability from AI collective
        let finalProb = aiCollective.trueProb;
        let confidence = aiCollective.confidence;
        let adjustments = [];
        
        // Defense adjustment
        const defenseAdj = defenseData?.adjustment || 0;
        if (defenseAdj !== 0) {
            finalProb = Math.max(0.25, Math.min(0.75, finalProb + defenseAdj));
            adjustments.push(`Defense ${defenseAdj > 0 ? '+' : ''}${(defenseAdj * 100).toFixed(0)}%`);
        }
        
        // Offense/Pace adjustment (for NBA)
        if (offenseData?.found && sport === 'nba') {
            const paceAdj = offenseData.trend === 'HOT' ? 0.02 : offenseData.trend === 'COLD' ? -0.02 : 0;
            if (paceAdj !== 0) {
                finalProb = Math.max(0.25, Math.min(0.75, finalProb + paceAdj));
                adjustments.push(`Pace ${paceAdj > 0 ? '+' : ''}${(paceAdj * 100).toFixed(0)}%`);
            }
        }
        
        // Hit rate adjustment
        if (hitRate?.rate >= 80) {
            finalProb = Math.min(0.75, finalProb + 0.03);
            adjustments.push('Hot streak +3%');
        } else if (hitRate?.rate <= 20) {
            finalProb = Math.max(0.25, finalProb - 0.03);
            adjustments.push('Cold streak -3%');
        }
        
        // Injury override
        let injuryOverride = false;
        if (injuryStatus.shouldOverride) {
            injuryOverride = true;
            confidence = 0;
        }
        
        return {
            finalPick: injuryOverride ? 'PASS' : aiCollective.direction,
            finalProb: Math.round(finalProb * 1000) / 1000,
            confidence,
            adjustments,
            injuryOverride,
            sport,
            market,
            statDisplay: marketConfig.display || market
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COACH K - Vegas Integration Rules (Sport/Market Aware)
    // ═══════════════════════════════════════════════════════════════════════════
    async function coachK(params, master, stats, hitRate, aiCollective, sgoData, defenseData, offenseData, lineMovement, injuryStatus, redditData, sport, market) {
        const sportConfig = SPORT_CONFIG[sport] || SPORT_CONFIG.nba;
        const marketConfig = MARKET_CONFIG[market] || {};
        const statKey = getStatKey(market);
        
        // Force PASS if injury override
        if (master.injuryOverride || injuryStatus.shouldOverride) {
            return {
                verdict: 'NO BET - INJURY',
                unitSizing: '0',
                plainLanguage: `🚫 DO NOT BET. ${params.player} is reported as ${injuryStatus.status}. Never bet on questionable injury situations.`,
                expertLanguage: `Hard pass due to ${injuryStatus.status} status. Risk of DNP creates undefined EV.`,
                keyInsight: `Player status: ${injuryStatus.status}`,
                warnings: ['Player may not play', 'Minutes could be limited'],
                kellyFraction: 0, kellyUnits: 0, edge: 0,
                hasValue: false, vegasDisagrees: false, injuryOverride: true,
                vegasVerdict: { action: 'NO_BET', reason: 'Injury' }
            };
        }
        
        // Calculate Kelly Criterion
        const trueProb = master.finalProb;
        const impliedProb = sgoData?.relevantProp?.bookOdds ? oddsToProb(sgoData.relevantProp.bookOdds) : 0.52;
        const edge = trueProb - impliedProb;
        const kellyFraction = edge > 0 ? (edge / (1 - impliedProb)).toFixed(3) : 0;
        const kellyUnits = Math.min(2, Math.max(0, (kellyFraction * 10))).toFixed(1);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // VEGAS INTEGRATION RULES
        // ═══════════════════════════════════════════════════════════════════════════
        const sgoEdge = parseFloat(sgoData?.edge || 0);
        const lineContext = lineMovement?.getMovement ? lineMovement.getMovement() : null;
        const lineMoveDirection = lineContext?.direction || 'STABLE';
        const lineMoveAmount = Math.abs(lineContext?.change || 0);
        
        // Reddit sentiment analysis
        const redditScore = redditData?.sentiment?.score || 0;
        const redditMentions = redditData?.mentions || 0;
        const publicHeavy = redditMentions >= 10 && Math.abs(redditScore) >= 60;
        const publicSide = redditScore > 0 ? 'OVER' : redditScore < 0 ? 'UNDER' : 'NEUTRAL';
        
        const ourPick = master.finalPick;
        const aiStrength = aiCollective.agreement;
        
        // Vegas signals
        const vegasSignals = {
            sgoEdge,
            sgoFavors: sgoEdge > 2 ? ourPick : sgoEdge < -2 ? (ourPick === 'OVER' ? 'UNDER' : 'OVER') : 'NEUTRAL',
            lineMoveFavors: lineMoveDirection === 'UP' ? 'OVER' : lineMoveDirection === 'DOWN' ? 'UNDER' : 'NEUTRAL',
            lineMoveSharp: lineMoveAmount >= 1.5
        };
        
        // Vegas Trust Rules
        let vegasVerdict = { action: 'NEUTRAL', confidence: 50, reason: '', adjustment: 0, trustLevel: 'MEDIUM' };
        
        if (sgoEdge > 3 && vegasSignals.lineMoveFavors === ourPick && aiStrength === 'STRONG') {
            vegasVerdict = { action: 'MAX_TRUST', confidence: 90, reason: 'Vegas + AI + Sharps aligned', adjustment: 0.5, trustLevel: 'VERY_HIGH' };
        } else if (sgoEdge > 2) {
            vegasVerdict = { action: 'TRUST_VEGAS', confidence: 75, reason: `+${sgoEdge.toFixed(1)}% SGO edge`, adjustment: 0.25, trustLevel: 'HIGH' };
        } else if (vegasSignals.lineMoveSharp && vegasSignals.lineMoveFavors === ourPick) {
            vegasVerdict = { action: 'TRUST_SHARPS', confidence: 70, reason: `Sharp money signal`, adjustment: 0.25, trustLevel: 'MEDIUM_HIGH' };
        } else if (Math.abs(sgoEdge) <= 2 && lineMoveAmount < 1) {
            vegasVerdict = { action: 'NEUTRAL', confidence: 50, reason: 'No strong edge detected', adjustment: 0, trustLevel: 'MEDIUM' };
        } else if (sgoEdge < -2 && sgoEdge >= -5) {
            vegasVerdict = { action: 'CAUTION', confidence: 40, reason: `${sgoEdge.toFixed(1)}% SGO against`, adjustment: -0.25, trustLevel: 'MEDIUM_LOW' };
        } else if (sgoEdge < -5 && sgoEdge >= -10) {
            vegasVerdict = { action: 'REDUCE_SIZE', confidence: 30, reason: `${sgoEdge.toFixed(1)}% SGO warning`, adjustment: -0.5, trustLevel: 'LOW' };
        } else if (sgoEdge < -10) {
            vegasVerdict = { action: 'CONSIDER_FADE', confidence: 20, reason: `${sgoEdge.toFixed(1)}% SGO strong disagree`, adjustment: -1, trustLevel: 'VERY_LOW' };
        }
        
        // Public fade signals
        let publicFadeSignal = null;
        if (publicHeavy && publicSide !== 'NEUTRAL') {
            if (vegasSignals.lineMoveFavors !== publicSide && vegasSignals.lineMoveSharp) {
                publicFadeSignal = { action: 'FADE_PUBLIC', reason: `Public on ${publicSide}, sharps opposite`, confidence: 75 };
                if (ourPick !== publicSide) vegasVerdict.confidence += 10;
            } else if (vegasSignals.lineMoveFavors === publicSide) {
                publicFadeSignal = { action: 'TRAP_WARNING', reason: `Potential trap game`, confidence: 40 };
                if (ourPick === publicSide) vegasVerdict.adjustment -= 0.25;
            }
        }
        
        // Steam move detection
        if (lineMoveAmount >= 2) {
            if (vegasSignals.lineMoveFavors === ourPick) {
                vegasVerdict = { action: 'STEAM_AGREE', reason: `🔥 STEAM MOVE ${lineMoveAmount}pts our way`, adjustment: 0.5, trustLevel: 'VERY_HIGH' };
            } else {
                vegasVerdict = { action: 'STEAM_AGAINST', reason: `⚠️ STEAM AGAINST ${lineMoveAmount}pts`, adjustment: -1, trustLevel: 'VERY_LOW' };
            }
        }
        
        // Final units calculation
        let baseUnits = parseFloat(kellyUnits) || 1;
        let vegasAdjustedUnits = Math.max(0, Math.min(2, baseUnits + vegasVerdict.adjustment));
        
        if (vegasVerdict.action === 'CONSIDER_FADE' && aiStrength !== 'STRONG') {
            vegasAdjustedUnits = 0;
            vegasVerdict.finalAction = 'PASS';
        }
        
        // Determine verdict
        const hasValue = edge > 0.02;
        const vegasDisagrees = sgoEdge < -2;
        
        let verdict, unitSizing;
        if (vegasAdjustedUnits === 0 || !hasValue) {
            verdict = 'NO BET';
            unitSizing = '0';
        } else if (vegasAdjustedUnits >= 1.5 && hasValue && !vegasDisagrees) {
            verdict = 'STRONG BET';
            unitSizing = vegasAdjustedUnits.toFixed(1);
        } else if (vegasAdjustedUnits >= 1 && hasValue) {
            verdict = 'MODERATE BET';
            unitSizing = vegasAdjustedUnits.toFixed(1);
        } else {
            verdict = 'SMALL BET';
            unitSizing = vegasAdjustedUnits.toFixed(1);
        }
        
        // Get stat-specific values for display
        const getStatVal = (obj, key) => {
            if (!obj) return 'N/A';
            if (Array.isArray(key)) return key.reduce((sum, k) => sum + parseFloat(obj[k] || 0), 0).toFixed(1);
            return obj[key] || obj.pts || 'N/A';
        };
        
        const statDisplay = marketConfig.display || market;
        const l5Val = getStatVal(stats?.l5, statKey);
        const marginVal = hitRate?.margin || 'N/A';
        
        return {
            verdict,
            unitSizing,
            plainLanguage: `${params.player}'s recent ${statDisplay} average of ${l5Val} ${parseFloat(marginVal) > 0 ? 'exceeds' : 'falls below'} the ${params.line} line. ${vegasVerdict.reason}`,
            expertLanguage: `Edge: ${(edge * 100).toFixed(1)}% | Kelly: ${kellyFraction} | Vegas: ${vegasVerdict.action}`,
            keyInsight: `${statDisplay}: L5 avg ${l5Val} vs line ${params.line}`,
            warnings: defenseData?.tier === 'ELITE' ? [`Elite ${sportConfig.name} defense`] : [],
            kellyFraction: parseFloat(kellyFraction),
            kellyUnits: parseFloat(kellyUnits),
            edge: (edge * 100).toFixed(1),
            impliedProb,
            hasValue,
            vegasDisagrees,
            vegasVerdict: {
                ...vegasVerdict,
                sgoEdge: `${sgoEdge > 0 ? '+' : ''}${sgoEdge.toFixed(1)}%`,
                lineMove: lineContext ? `${lineMoveDirection} ${lineMoveAmount}pts` : 'STABLE',
                finalUnits: vegasAdjustedUnits.toFixed(1),
                publicFade: publicFadeSignal
            },
            sport,
            market,
            statDisplay
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LIVE GAME TRACKING (unchanged)
    // ═══════════════════════════════════════════════════════════════════════════
    async function getLiveGame(sport = 'nba', player = null) {
        try {
            const res = await fetch(`${PROXY}/api/live/${sport}/scores`);
            if (!res.ok) return { inProgress: false };
            const data = await res.json();
            
            if (data.games?.length > 0) {
                const liveGames = data.games.filter(g => g.status === 'in_progress' || g.status === 'live');
                return {
                    inProgress: liveGames.length > 0,
                    games: liveGames,
                    count: liveGames.length
                };
            }
            return { inProgress: false };
        } catch(e) {
            return { inProgress: false, error: e.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN ANALYZE FUNCTION - V4.0 Universal Sports Edition
    // ═══════════════════════════════════════════════════════════════════════════
    async function analyze(params) {
        const start = Date.now();
        
        // Auto-detect sport from params
        const sport = detectSport(params);
        const market = params.market || 'player_points';
        const sportConfig = SPORT_CONFIG[sport] || SPORT_CONFIG.nba;
        const marketConfig = MARKET_CONFIG[market] || {};
        const statKey = getStatKey(market);
        const statDisplay = marketConfig.display || market;
        
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║       🏆 SBA GENIUS V47 ULTIMATE V4.0 - UNIVERSAL SPORTS 🏆                    ║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  ${params.player} | ${statDisplay} @ ${params.line} vs ${params.opponent || 'Unknown'}`.padEnd(78) + '║');
        console.log(`║  Sport: ${sportConfig.name} | Market: ${market}`.padEnd(78) + '║');
        console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

        // LAYER 0: Data Collection
        console.log('══════════════════════════════════════════════════════════════════════');
        console.log(`  📊 LAYER 0: ${sportConfig.name} Data Collection`);
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const [stats, sgoData, defenseData, offenseData] = await Promise.all([
            getPlayerStats(params.player, sport, market),
            getSGOData(params.player, params.opponent, sport, market),
            getOpponentDefense(params.opponent, sport, market, stats?.positionType),
            getTeamOffense(stats?.team, sport)
        ]);
        
        // Get stat-specific value helper
        const getStatVal = (obj, key) => {
            if (!obj) return 'N/A';
            if (Array.isArray(key)) return key.reduce((sum, k) => sum + parseFloat(obj[k] || 0), 0).toFixed(1);
            return obj[key] || obj.pts || 'N/A';
        };
        
        if (stats) {
            const l5Val = getStatVal(stats.l5, statKey);
            const l10Val = getStatVal(stats.l10, statKey);
            console.log(`[V4] ✅ Stats: ${stats.name} | L5=${l5Val} L10=${l10Val} ${statDisplay}`);
        } else {
            console.log('[V4] ⚠️ Stats: Not available');
        }
        
        const hitRate = stats ? calculateHitRate(stats, parseFloat(params.line), market) : null;
        if (hitRate) {
            console.log(`[V4] ✅ Hit Rate: ${hitRate.rate}% (${hitRate.detail}) ${hitRate.trend} | Margin: ${hitRate.margin > 0 ? '+' : ''}${hitRate.margin}`);
        }
        
        if (sgoData?.found) {
            console.log(`[V4] ✅ SGO: Found | Edge: ${sgoData.edge}%`);
        } else {
            console.log('[V4] ⚠️ SGO: Not found');
        }
        
        if (defenseData?.found) {
            console.log(`[V4] ✅ Defense: ${defenseData.opponent} #${defenseData.rank} (${defenseData.tier}) | Impact: ${defenseData.impact}`);
        }
        
        if (offenseData?.found) {
            console.log(`[V4] ✅ Offense: #${offenseData.rank} | Trend: ${offenseData.trend}`);
        }
        
        // Line Movement
        const lineMovement = getLineMovement(params.player, market, params.opponent);
        if (sgoData?.relevantProp) {
            lineMovement.addLine(sgoData.relevantProp.line, sgoData.relevantProp.bookOdds);
        }
        const movement = lineMovement.getMovement();
        if (movement) {
            console.log(`[V4] ✅ Line Move: ${movement.direction} ${movement.change}pts (${movement.sharpIndicator})`);
        }
        
        // Reddit Sentiment (sport-specific)
        let redditData = { available: false };
        try {
            const subreddits = sportConfig.subreddits.join(',');
            const redditRes = await fetch(`${PROXY}/api/reddit/sentiment?player=${encodeURIComponent(params.player)}&sport=${sport}&subreddits=${subreddits}`);
            if (redditRes.ok) {
                const reddit = await redditRes.json();
                if (reddit.success && reddit.relevantMentions > 0) {
                    redditData = { available: true, mentions: reddit.relevantMentions, sentiment: reddit.sentiment };
                    console.log(`[V4] ✅ Reddit: ${reddit.relevantMentions} mentions | ${reddit.sentiment.label}`);
                } else {
                    console.log('[V4] ⚠️ Reddit: No mentions found');
                }
            }
        } catch(e) {
            console.log('[V4] ⚠️ Reddit: ' + e.message);
        }
        
        // Twitter Sentiment
        let twitterData = { available: false };
        try {
            const twitterRes = await fetch(`${PROXY}/api/twitter/sentiment?player=${encodeURIComponent(params.player)}&sport=${sport}&market=${statDisplay}`);
            if (twitterRes.ok) {
                twitterData = await twitterRes.json();
                if (twitterData.sentiment) {
                    console.log(`[V4] ✅ Twitter: ${twitterData.sentiment.label} (${twitterData.sentiment.score > 0 ? '+' : ''}${twitterData.sentiment.score})`);
                }
            }
        } catch(e) {
            console.log('[V4] ⚠️ Twitter: Not available');
        }
        
        // Live Game Check
        const liveData = await getLiveGame(sport, params.player);
        if (liveData.inProgress) {
            console.log(`[V4] 🔴 LIVE: ${liveData.count} ${sportConfig.name} games in progress`);
        } else {
            console.log(`[V4] ⚪ Live: No games in progress`);
        }

        // LAYER 1: AI Engines
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log(`  🤖 LAYER 1: 11 AI Engines (${sportConfig.name} ${statDisplay})`);
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const results = {};
        const enginePromises = engines.map(async (engineId) => {
            try {
                const result = await callEngine(engineId, params, stats, hitRate, sgoData, defenseData, offenseData, sport, market);
                results[engineId] = result;
                
                if (result.error) {
                    console.log(`[V4] ❌ ${engineId}: failed`);
                } else {
                    const icon = result.pick === 'OVER' ? '🟢' : result.pick === 'UNDER' ? '🔴' : '⚪';
                    console.log(`[V4] ${icon} ${engineId.padEnd(10)}: ${result.pick.padEnd(5)} @ ${result.confidence}%`);
                    if (result.reasoning) {
                        console.log(`       └─ "${result.reasoning.substring(0, 70)}..."`);
                    }
                }
            } catch(e) {
                results[engineId] = { pick: 'PASS', confidence: 50, error: true };
                console.log(`[V4] ❌ ${engineId}: ${e.message}`);
            }
        });
        
        await Promise.all(enginePromises);

        // LAYER 2: Injury Check
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('  🏥 INJURY CHECK');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const injuryStatus = aggregateInjuryStatus(results, params.player);
        if (injuryStatus.shouldOverride) {
            console.log(`[V4] 🚨 INJURY ALERT: ${injuryStatus.status} (sources: ${injuryStatus.sources.join(', ')})`);
        } else {
            console.log(`[V4] ✅ Player Status: ACTIVE`);
        }

        // LAYER 3: AI Collective
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('  🔄 LAYER 2: AI Collective');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const aiCollective = calculateAICollective(results);
        console.log(`[V4] 🤖 AI Collective: ${aiCollective.direction} @ ${aiCollective.confidence}% (${aiCollective.agreement})`);
        console.log(`[V4] 📊 ${aiCollective.overEngines.length} OVER / ${aiCollective.underEngines.length} UNDER / ${aiCollective.passEngines.length} PASS`);

        // LAYER 4: Master Synthesis
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('  👑 LAYER 3: Master Synthesis');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const master = await masterSynthesis(params, stats, hitRate, sgoData, defenseData, offenseData, results, aiCollective, injuryStatus, sport, market);
        console.log(`[V4] ✅ Master: ${master.finalPick} @ ${(master.finalProb * 100).toFixed(1)}%`);
        if (master.adjustments.length > 0) {
            console.log(`[V4] 📈 Adjustments: ${master.adjustments.join(', ')}`);
        }

        // LAYER 5: Coach K
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log(`  🏀 COACH K (${sportConfig.name} Expert)`);
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const coach = await coachK(params, master, stats, hitRate, aiCollective, sgoData, defenseData, offenseData, lineMovement, injuryStatus, redditData, sport, market);
        console.log(`[V4] ✅ Verdict: ${coach.verdict} | ${coach.unitSizing} units`);
        console.log(`[V4] 📊 Kelly: ${coach.kellyFraction} (${coach.kellyUnits}u) | Edge: ${coach.edge}%`);

        // FINAL OUTPUT
        const elapsed = Date.now() - start;
        const workingEngines = Object.values(results).filter(r => !r.error).length;
        
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                      🏆 FINAL ANALYSIS 🏆                                     ║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        
        // Confidence display
        const gems = Math.round(master.confidence / 10);
        console.log(`║  ${'💎'.repeat(gems)}`.padEnd(78) + '║');
        
        const tierLabel = master.confidence >= 85 ? '🔒💎 ABSOLUTE LOCK' :
                          master.confidence >= 75 ? '🔥 STRONG PLAY' :
                          master.confidence >= 65 ? '✅ SOLID PLAY' :
                          master.confidence >= 55 ? '⚠️ LEAN' : '❌ PASS';
        console.log(`║  ${tierLabel}`.padEnd(78) + '║');
        
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  SPORT: ${sportConfig.name} | MARKET: ${statDisplay}`.padEnd(78) + '║');
        console.log(`║  PICK: ${master.finalPick}`.padEnd(78) + '║');
        console.log(`║  TRUE PROBABILITY: ${(master.finalProb * 100).toFixed(1)}%`.padEnd(78) + '║');
        console.log(`║  CONFIDENCE: ${master.confidence}%`.padEnd(78) + '║');
        console.log(`║  EDGE: ${coach.edge}%`.padEnd(78) + '║');
        
        // Vegas Verdict
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        const vegasTrust = coach.vegasVerdict.trustLevel || 'MEDIUM';
        const vegasIcon = vegasTrust.includes('HIGH') ? '🟢' : vegasTrust.includes('LOW') ? '🔴' : '🟡';
        console.log(`║  🎰 VEGAS VERDICT: ${coach.vegasVerdict.action} ${vegasIcon}`.padEnd(78) + '║');
        console.log(`║  • Trust Level: ${vegasTrust} | SGO Edge: ${coach.vegasVerdict.sgoEdge}`.padEnd(78) + '║');
        console.log(`║  • Line Move: ${coach.vegasVerdict.lineMove}`.padEnd(78) + '║');
        console.log(`║  • ${coach.vegasVerdict.reason}`.substring(0, 75).padEnd(78) + '║');
        console.log(`║  • Unit Adjustment: ${coach.vegasVerdict.adjustment > 0 ? '+' : ''}${coach.vegasVerdict.adjustment} → Final: ${coach.vegasVerdict.finalUnits}u`.padEnd(78) + '║');
        
        // Stats
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  📈 ${statDisplay.toUpperCase()} STATS:`.padEnd(78) + '║');
        if (stats) {
            const l5Val = getStatVal(stats.l5, statKey);
            const l10Val = getStatVal(stats.l10, statKey);
            const seasonVal = getStatVal(stats.season, statKey);
            console.log(`║  • L5: ${l5Val} | L10: ${l10Val} | Season: ${seasonVal}`.padEnd(78) + '║');
        }
        if (hitRate) {
            console.log(`║  • Hit Rate: ${hitRate.rate}% (${hitRate.detail}) ${hitRate.trend}`.padEnd(78) + '║');
            console.log(`║  • Margin: ${hitRate.margin > 0 ? '+' : ''}${hitRate.margin} | Streak: ${hitRate.streak}`.padEnd(78) + '║');
        }
        
        // Coach K Analysis
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  🏀 COACH K ANALYSIS:`.padEnd(78) + '║');
        console.log(`║  VERDICT: ${coach.verdict} | ${coach.unitSizing} units | Kelly: ${coach.kellyUnits}u`.padEnd(78) + '║');
        console.log('║'.padEnd(78) + '║');
        console.log(`║  📗 CASUAL: ${coach.plainLanguage.substring(0, 65)}`.padEnd(78) + '║');
        console.log('║'.padEnd(78) + '║');
        console.log(`║  📊 SHARP: ${coach.expertLanguage.substring(0, 65)}`.padEnd(78) + '║');
        console.log('║'.padEnd(78) + '║');
        console.log(`║  💡 KEY: ${coach.keyInsight.substring(0, 68)}`.padEnd(78) + '║');
        
        // Footer
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  AI: ${workingEngines}/11 | ${sportConfig.name} | ${statDisplay} | Time: ${elapsed}ms`.padEnd(71) + '║');
        console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');

        // Track pick
        const pickId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        window.SBA_HISTORY.push({
            id: pickId,
            timestamp: new Date().toISOString(),
            sport,
            market,
            player: params.player,
            opponent: params.opponent,
            line: params.line,
            pick: master.finalPick,
            confidence: master.confidence,
            edge: coach.edge,
            units: coach.unitSizing,
            vegasVerdict: coach.vegasVerdict.action
        });

        return {
            sport,
            market,
            statDisplay,
            player: params.player,
            opponent: params.opponent,
            line: params.line,
            pick: master.finalPick,
            probability: master.finalProb,
            confidence: master.confidence,
            edge: coach.edge,
            verdict: coach.verdict,
            units: coach.unitSizing,
            aiCollective,
            vegasVerdict: coach.vegasVerdict,
            stats: stats ? { l5: getStatVal(stats.l5, statKey), l10: getStatVal(stats.l10, statKey) } : null,
            hitRate,
            defense: defenseData,
            offense: offenseData,
            elapsed,
            pickId
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════
    return {
        analyze,
        getHistory: () => window.SBA_HISTORY,
        getSupportedSports: () => Object.keys(SPORT_CONFIG),
        getSupportedMarkets: () => Object.keys(MARKET_CONFIG),
        getMarketsBySport: (sport) => {
            const config = SPORT_CONFIG[sport];
            if (!config) return [];
            return config.markets;
        },
        gradePick: (pickId, result) => {
            const pick = window.SBA_HISTORY.find(p => p.id === pickId);
            if (pick) {
                pick.result = result;
                pick.graded = true;
                console.log(`✅ Pick ${pickId} graded as ${result}`);
            }
        },
        version: '4.0.0 - Universal Sports Edition'
    };
})();

// Startup message
console.log('\n🏆 SBA GENIUS V4.0 - UNIVERSAL SPORTS EDITION LOADED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 SUPPORTED SPORTS: NBA, NFL, MLB, NHL, NCAAB, NCAAF, Soccer');
console.log('📈 SUPPORTED MARKETS: Points, Rebounds, Assists, PRA, Yards, Strikeouts, Goals...');
console.log('');
console.log('🧪 USAGE EXAMPLES:');
console.log('   NBA Points:    SBA_V47_ULTIMATE.analyze({ player: "LeBron James", market: "player_points", line: 25.5, opponent: "GSW" })');
console.log('   NBA Rebounds:  SBA_V47_ULTIMATE.analyze({ player: "Anthony Davis", market: "player_rebounds", line: 10.5, opponent: "BOS" })');
console.log('   NFL Passing:   SBA_V47_ULTIMATE.analyze({ player: "Patrick Mahomes", market: "player_passing_yards", line: 275.5, opponent: "BUF", sport: "nfl" })');
console.log('   MLB Strikeouts: SBA_V47_ULTIMATE.analyze({ player: "Shohei Ohtani", market: "pitcher_strikeouts", line: 8.5, opponent: "NYY", sport: "mlb" })');
console.log('   NHL Goals:     SBA_V47_ULTIMATE.analyze({ player: "Connor McDavid", market: "player_goals", line: 0.5, opponent: "VGK", sport: "nhl" })');
console.log('');
console.log('🎰 VEGAS TRUST LEVELS:');
console.log('   🟢🟢 MAX_TRUST: Vegas + AI + Sharps aligned → +0.5 units');
console.log('   🟢 TRUST_VEGAS: Positive SGO edge → +0.25 units');
console.log('   🟡 NEUTRAL: No strong signal → base units');
console.log('   🟠 CAUTION: Slight Vegas disagree → -0.25 units');
console.log('   🔴 REDUCE_SIZE: Vegas warning → -0.5 units');
console.log('   🔴🔴 CONSIDER_FADE: Strong disagree → pass');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Export for testing
if (typeof window !== 'undefined') {
    window.SBA_V47_ULTIMATE = SBA_V47_ULTIMATE;
}
