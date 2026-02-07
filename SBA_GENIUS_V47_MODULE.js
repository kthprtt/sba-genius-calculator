// ═══════════════════════════════════════════════════════════════════════════════════════════
// ██╗   ██╗██╗  ██╗███████╗    ██╗   ██╗██╗  ████████╗██╗███╗   ███╗ █████╗ ████████╗███████╗
// ██║   ██║██║  ██║╚════██║    ██║   ██║██║  ╚══██╔══╝██║████╗ ████║██╔══██╗╚══██╔══╝██╔════╝
// ██║   ██║███████║    ██╔╝    ██║   ██║██║     ██║   ██║██╔████╔██║███████║   ██║   █████╗  
// ╚██╗ ██╔╝╚════██║   ██╔╝     ██║   ██║██║     ██║   ██║██║╚██╔╝██║██╔══██║   ██║   ██╔══╝  
//  ╚████╔╝      ██║   ██║      ╚██████╔╝███████╗██║   ██║██║ ╚═╝ ██║██║  ██║   ██║   ███████╗
//   ╚═══╝       ╚═╝   ╚═╝       ╚═════╝ ╚══════╝╚═╝   ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
//                                                                                             
// SBA GENIUS V47 - ULTIMATE PREDICTION ENGINE
// The most comprehensive sports betting intelligence system ever built
// ═══════════════════════════════════════════════════════════════════════════════════════════

const SBA_GENIUS_V47 = (function() {
    'use strict';
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    const VERSION = 'V47_ULTIMATE';
    const DEBUG = true;
    
    const log = (...args) => DEBUG && console.log('[V47]', ...args);
    const logSection = (title) => {
        log('\n' + '═'.repeat(70));
        log(title);
        log('═'.repeat(70));
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1: MASTER DATA AGGREGATOR
    // Pulls ALL data from ALL sources into unified context
    // ═══════════════════════════════════════════════════════════════════════════
    
    const DataAggregator = {
        
        async gatherAllData(params) {
            logSection(`📊 MASTER DATA AGGREGATOR: ${params.player}`);
            
            const ctx = {
                // Basic Info
                player: params.player,
                market: params.market,
                line: parseFloat(params.line),
                sport: params.sport || 'nba',
                team: params.team,
                opponent: params.opponent,
                gameId: params.gameId,
                eventId: params.eventId,
                timestamp: new Date().toISOString(),
                
                // Data containers
                stats: {},
                injuries: { impact: {} },
                lineMovement: {},
                sharpAction: {},
                reddit: {},
                espn: {},
                boltOdds: {},
                
                // Quality tracking
                dataQuality: { sourcesAttempted: 0, sourcesSucceeded: 0, completeness: 0 }
            };
            
            // Parallel data fetching
            await Promise.allSettled([
                this.fetchBDLStats(ctx),
                this.fetchESPNData(ctx),
                this.fetchOddsData(ctx),
                this.fetchRedditSentiment(ctx),
                this.fetchSharpData(ctx)
            ]);
            
            // Calculate completeness
            ctx.dataQuality.completeness = Math.round(
                (ctx.dataQuality.sourcesSucceeded / Math.max(1, ctx.dataQuality.sourcesAttempted)) * 100
            );
            
            log(`📊 Data Quality: ${ctx.dataQuality.completeness}% (${ctx.dataQuality.sourcesSucceeded}/${ctx.dataQuality.sourcesAttempted})`);
            
            return ctx;
        },
        
        async fetchBDLStats(ctx) {
            ctx.dataQuality.sourcesAttempted++;
            
            if (!CONFIG?.keys?.bdl) {
                log('⚠️ BDL: No API key');
                return;
            }
            
            try {
                const sportMap = { nba: 'nba', nfl: 'nfl', nhl: 'nhl', mlb: 'mlb' };
                const bdlSport = sportMap[ctx.sport] || 'nba';
                
                // Search player
                const searchRes = await fetch(
                    `https://api.balldontlie.io/${bdlSport}/v1/players?search=${encodeURIComponent(ctx.player)}&per_page=5`,
                    { headers: { 'Authorization': CONFIG.keys.bdl } }
                );
                
                if (!searchRes.ok) throw new Error(`BDL: ${searchRes.status}`);
                
                const searchData = await searchRes.json();
                const playerData = searchData.data?.[0];
                
                if (!playerData) {
                    log(`⚠️ BDL: Player not found`);
                    return;
                }
                
                ctx.stats.playerId = playerData.id;
                ctx.stats.playerInfo = {
                    name: `${playerData.first_name} ${playerData.last_name}`,
                    team: playerData.team?.full_name,
                    teamAbbr: playerData.team?.abbreviation,
                    position: playerData.position
                };
                
                // Get season averages
                const year = new Date().getMonth() >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1;
                const avgRes = await fetch(
                    `https://api.balldontlie.io/${bdlSport}/v1/season_averages?season=${year}&player_id=${playerData.id}`,
                    { headers: { 'Authorization': CONFIG.keys.bdl } }
                );
                
                if (avgRes.ok) {
                    const avgData = await avgRes.json();
                    const avg = avgData.data?.[0];
                    if (avg) {
                        ctx.stats.seasonAverages = {
                            points: avg.pts, rebounds: avg.reb, assists: avg.ast,
                            minutes: avg.min, gamesPlayed: avg.games_played
                        };
                        log(`   ✅ Season: ${avg.pts} pts, ${avg.reb} reb, ${avg.ast} ast`);
                    }
                }
                
                // Get recent games
                const gamesRes = await fetch(
                    `https://api.balldontlie.io/${bdlSport}/v1/stats?player_ids[]=${playerData.id}&per_page=20&sort=-game.date`,
                    { headers: { 'Authorization': CONFIG.keys.bdl } }
                );
                
                if (gamesRes.ok) {
                    const gamesData = await gamesRes.json();
                    const games = gamesData.data || [];
                    
                    if (games.length > 0) {
                        const calcAvg = (arr, key) => arr.reduce((s, g) => s + (g[key] || 0), 0) / arr.length;
                        
                        const l5 = games.slice(0, 5);
                        const l10 = games.slice(0, 10);
                        
                        ctx.stats.last5 = {
                            games: l5.length,
                            avgPoints: calcAvg(l5, 'pts').toFixed(1),
                            avgRebounds: calcAvg(l5, 'reb').toFixed(1),
                            avgAssists: calcAvg(l5, 'ast').toFixed(1)
                        };
                        
                        ctx.stats.last10 = {
                            games: l10.length,
                            avgPoints: calcAvg(l10, 'pts').toFixed(1),
                            avgRebounds: calcAvg(l10, 'reb').toFixed(1),
                            avgAssists: calcAvg(l10, 'ast').toFixed(1)
                        };
                        
                        // Hit rate at this line
                        const marketKey = this.getMarketKey(ctx.market);
                        if (marketKey && ctx.line) {
                            const hits = l10.filter(g => g[marketKey] > ctx.line).length;
                            ctx.stats.hitRate = {
                                l10: Math.round((hits / l10.length) * 100),
                                gamesAbove: hits,
                                gamesTotal: l10.length
                            };
                            log(`   ✅ Hit rate: ${ctx.stats.hitRate.l10}% (${hits}/${l10.length})`);
                        }
                        
                        // vs Opponent
                        if (ctx.opponent) {
                            const vsOpp = games.filter(g => 
                                g.game?.home_team?.abbreviation === ctx.opponent ||
                                g.game?.visitor_team?.abbreviation === ctx.opponent
                            );
                            if (vsOpp.length > 0) {
                                ctx.stats.vsOpponent = {
                                    games: vsOpp.length,
                                    avgPoints: calcAvg(vsOpp, 'pts').toFixed(1)
                                };
                                log(`   ✅ vs ${ctx.opponent}: ${ctx.stats.vsOpponent.avgPoints} pts`);
                            }
                        }
                        
                        log(`   ✅ L5: ${ctx.stats.last5.avgPoints} | L10: ${ctx.stats.last10.avgPoints}`);
                    }
                }
                
                ctx.dataQuality.sourcesSucceeded++;
                
            } catch (e) {
                log(`❌ BDL: ${e.message}`);
            }
        },
        
        async fetchESPNData(ctx) {
            ctx.dataQuality.sourcesAttempted++;
            
            try {
                const sportMap = { nba: 'basketball/nba', nfl: 'football/nfl', nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
                const espnSport = sportMap[ctx.sport] || 'basketball/nba';
                
                // Scoreboard
                const scoreRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard`);
                if (scoreRes.ok) {
                    const data = await scoreRes.json();
                    ctx.espn.totalGames = data.events?.length || 0;
                    
                    // Find relevant game
                    const game = data.events?.find(g => {
                        const teams = g.competitions?.[0]?.competitors?.map(c => c.team?.displayName) || [];
                        return teams.some(t => t?.includes(ctx.team) || t?.includes(ctx.opponent));
                    });
                    
                    if (game) {
                        ctx.espn.game = {
                            name: game.name,
                            status: game.status?.type?.description,
                            date: game.date
                        };
                        log(`   ✅ ESPN: ${game.name}`);
                    }
                }
                
                // Injuries
                const injRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${espnSport}/injuries`);
                if (injRes.ok) {
                    const data = await injRes.json();
                    const injuries = [];
                    
                    for (const team of data.items || []) {
                        for (const inj of team.injuries || []) {
                            if (team.team?.displayName?.includes(ctx.team) || 
                                team.team?.displayName?.includes(ctx.opponent)) {
                                injuries.push({
                                    player: inj.athlete?.displayName,
                                    team: team.team?.displayName,
                                    status: inj.status
                                });
                            }
                        }
                    }
                    
                    ctx.espn.injuries = injuries;
                    
                    // Check for teammate injuries = usage boost
                    const teammateOut = injuries.filter(i => 
                        i.team?.includes(ctx.team) && 
                        (i.status === 'Out' || i.status === 'Doubtful') &&
                        !i.player?.toLowerCase().includes(ctx.player.split(' ')[1]?.toLowerCase())
                    );
                    
                    if (teammateOut.length > 0) {
                        ctx.injuries.impact.usageBoost = true;
                        ctx.injuries.impact.boostReason = `${teammateOut.length} teammate(s) out`;
                        log(`   📈 Usage boost: ${teammateOut.length} teammates out`);
                    }
                }
                
                ctx.dataQuality.sourcesSucceeded++;
                
            } catch (e) {
                log(`❌ ESPN: ${e.message}`);
            }
        },
        
        async fetchOddsData(ctx) {
            ctx.dataQuality.sourcesAttempted++;
            
            if (!CONFIG?.keys?.odds || !ctx.eventId) return;
            
            try {
                const sportMap = { nba: 'basketball_nba', nfl: 'americanfootball_nfl', nhl: 'icehockey_nhl' };
                const oddsSport = sportMap[ctx.sport] || ctx.sport;
                
                const res = await fetch(
                    `https://api.the-odds-api.com/v4/sports/${oddsSport}/events/${ctx.eventId}/odds?apiKey=${CONFIG.keys.odds}&regions=us,us2&markets=player_points,player_rebounds,player_assists&oddsFormat=american`
                );
                
                if (res.ok) {
                    const data = await res.json();
                    const lines = [];
                    
                    for (const book of data.bookmakers || []) {
                        for (const market of book.markets || []) {
                            for (const outcome of market.outcomes || []) {
                                if (outcome.description?.toLowerCase().includes(ctx.player.split(' ')[1]?.toLowerCase())) {
                                    lines.push({ book: book.title, line: outcome.point });
                                }
                            }
                        }
                    }
                    
                    if (lines.length > 0) {
                        const lineVals = lines.map(l => l.line).filter(l => l);
                        ctx.lineMovement.booksCount = lines.length;
                        ctx.lineMovement.medianLine = lineVals.sort((a,b) => a-b)[Math.floor(lineVals.length/2)];
                        ctx.lineMovement.lineRange = { low: Math.min(...lineVals), high: Math.max(...lineVals) };
                        log(`   ✅ Odds: ${lines.length} books, median ${ctx.lineMovement.medianLine}`);
                    }
                }
                
                ctx.dataQuality.sourcesSucceeded++;
                
            } catch (e) {
                log(`❌ Odds: ${e.message}`);
            }
        },
        
        async fetchRedditSentiment(ctx) {
            ctx.dataQuality.sourcesAttempted++;
            
            try {
                const useProxy = CONFIG?.aiProxy?.length > 10;
                const subs = ['sportsbook', ctx.sport];
                let posts = [];
                
                for (const sub of subs) {
                    try {
                        const url = useProxy
                            ? `${CONFIG.aiProxy}/api/reddit/${sub}/search?q=${encodeURIComponent(ctx.player)}&sort=new&limit=15&t=day`
                            : `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(ctx.player)}&sort=new&limit=15&t=day`;
                        
                        const res = await fetch(url);
                        if (res.ok) {
                            const data = await res.json();
                            posts = posts.concat(data.data?.children || []);
                        }
                    } catch (e) { /* continue */ }
                }
                
                // Analyze sentiment
                let over = 0, under = 0;
                const overWords = ['over', 'smash', 'lock', 'hammer', 'love', 'fire'];
                const underWords = ['under', 'fade', 'trap', 'avoid', 'pass'];
                
                for (const p of posts) {
                    const text = ((p.data?.title || '') + ' ' + (p.data?.selftext || '')).toLowerCase();
                    const score = Math.max(1, p.data?.score || 1);
                    const weight = 1 + Math.log(score);
                    
                    if (overWords.some(w => text.includes(w))) over += weight;
                    if (underWords.some(w => text.includes(w))) under += weight;
                }
                
                const total = over + under;
                const overPct = total > 0 ? (over / total) * 100 : 50;
                
                ctx.reddit = {
                    postsAnalyzed: posts.length,
                    overPct: Math.round(overPct),
                    underPct: Math.round(100 - overPct),
                    consensus: overPct > 60 ? 'OVER' : overPct < 40 ? 'UNDER' : 'SPLIT',
                    confidence: Math.min(80, 50 + Math.round(Math.abs(overPct - 50)))
                };
                
                log(`   ✅ Reddit: ${ctx.reddit.consensus} (${ctx.reddit.overPct}% OVER, ${posts.length} posts)`);
                ctx.dataQuality.sourcesSucceeded++;
                
            } catch (e) {
                log(`❌ Reddit: ${e.message}`);
            }
        },
        
        async fetchSharpData(ctx) {
            ctx.dataQuality.sourcesAttempted++;
            
            try {
                // Check BoltOdds connection
                if (typeof BOLT_ODDS_V43 !== 'undefined' && BOLT_ODDS_V43.connected) {
                    const boltData = BOLT_ODDS_V43.getEventData?.(ctx.eventId);
                    if (boltData?.lineHistory?.length >= 2) {
                        const first = boltData.lineHistory[0]?.line;
                        const last = boltData.lineHistory[boltData.lineHistory.length - 1]?.line;
                        
                        ctx.boltOdds.movement = {
                            direction: last > first ? 'UP' : last < first ? 'DOWN' : 'STABLE',
                            change: last - first,
                            openingLine: first,
                            currentLine: last
                        };
                        
                        ctx.sharpAction.movementSignal = ctx.boltOdds.movement.direction === 'UP' ? 'OVER' :
                                                         ctx.boltOdds.movement.direction === 'DOWN' ? 'UNDER' : 'NEUTRAL';
                        
                        log(`   ✅ Sharp: Line ${first} → ${last} (${ctx.boltOdds.movement.direction})`);
                    }
                }
                
                // Use SHARP_CONSENSUS_V44 if available
                if (typeof SHARP_CONSENSUS_V44 !== 'undefined' && ctx.eventId && ctx.market) {
                    const consensus = SHARP_CONSENSUS_V44.getConsensus?.(ctx.eventId, ctx.market);
                    if (consensus) {
                        ctx.sharpAction.consensus = consensus;
                        ctx.sharpAction.medianLine = consensus.medianLine;
                    }
                }
                
                ctx.dataQuality.sourcesSucceeded++;
                
            } catch (e) {
                log(`❌ Sharp: ${e.message}`);
            }
        },
        
        getMarketKey(market) {
            const map = {
                'points': 'pts', 'player_points': 'pts',
                'rebounds': 'reb', 'player_rebounds': 'reb',
                'assists': 'ast', 'player_assists': 'ast',
                'threes': 'fg3m', '3-pointers': 'fg3m'
            };
            return map[market?.toLowerCase()] || market;
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: PRE-AI SYNTHESIS
    // Quick data-based rating BEFORE calling AI (saves API costs)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const PreAISynthesis = {
        
        evaluate(ctx) {
            logSection(`⚡ PRE-AI SYNTHESIS: ${ctx.player}`);
            
            const signals = [];
            let overScore = 0, underScore = 0;
            
            // Signal 1: Statistics (30%)
            const l5 = parseFloat(ctx.stats.last5?.avgPoints || 0);
            const l10 = parseFloat(ctx.stats.last10?.avgPoints || 0);
            const season = parseFloat(ctx.stats.seasonAverages?.points || 0);
            
            if (l5 > 0 || l10 > 0 || season > 0) {
                const weighted = (l5 * 0.5) + (l10 * 0.3) + (season * 0.2);
                const diff = weighted - ctx.line;
                
                if (diff > 0) {
                    overScore += 0.3 * Math.min(0.8, 0.5 + diff * 0.05);
                    signals.push({ source: 'STATS', direction: 'OVER', detail: `Avg ${weighted.toFixed(1)} vs ${ctx.line}` });
                } else {
                    underScore += 0.3 * Math.min(0.8, 0.5 - diff * 0.05);
                    signals.push({ source: 'STATS', direction: 'UNDER', detail: `Avg ${weighted.toFixed(1)} vs ${ctx.line}` });
                }
            }
            
            // Signal 2: Hit Rate (20%)
            if (ctx.stats.hitRate?.l10 !== undefined) {
                const hr = ctx.stats.hitRate.l10;
                if (hr >= 50) {
                    overScore += 0.2 * (hr / 100);
                    signals.push({ source: 'HIT_RATE', direction: 'OVER', detail: `${hr}% L10` });
                } else {
                    underScore += 0.2 * ((100 - hr) / 100);
                    signals.push({ source: 'HIT_RATE', direction: 'UNDER', detail: `${hr}% L10` });
                }
            }
            
            // Signal 3: vs Opponent (15%)
            if (ctx.stats.vsOpponent?.avgPoints) {
                const vsOpp = parseFloat(ctx.stats.vsOpponent.avgPoints);
                const diff = vsOpp - ctx.line;
                if (diff > 0) {
                    overScore += 0.15 * Math.min(0.8, 0.5 + diff * 0.05);
                    signals.push({ source: 'MATCHUP', direction: 'OVER', detail: `${vsOpp} vs ${ctx.opponent}` });
                } else {
                    underScore += 0.15 * Math.min(0.8, 0.5 - diff * 0.05);
                    signals.push({ source: 'MATCHUP', direction: 'UNDER', detail: `${vsOpp} vs ${ctx.opponent}` });
                }
            }
            
            // Signal 4: Sharp/Line Movement (20%)
            if (ctx.sharpAction.movementSignal === 'OVER') {
                overScore += 0.2 * 0.65;
                signals.push({ source: 'SHARP', direction: 'OVER', detail: 'Line moved UP' });
            } else if (ctx.sharpAction.movementSignal === 'UNDER') {
                underScore += 0.2 * 0.65;
                signals.push({ source: 'SHARP', direction: 'UNDER', detail: 'Line moved DOWN' });
            }
            
            // Signal 5: Reddit (10%)
            if (ctx.reddit.consensus === 'OVER') {
                overScore += 0.1 * (ctx.reddit.confidence / 100);
                signals.push({ source: 'REDDIT', direction: 'OVER', detail: `${ctx.reddit.overPct}%` });
            } else if (ctx.reddit.consensus === 'UNDER') {
                underScore += 0.1 * (ctx.reddit.confidence / 100);
                signals.push({ source: 'REDDIT', direction: 'UNDER', detail: `${ctx.reddit.underPct}%` });
            }
            
            // Signal 6: Injury Impact (5%)
            if (ctx.injuries.impact?.usageBoost) {
                overScore += 0.05 * 0.7;
                signals.push({ source: 'INJURY', direction: 'OVER', detail: ctx.injuries.impact.boostReason });
            }
            
            // Calculate result
            const total = overScore + underScore || 1;
            const overPct = (overScore / total) * 100;
            const direction = overPct > 55 ? 'OVER' : overPct < 45 ? 'UNDER' : 'NEUTRAL';
            const confidence = Math.round(Math.max(overPct, 100 - overPct));
            
            // Pre-Diamond rating
            const overSignals = signals.filter(s => s.direction === 'OVER').length;
            const underSignals = signals.filter(s => s.direction === 'UNDER').length;
            const alignment = Math.max(overSignals, underSignals) / Math.max(1, signals.length);
            
            let preDiamonds = 1;
            if (signals.length >= 2) preDiamonds = 2;
            if (confidence >= 60 || alignment >= 0.6) preDiamonds = 3;
            if (confidence >= 65 && alignment >= 0.65 && signals.length >= 4) preDiamonds = 4;
            if (confidence >= 70 && alignment >= 0.75 && signals.some(s => s.source === 'SHARP')) preDiamonds = 5;
            
            const result = {
                direction,
                confidence,
                overPct: Math.round(overPct),
                preDiamonds,
                preDiamondsDisplay: '💎'.repeat(preDiamonds) + '⬜'.repeat(5 - preDiamonds),
                signals,
                recommendation: preDiamonds >= 4 ? 'STRONG_CANDIDATE' : preDiamonds >= 3 ? 'WORTH_ANALYZING' : 'WEAK'
            };
            
            log(`${result.preDiamondsDisplay} PRE-RATING: ${preDiamonds}/5`);
            log(`Direction: ${direction} @ ${confidence}%`);
            log(`Signals: ${overSignals} OVER / ${underSignals} UNDER`);
            
            return result;
        },
        
        shouldProceedToAI(result) {
            return result.preDiamonds >= 3 || result.signals.length >= 4;
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: AI ENGINE PROMPTS (Specialized for each engine)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const AIPrompts = {
        
        weights: {
            claude: 0.18, openai: 0.16, perplexity: 0.12, grok: 0.08,
            deepseek: 0.08, cohere: 0.08, gemini: 0.06, mistral: 0.06,
            groq: 0.06, together: 0.06, youcom: 0.06
        },
        
        buildContext(ctx) {
            return `
PROP ANALYSIS: ${ctx.player} ${ctx.market} @ ${ctx.line}
Sport: ${ctx.sport?.toUpperCase()} | Team: ${ctx.team || 'N/A'} | Opponent: ${ctx.opponent || 'N/A'}

STATISTICS:
• Season: ${ctx.stats.seasonAverages?.points || 'N/A'} pts
• L5: ${ctx.stats.last5?.avgPoints || 'N/A'} pts | L10: ${ctx.stats.last10?.avgPoints || 'N/A'} pts
• Hit Rate: ${ctx.stats.hitRate?.l10 || 'N/A'}% at ${ctx.line} line
• vs ${ctx.opponent || 'Opponent'}: ${ctx.stats.vsOpponent?.avgPoints || 'N/A'} pts

MARKET:
• Books: ${ctx.lineMovement.booksCount || 0} | Median: ${ctx.lineMovement.medianLine || ctx.line}
• Line Movement: ${ctx.boltOdds.movement?.direction || 'STABLE'} (${ctx.boltOdds.movement?.openingLine || '?'} → ${ctx.boltOdds.movement?.currentLine || ctx.line})
• Sharp Signal: ${ctx.sharpAction.movementSignal || 'N/A'}

SENTIMENT:
• Reddit: ${ctx.reddit.consensus || 'N/A'} (${ctx.reddit.overPct || 50}% OVER, ${ctx.reddit.postsAnalyzed || 0} posts)

INJURIES:
• Usage Boost: ${ctx.injuries.impact?.usageBoost ? 'YES - ' + ctx.injuries.impact.boostReason : 'NO'}
`;
        },
        
        getPrompt(engineId, ctx) {
            const base = this.buildContext(ctx);
            
            const prompts = {
                claude: `${base}\nAs RISK ANALYST, find what could go WRONG. Identify catastrophe scenarios.`,
                openai: `${base}\nAs SYNTHESIZER, weigh all data and produce final probability.`,
                perplexity: `${base}\nSearch for BREAKING NEWS about ${ctx.player} in last 24 hours.`,
                grok: `${base}\nAnalyze X/Twitter sentiment for ${ctx.player}. Filter for quality.`,
                deepseek: `${base}\nCalculate statistical probability using Poisson/normal distribution.`,
                cohere: `${base}\nAnalyze NARRATIVE factors: motivation, revenge, schedule spot.`,
                gemini: `${base}\nFind HISTORICAL PATTERNS and trend analysis.`,
                mistral: `${base}\nHow would PINNACLE (sharpest book) price this line?`,
                groq: `${base}\nQUICK ANALYSIS: What's the strongest signal?`,
                together: `${base}\nINDEPENDENT analysis. What might consensus miss?`,
                youcom: `${base}\nSearch for latest updates about ${ctx.player}.`
            };
            
            return (prompts[engineId] || base) + `\n\nReturn ONLY JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"brief"}`;
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: FULL AI SYNTHESIS
    // Call all 11 engines with enriched context
    // ═══════════════════════════════════════════════════════════════════════════
    
    const AISynthesis = {
        
        async synthesize(ctx, preAI) {
            logSection(`🤖 FULL AI SYNTHESIS: ${ctx.player}`);
            
            const results = {
                engines: {},
                overVotes: 0, underVotes: 0, passVotes: 0,
                weightedOver: 0, weightedUnder: 0,
                trueProbSum: 0, trueProbWeight: 0,
                total: 0
            };
            
            // Call all engines via proxy
            const engines = Object.keys(AIPrompts.weights);
            
            await Promise.allSettled(engines.map(async (id) => {
                try {
                    const prompt = AIPrompts.getPrompt(id, ctx);
                    const response = await this.callEngine(id, prompt);
                    
                    if (response) {
                        results.engines[id] = response;
                        const weight = AIPrompts.weights[id];
                        
                        if (response.pick === 'OVER') {
                            results.overVotes++;
                            results.weightedOver += weight * (response.confidence / 100);
                        } else if (response.pick === 'UNDER') {
                            results.underVotes++;
                            results.weightedUnder += weight * (response.confidence / 100);
                        } else {
                            results.passVotes++;
                        }
                        
                        results.total += weight;
                        
                        if (response.trueProb > 0.1 && response.trueProb < 0.9) {
                            results.trueProbSum += response.trueProb * weight;
                            results.trueProbWeight += weight;
                        }
                        
                        log(`✅ ${id}: ${response.pick} @ ${response.confidence}%`);
                    }
                } catch (e) {
                    log(`❌ ${id}: ${e.message}`);
                }
            }));
            
            // Calculate consensus
            const consensus = this.calculateConsensus(results);
            
            log(`\n📊 AI CONSENSUS: ${consensus.direction} @ ${consensus.confidence}%`);
            log(`   Votes: ${results.overVotes} OVER / ${results.underVotes} UNDER`);
            log(`   True Prob: ${(consensus.trueProb * 100).toFixed(1)}%`);
            
            return { engines: results.engines, consensus, enginesSuccessful: Object.keys(results.engines).length };
        },
        
        async callEngine(id, prompt) {
            if (!CONFIG?.aiProxy) return null;
            
            try {
                const res = await fetch(`${CONFIG.aiProxy}/api/ai/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, maxTokens: 300 })
                });
                
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                
                // Parse response
                const result = data.result || data;
                let parsed = result;
                
                if (typeof result === 'string') {
                    const match = result.match(/\{[\s\S]*\}/);
                    if (match) parsed = JSON.parse(match[0]);
                }
                
                return {
                    pick: parsed.pick || parsed.recommendation || 'PASS',
                    confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 50)),
                    trueProb: parseFloat(parsed.trueProb) || 0.5,
                    reason: parsed.reason || ''
                };
                
            } catch (e) {
                return null;
            }
        },
        
        calculateConsensus(results) {
            const total = results.total || 1;
            const overScore = results.weightedOver / total;
            const underScore = results.weightedUnder / total;
            
            return {
                direction: overScore > underScore ? 'OVER' : underScore > overScore ? 'UNDER' : 'NEUTRAL',
                confidence: Math.round(50 + Math.abs(overScore - underScore) * 50),
                overScore, underScore,
                trueProb: results.trueProbWeight > 0 ? results.trueProbSum / results.trueProbWeight : 0.5,
                overVotes: results.overVotes,
                underVotes: results.underVotes,
                agreement: Math.max(results.overVotes, results.underVotes) / Math.max(1, results.overVotes + results.underVotes)
            };
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 5: FEEL-LIKE ODDS CALCULATOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    const FeelLikeOdds = {
        
        weights: {
            ai: 0.45, stats: 0.25, sharp: 0.15, research: 0.10, calibration: 0.05
        },
        
        calculate(ai, preAI, ctx, marketOdds) {
            logSection('🎯 FEEL-LIKE ODDS CALCULATION');
            
            // Component 1: AI Consensus (45%)
            const aiProb = ai?.consensus?.trueProb || 0.5;
            
            // Component 2: Statistics (25%)
            let statProb = 0.5;
            if (ctx.stats.hitRate?.l10) {
                statProb = ctx.stats.hitRate.l10 / 100;
            } else {
                const avg = parseFloat(ctx.stats.last5?.avgPoints || 0);
                if (avg > 0) {
                    const diff = avg - ctx.line;
                    statProb = Math.max(0.2, Math.min(0.8, 0.5 + diff * 0.04));
                }
            }
            
            // Component 3: Sharp (15%)
            let sharpProb = 0.5;
            if (ctx.boltOdds.movement?.direction === 'UP') sharpProb = 0.6;
            else if (ctx.boltOdds.movement?.direction === 'DOWN') sharpProb = 0.4;
            
            // Component 4: Research (10%)
            let researchProb = 0.5;
            if (ctx.reddit.consensus === 'OVER') researchProb = 0.55;
            else if (ctx.reddit.consensus === 'UNDER') researchProb = 0.45;
            if (ctx.injuries.impact?.usageBoost) researchProb = Math.min(0.65, researchProb + 0.05);
            
            // Component 5: Calibration (5%)
            const calibProb = 0.5;
            
            // Final calculation
            const finalProb = 
                (aiProb * this.weights.ai) +
                (statProb * this.weights.stats) +
                (sharpProb * this.weights.sharp) +
                (researchProb * this.weights.research) +
                (calibProb * this.weights.calibration);
            
            // Confidence
            const probs = [aiProb, statProb, sharpProb, researchProb];
            const stdDev = Math.sqrt(probs.reduce((s, p) => s + Math.pow(p - finalProb, 2), 0) / probs.length);
            const confidence = Math.round((1 - stdDev * 3) * 100);
            
            // Convert to American odds
            const feelOdds = finalProb >= 0.5 
                ? Math.round(-100 * finalProb / (1 - finalProb))
                : Math.round(100 * (1 - finalProb) / finalProb);
            
            // Edge calculation
            let edge = null;
            if (marketOdds) {
                const implied = marketOdds < 0 
                    ? Math.abs(marketOdds) / (Math.abs(marketOdds) + 100)
                    : 100 / (marketOdds + 100);
                edge = ((finalProb - implied) * 100).toFixed(1);
            }
            
            const result = {
                trueProb: finalProb,
                trueProbPercent: `${(finalProb * 100).toFixed(1)}%`,
                feelOdds,
                feelOddsDisplay: feelOdds > 0 ? `+${feelOdds}` : feelOdds.toString(),
                confidence,
                edge: edge ? `${edge}%` : null,
                direction: finalProb > 0.55 ? 'OVER' : finalProb < 0.45 ? 'UNDER' : 'NEUTRAL',
                components: { ai: aiProb, stats: statProb, sharp: sharpProb, research: researchProb }
            };
            
            log(`FEEL-LIKE: ${result.feelOddsDisplay} (${result.trueProbPercent})`);
            log(`Direction: ${result.direction} | Confidence: ${confidence}%`);
            
            return result;
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 6: 9-GATE DIAMOND SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════
    
    const DiamondSystem = {
        
        gates: [
            { name: 'EDGE', test: (d) => Math.abs(parseFloat(d.feelLike?.edge || '0')) > 5 },
            { name: 'AI_CONSENSUS', test: (d) => (d.ai?.consensus?.confidence || 0) >= 60 },
            { name: 'ENGINE_AGREE', test: (d) => Math.max(d.ai?.consensus?.overVotes || 0, d.ai?.consensus?.underVotes || 0) >= 7 },
            { name: 'NO_CATASTROPHE', test: (d) => !d.ai?.engines?.claude?.raw?.riskScore || d.ai.engines.claude.raw.riskScore < 70 },
            { name: 'SHARP_ALIGNED', test: (d) => !d.ctx?.sharpAction?.movementSignal || d.ctx.sharpAction.movementSignal === d.feelLike?.direction || d.ctx.sharpAction.movementSignal === 'NEUTRAL' },
            { name: 'RESEARCH', test: (d) => (d.ctx?.dataQuality?.sourcesSucceeded || 0) >= 3 },
            { name: 'LINE_STABLE', test: (d) => !d.ctx?.boltOdds?.movement?.direction || d.ctx.boltOdds.movement.direction === 'STABLE' || (d.feelLike?.direction === 'OVER' && d.ctx.boltOdds.movement.direction === 'UP') || (d.feelLike?.direction === 'UNDER' && d.ctx.boltOdds.movement.direction === 'DOWN') },
            { name: 'DATA_QUALITY', test: (d) => (d.ctx?.dataQuality?.completeness || 0) >= 50 },
            { name: 'STATS_SUPPORT', test: (d) => !d.preAI || d.preAI.direction === d.feelLike?.direction || d.preAI.direction === 'NEUTRAL' }
        ],
        
        evaluate(data) {
            logSection('💎 9-GATE DIAMOND SYSTEM');
            
            let passed = 0;
            
            for (const gate of this.gates) {
                const result = gate.test(data);
                if (result) passed++;
                log(`${result ? '✅' : '❌'} ${gate.name}`);
            }
            
            const tiers = {
                9: { tier: 'ABSOLUTE_LOCK', name: '🔒💎 ABSOLUTE LOCK', emoji: '🔒💎' },
                8: { tier: 'PREMIUM_LOCK', name: '💎💎 PREMIUM LOCK', emoji: '💎💎' },
                7: { tier: 'STRONG_PLAY', name: '💎 STRONG PLAY', emoji: '💎' },
                6: { tier: 'SOLID_VALUE', name: '⭐ SOLID VALUE', emoji: '⭐' },
                5: { tier: 'SOLID_VALUE', name: '⭐ SOLID VALUE', emoji: '⭐' },
                4: { tier: 'LEAN', name: '⚡ LEAN', emoji: '⚡' },
                3: { tier: 'LEAN', name: '⚡ LEAN', emoji: '⚡' }
            };
            
            const tierInfo = tiers[passed] || { tier: 'PASS', name: '⚠️ PASS', emoji: '⚠️' };
            
            log(`\n${'💎'.repeat(passed)}${'⬜'.repeat(9 - passed)}`);
            log(`${tierInfo.name} (${passed}/9 gates)`);
            
            return {
                diamonds: passed,
                diamondDisplay: '💎'.repeat(passed) + '⬜'.repeat(9 - passed),
                ...tierInfo
            };
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 7: MASTER ORCHESTRATOR
    // Main entry point
    // ═══════════════════════════════════════════════════════════════════════════
    
    const Orchestrator = {
        
        async analyze(params) {
            const start = Date.now();
            
            console.log('\n');
            console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
            console.log('║           🏆 SBA GENIUS V47 - ULTIMATE PREDICTION ENGINE 🏆                  ║');
            console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
            console.log(`║  Player: ${(params.player || '').padEnd(62)}║`);
            console.log(`║  Market: ${(params.market || '').padEnd(62)}║`);
            console.log(`║  Line: ${String(params.line || '').padEnd(64)}║`);
            console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
            
            try {
                // Step 1: Data Aggregation
                const ctx = await DataAggregator.gatherAllData(params);
                
                // Step 2: Pre-AI Synthesis
                const preAI = PreAISynthesis.evaluate(ctx);
                
                // Check if should proceed
                if (!params.forceAI && !PreAISynthesis.shouldProceedToAI(preAI)) {
                    return {
                        success: true, skippedAI: true,
                        preAI, ctx,
                        recommendation: preAI.direction,
                        preDiamonds: preAI.preDiamonds,
                        time: Date.now() - start
                    };
                }
                
                // Step 3: Full AI Synthesis
                const ai = await AISynthesis.synthesize(ctx, preAI);
                
                // Step 4: Feel-Like Odds
                const feelLike = FeelLikeOdds.calculate(ai, preAI, ctx, params.marketOdds);
                
                // Step 5: Diamond Rating
                const diamonds = DiamondSystem.evaluate({ ai, preAI, ctx, feelLike });
                
                // Final result
                const result = {
                    success: true,
                    recommendation: feelLike.direction,
                    confidence: feelLike.confidence,
                    trueProb: feelLike.trueProb,
                    feelOdds: feelLike.feelOddsDisplay,
                    edge: feelLike.edge,
                    diamonds: diamonds.diamonds,
                    diamondDisplay: diamonds.diamondDisplay,
                    tier: diamonds.tier,
                    tierName: diamonds.name,
                    preAI, ai, feelLike, ctx,
                    time: Date.now() - start
                };
                
                this.printSummary(result);
                
                return result;
                
            } catch (e) {
                console.error('❌ Analysis failed:', e);
                return { success: false, error: e.message, time: Date.now() - start };
            }
        },
        
        async quickCheck(params) {
            const ctx = await DataAggregator.gatherAllData(params);
            const preAI = PreAISynthesis.evaluate(ctx);
            
            return {
                preDiamonds: preAI.preDiamonds,
                preDiamondsDisplay: preAI.preDiamondsDisplay,
                direction: preAI.direction,
                confidence: preAI.confidence,
                shouldAnalyze: PreAISynthesis.shouldProceedToAI(preAI)
            };
        },
        
        printSummary(r) {
            console.log('\n');
            console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
            console.log('║                         🏆 FINAL ANALYSIS RESULT 🏆                          ║');
            console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
            console.log(`║  ${(r.diamondDisplay || '').padEnd(71)}║`);
            console.log(`║  ${(r.tierName || '').padEnd(71)}║`);
            console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
            console.log(`║  PICK: ${(r.recommendation || 'N/A').padEnd(64)}║`);
            console.log(`║  FEEL-LIKE ODDS: ${(r.feelOdds || 'N/A').padEnd(54)}║`);
            console.log(`║  TRUE PROBABILITY: ${((r.trueProb * 100).toFixed(1) + '%').padEnd(52)}║`);
            console.log(`║  CONFIDENCE: ${(r.confidence + '%').padEnd(59)}║`);
            if (r.edge) console.log(`║  EDGE: ${r.edge.padEnd(64)}║`);
            console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
            console.log(`║  AI Engines: ${r.ai?.enginesSuccessful || 0}/11 | Data: ${r.ctx?.dataQuality?.completeness || 0}% | Time: ${r.time}ms`.padEnd(72) + '║');
            console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════
    
    return {
        VERSION,
        analyze: (params) => Orchestrator.analyze(params),
        quickCheck: (params) => Orchestrator.quickCheck(params),
        
        // Expose components for advanced use
        DataAggregator,
        PreAISynthesis,
        AISynthesis,
        FeelLikeOdds,
        DiamondSystem
    };
    
})();

// Make globally available
window.SBA_GENIUS_V47 = SBA_GENIUS_V47;

console.log('🏆 SBA GENIUS V47 - ULTIMATE PREDICTION ENGINE loaded');
console.log('   Usage: SBA_GENIUS_V47.analyze({ player, market, line, sport, team, opponent })');
console.log('   Quick: SBA_GENIUS_V47.quickCheck({ player, market, line })');
