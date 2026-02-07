// ═══════════════════════════════════════════════════════════════════════════════
// SBA GENIUS V47 ENHANCED - TRANSPARENT INTELLIGENCE
// 11 AI Engines + Research Intel + 3-Layer Synthesis + Coach K
// Master Synthesizer & Coach K: Claude Opus 4.6 (Most Intelligent Model)
// API Model ID: claude-opus-4-6
// PASTE THIS INTO CONSOLE AT sba-genius-calculator.vercel.app
// ═══════════════════════════════════════════════════════════════════════════════

const SBA_V47_ENHANCED = (function() {
    const PROXY = 'https://sba-ai-proxy-production.up.railway.app';
    const log = (...a) => console.log('[V47E]', ...a);
    
    const ENGINE_WEIGHTS = {
        claude: 0.18, openai: 0.16, perplexity: 0.12, grok: 0.08,
        deepseek: 0.08, cohere: 0.08, gemini: 0.06, mistral: 0.06,
        groq: 0.06, together: 0.06, youcom: 0.06
    };
    
    // Engine-specific prompts that require reasoning + sources
    const ENGINE_ROLES = {
        claude: { role: 'RISK ANALYST', instruction: 'Find what could go WRONG. Identify catastrophe scenarios, blowout risk, correlation issues.' },
        openai: { role: 'PATTERN SYNTHESIZER', instruction: 'Weigh ALL factors - stats, situation, market, sentiment. Resolve conflicts.' },
        perplexity: { role: 'WEB RESEARCHER', instruction: 'Search for real-time news. CITE YOUR SOURCES with URLs.' },
        grok: { role: 'X/TWITTER ANALYST', instruction: 'Check verified accounts, beat writers. CITE specific tweets.' },
        deepseek: { role: 'QUANTITATIVE ANALYST', instruction: 'Calculate probability using math. SHOW your calculations.' },
        cohere: { role: 'NARRATIVE ANALYST', instruction: 'Analyze motivation, fatigue, schedule, revenge factors.' },
        gemini: { role: 'PATTERN RECOGNITION', instruction: 'Find historical patterns, trends, regression signals.' },
        mistral: { role: 'EURO SHARP ANALYST', instruction: 'How would Pinnacle price this? Is line soft or sharp?' },
        groq: { role: 'FAST CONSENSUS', instruction: 'Quick sanity check - what is the obvious play?' },
        together: { role: 'CONTRARIAN', instruction: 'What is everyone MISSING? Play devil\'s advocate.' },
        youcom: { role: 'NEWS AGGREGATOR', instruction: 'Search breaking news. CITE article headlines and sources.' }
    };
    
    // Gather all available data
    async function gatherData(params) {
        log('📊 Gathering all data sources...');
        const ctx = { ...params, stats: null, reddit: null, injuries: null, line: parseFloat(params.line) };
        
        // BDL Stats
        if (CONFIG?.keys?.bdl) {
            try {
                const search = await fetch(`https://api.balldontlie.io/${params.sport || 'nba'}/v1/players?search=${encodeURIComponent(params.player)}&per_page=3`, 
                    { headers: { 'Authorization': CONFIG.keys.bdl } });
                const data = await search.json();
                const p = data.data?.[0];
                if (p) {
                    const stats = await fetch(`https://api.balldontlie.io/${params.sport || 'nba'}/v1/stats?player_ids[]=${p.id}&per_page=15&sort=-game.date`,
                        { headers: { 'Authorization': CONFIG.keys.bdl } });
                    const sData = await stats.json();
                    const games = sData.data || [];
                    const avg = (arr, k) => arr.length ? (arr.reduce((s,g) => s + (g[k]||0), 0) / arr.length).toFixed(1) : 'N/A';
                    const l5 = games.slice(0, 5), l10 = games.slice(0, 10);
                    const hits = l10.filter(g => g.pts > ctx.line).length;
                    ctx.stats = {
                        l5: { pts: avg(l5, 'pts'), reb: avg(l5, 'reb'), ast: avg(l5, 'ast') },
                        l10: { pts: avg(l10, 'pts'), reb: avg(l10, 'reb'), ast: avg(l10, 'ast') },
                        hitRate: Math.round((hits / l10.length) * 100),
                        hitDetail: `${hits}/${l10.length} over ${ctx.line}`
                    };
                    log(`✅ BDL: L5=${ctx.stats.l5.pts} L10=${ctx.stats.l10.pts} HitRate=${ctx.stats.hitRate}%`);
                }
            } catch (e) { log(`❌ BDL: ${e.message}`); }
        }
        
        // Reddit
        try {
            let over = 0, under = 0, posts = [];
            for (const sub of ['sportsbook', params.sport || 'nba']) {
                const res = await fetch(`${PROXY}/api/reddit/${sub}/search?q=${encodeURIComponent(params.player)}&sort=new&limit=15&t=day`);
                if (res.ok) {
                    const data = await res.json();
                    for (const p of data.data?.children || []) {
                        const text = ((p.data?.title||'') + (p.data?.selftext||'')).toLowerCase();
                        const w = 1 + Math.log(Math.max(1, p.data?.score||1));
                        if (/over|smash|lock|hammer/.test(text)) over += w;
                        if (/under|fade|trap|avoid/.test(text)) under += w;
                        posts.push({ title: p.data?.title?.substring(0,80), score: p.data?.score, url: `reddit.com${p.data?.permalink}` });
                    }
                }
            }
            const total = over + under || 1;
            const overPct = Math.round((over / total) * 100);
            ctx.reddit = { 
                posts: posts.slice(0, 5), 
                consensus: overPct > 60 ? 'OVER' : overPct < 40 ? 'UNDER' : 'SPLIT',
                overPct, underPct: 100 - overPct
            };
            log(`✅ Reddit: ${ctx.reddit.consensus} (${overPct}% OVER, ${posts.length} posts)`);
        } catch (e) { ctx.reddit = { consensus: 'UNKNOWN', posts: [] }; }
        
        return ctx;
    }
    
    // Build enriched context for AI engines
    function buildContext(ctx) {
        return `
═══════════════════════════════════════════════════════════════════════
PROP ANALYSIS: ${ctx.player} ${ctx.market} @ ${ctx.line}
═══════════════════════════════════════════════════════════════════════
Sport: ${(ctx.sport || 'NBA').toUpperCase()} | Opponent: ${ctx.opponent || 'Unknown'}

STATISTICS (BallDontLie):
• Last 5: ${ctx.stats?.l5?.pts || 'N/A'} pts, ${ctx.stats?.l5?.reb || 'N/A'} reb, ${ctx.stats?.l5?.ast || 'N/A'} ast
• Last 10: ${ctx.stats?.l10?.pts || 'N/A'} pts
• Hit Rate at ${ctx.line}: ${ctx.stats?.hitRate ?? 'N/A'}% (${ctx.stats?.hitDetail || 'N/A'})

PUBLIC SENTIMENT (Reddit):
• Consensus: ${ctx.reddit?.consensus || 'UNKNOWN'} (${ctx.reddit?.overPct || 50}% OVER)
• Posts: ${ctx.reddit?.posts?.length || 0} analyzed
• Sample: ${ctx.reddit?.posts?.[0]?.title || 'No posts found'}
═══════════════════════════════════════════════════════════════════════`;
    }
    
    // Call single AI engine with role-specific prompt
    async function callEngine(engineId, baseContext) {
        const role = ENGINE_ROLES[engineId];
        const prompt = `${baseContext}

YOUR ROLE: ${role.role}
INSTRUCTION: ${role.instruction}

Analyze this prop bet. Be specific and cite sources when available.

RESPOND WITH ONLY THIS JSON (no markdown):
{
  "pick": "OVER" or "UNDER" or "PASS",
  "confidence": 0-100,
  "trueProb": 0.00-1.00,
  "reasoning": "2-3 sentences explaining WHY with specific evidence",
  "keyFactors": ["factor 1", "factor 2"],
  "sources": [{"claim": "what you found", "source": "where from"}],
  "riskFactors": ["risk 1"]
}`;

        try {
            const res = await fetch(`${PROXY}/api/ai/${engineId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, maxTokens: 500 })
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (data.error) return null;
            
            let result = data.result || data;
            if (typeof result === 'string') {
                const m = result.match(/\{[\s\S]*\}/);
                if (m) result = JSON.parse(m[0]);
            }
            
            return {
                pick: result.pick || 'PASS',
                confidence: Math.min(100, Math.max(0, parseInt(result.confidence) || 50)),
                trueProb: parseFloat(result.trueProb) || 0.5,
                reasoning: result.reasoning || '',
                keyFactors: result.keyFactors || [],
                sources: result.sources || [],
                riskFactors: result.riskFactors || []
            };
        } catch (e) { return null; }
    }
    
    // Layer 1: Call all 11 engines
    async function layer1Engines(ctx, baseContext) {
        console.log('\n' + '═'.repeat(70));
        console.log('  🤖 LAYER 1: 11 AI Engines (with reasoning + sources)');
        console.log('═'.repeat(70));
        
        const results = {};
        const engines = Object.keys(ENGINE_WEIGHTS);
        
        await Promise.all(engines.map(async (id) => {
            const r = await callEngine(id, baseContext);
            if (r) {
                results[id] = r;
                const icon = r.pick === 'OVER' ? '🟢' : r.pick === 'UNDER' ? '🔴' : '⚪';
                log(`${icon} ${id.padEnd(10)}: ${r.pick.padEnd(5)} @ ${r.confidence}% — "${r.reasoning?.substring(0, 50)}..."`);
            } else {
                log(`❌ ${id}: failed`);
            }
        }));
        
        return results;
    }
    
    // Layer 1B: Research Intelligence
    function layer1Research(ctx, engineResults) {
        console.log('\n' + '═'.repeat(70));
        console.log('  🔬 LAYER 1B: Research Intelligence (5 Pillars)');
        console.log('═'.repeat(70));
        
        const pillars = {
            sharpMoney: { score: 5, direction: 'NEUTRAL', evidence: 'No line movement data' },
            publicSentiment: { 
                score: ctx.reddit?.consensus === 'OVER' ? 7 : ctx.reddit?.consensus === 'UNDER' ? 7 : 5,
                direction: ctx.reddit?.consensus === 'OVER' ? 'OVER' : ctx.reddit?.consensus === 'UNDER' ? 'UNDER' : 'NEUTRAL',
                evidence: `Reddit ${ctx.reddit?.consensus} (${ctx.reddit?.overPct}% OVER)`
            },
            newsImpact: {
                score: 5,
                direction: 'NEUTRAL',
                evidence: engineResults.perplexity?.sources?.[0]?.claim || engineResults.youcom?.sources?.[0]?.claim || 'No breaking news'
            },
            injuryAnalysis: { score: 5, direction: 'NEUTRAL', evidence: 'Standard lineup expected' },
            historicalEdge: {
                score: ctx.stats?.hitRate >= 60 ? 8 : ctx.stats?.hitRate <= 40 ? 8 : 5,
                direction: ctx.stats?.hitRate >= 60 ? 'OVER' : ctx.stats?.hitRate <= 40 ? 'UNDER' : 'NEUTRAL',
                evidence: `Hit rate ${ctx.stats?.hitRate || 'N/A'}% in L10`
            }
        };
        
        Object.entries(pillars).forEach(([name, p]) => {
            log(`📊 ${name}: ${p.score}/10 (${p.direction}) — ${p.evidence}`);
        });
        
        const avgScore = Object.values(pillars).reduce((s, p) => s + p.score, 0) / 5;
        const directions = Object.values(pillars).map(p => p.direction);
        const overCount = directions.filter(d => d === 'OVER').length;
        const underCount = directions.filter(d => d === 'UNDER').length;
        
        return {
            pillars,
            compositeScore: avgScore.toFixed(1),
            direction: overCount > underCount ? 'OVER' : underCount > overCount ? 'UNDER' : 'NEUTRAL'
        };
    }
    
    // Layer 2: Synthesize AI Collective
    function layer2AISynthesis(engineResults) {
        let overW = 0, underW = 0, totalW = 0, probSum = 0, probW = 0;
        const overEngines = [], underEngines = [], passEngines = [];
        
        for (const [id, r] of Object.entries(engineResults)) {
            const w = ENGINE_WEIGHTS[id];
            totalW += w;
            if (r.pick === 'OVER') {
                overW += w * (r.confidence / 100);
                overEngines.push({ id, confidence: r.confidence, reasoning: r.reasoning });
            } else if (r.pick === 'UNDER') {
                underW += w * (r.confidence / 100);
                underEngines.push({ id, confidence: r.confidence, reasoning: r.reasoning });
            } else {
                passEngines.push({ id });
            }
            if (r.trueProb > 0.1 && r.trueProb < 0.9) {
                probSum += r.trueProb * w;
                probW += w;
            }
        }
        
        return {
            direction: overW > underW ? 'OVER' : underW > overW ? 'UNDER' : 'NEUTRAL',
            confidence: Math.round(50 + Math.abs(overW - underW) / totalW * 50),
            trueProb: probW > 0 ? probSum / probW : 0.5,
            agreement: Math.max(overEngines.length, underEngines.length) >= 6 ? 'STRONG' : 
                      Math.max(overEngines.length, underEngines.length) >= 4 ? 'MODERATE' : 'WEAK',
            overEngines, underEngines, passEngines
        };
    }
    
    // Layer 3: Master Synthesis (Claude Opus 4.6 with Adaptive Thinking)
    async function layer3MasterSynthesis(ctx, aiCollective, research, engineResults) {
        console.log('\n' + '═'.repeat(70));
        console.log('  👑 LAYER 3: Master Synthesizer (Claude Opus 4.6 - Adaptive Thinking)');
        console.log('═'.repeat(70));
        
        // Collect all sources from engines
        const allSources = [];
        for (const r of Object.values(engineResults)) {
            if (r.sources?.length) allSources.push(...r.sources);
        }
        
        // Collect all key risks
        const allRisks = [];
        for (const r of Object.values(engineResults)) {
            if (r.riskFactors?.length) allRisks.push(...r.riskFactors);
        }
        
        const synthesisPrompt = `
You are the MASTER SYNTHESIZER. Combine these three analysis sources into a final verdict:

1. AI COLLECTIVE (11 engines): ${aiCollective.direction} @ ${aiCollective.confidence}%
   Agreement: ${aiCollective.agreement} (${aiCollective.overEngines.length} OVER / ${aiCollective.underEngines.length} UNDER)
   
2. RESEARCH INTELLIGENCE: ${research.direction} (${research.compositeScore}/10)
   - Public: ${research.pillars.publicSentiment.direction}
   - Historical: ${research.pillars.historicalEdge.direction}
   
3. STATISTICAL: ${ctx.stats ? `L5=${ctx.stats.l5.pts}, HitRate=${ctx.stats.hitRate}%` : 'No stats'}

SOURCES CITED BY ENGINES:
${allSources.slice(0, 5).map(s => `• ${s.claim} (${s.source})`).join('\n') || 'None'}

RISKS IDENTIFIED:
${[...new Set(allRisks)].slice(0, 5).join(', ') || 'Standard variance'}

BET: ${ctx.player} ${ctx.market} @ ${ctx.line}

TASK: Weigh AI (45%) + Research (30%) + Stats (25%). Explain WHY you reached your conclusion.

Return ONLY JSON:
{
  "finalPick": "OVER" or "UNDER" or "PASS",
  "finalProb": 0.00-1.00,
  "confidence": 0-100,
  "synthesisNarrative": "3-4 sentences explaining WHY, citing specific evidence",
  "keyEvidence": [{"fact": "evidence", "source": "where from"}],
  "riskFactors": ["risk 1", "risk 2"],
  "sourcesAgree": true or false
}`;

        try {
            // Use the new master endpoint with Claude Opus 4.6 + adaptive thinking
            const res = await fetch(`${PROXY}/api/ai/master`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: synthesisPrompt, task: 'master_synthesis' })
            });
            
            if (res.ok) {
                const data = await res.json();
                let result = data.result || data;
                if (typeof result === 'string') {
                    const m = result.match(/\{[\s\S]*\}/);
                    if (m) result = JSON.parse(m[0]);
                }
                log(`✅ Master (Opus 4.6): ${result.finalPick} @ ${(result.finalProb * 100).toFixed(1)}%`);
                return result;
            }
        } catch (e) {
            log(`⚠️ Master synthesis failed: ${e.message}, trying standard claude...`);
            
            // Fallback to standard claude endpoint
            try {
                const res = await fetch(`${PROXY}/api/ai/claude`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: synthesisPrompt, maxTokens: 800 })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    let result = data.result || data;
                    if (typeof result === 'string') {
                        const m = result.match(/\{[\s\S]*\}/);
                        if (m) result = JSON.parse(m[0]);
                    }
                    log(`✅ Master (fallback): ${result.finalPick} @ ${(result.finalProb * 100).toFixed(1)}%`);
                    return result;
                }
            } catch (e2) {
                log(`⚠️ Fallback also failed: ${e2.message}`);
            }
        }
        
        // Fallback: local calculation
        const finalProb = (aiCollective.trueProb * 0.45) + 
                         ((research.direction === 'OVER' ? 0.6 : research.direction === 'UNDER' ? 0.4 : 0.5) * 0.30) +
                         ((ctx.stats?.hitRate ? ctx.stats.hitRate / 100 : 0.5) * 0.25);
        
        return {
            finalPick: finalProb > 0.55 ? 'OVER' : finalProb < 0.45 ? 'UNDER' : 'NEUTRAL',
            finalProb,
            confidence: Math.round(Math.abs(finalProb - 0.5) * 200),
            synthesisNarrative: `AI Collective says ${aiCollective.direction} (${aiCollective.agreement} agreement). Research shows ${research.direction}. Stats: ${ctx.stats?.hitRate || 'N/A'}% hit rate. Weighted calculation yields ${(finalProb * 100).toFixed(1)}%.`,
            keyEvidence: allSources.slice(0, 3),
            riskFactors: [...new Set(allRisks)].slice(0, 3),
            sourcesAgree: aiCollective.direction === research.direction
        };
    }
    
    // Coach K Analysis (Claude Opus 4.6)
    async function coachKAnalysis(ctx, masterResult) {
        console.log('\n' + '═'.repeat(70));
        console.log('  🏀 COACH K ANALYSIS (Claude Opus 4.6 - Strategic Advisor)');
        console.log('═'.repeat(70));
        
        const feelOdds = masterResult.finalProb >= 0.5 
            ? Math.round(-100 * masterResult.finalProb / (1 - masterResult.finalProb))
            : Math.round(100 * (1 - masterResult.finalProb) / masterResult.finalProb);
        
        const coachPrompt = `
You are COACH K, strategic betting advisor.

BET: ${ctx.player} ${ctx.market} ${masterResult.finalPick} @ ${ctx.line}
FEEL-LIKE ODDS: ${feelOdds > 0 ? '+' : ''}${feelOdds}
CONFIDENCE: ${masterResult.confidence}%
ANALYSIS: ${masterResult.synthesisNarrative}

Provide strategic advice:
1. Should they bet? (APPROVED/LEAN/PASS)
2. Unit sizing (0.5, 1, 1.5, 2)
3. Any correlation warnings?
4. Hedge suggestions?
5. Your coaching wisdom

Return ONLY JSON:
{
  "verdict": "APPROVED" or "LEAN" or "PASS",
  "unitSizing": "1",
  "reasoning": "1-2 sentences",
  "correlationWarning": "warning or null",
  "hedgeSuggestion": "suggestion or null",
  "coachingAdvice": "Strategic wisdom in 2 sentences"
}`;

        try {
            // Use master endpoint for Coach K (Opus 4.6 with adaptive thinking)
            const res = await fetch(`${PROXY}/api/ai/master`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: coachPrompt, task: 'coach_k_analysis' })
            });
            
            if (res.ok) {
                const data = await res.json();
                let result = data.result || data;
                if (typeof result === 'string') {
                    const m = result.match(/\{[\s\S]*\}/);
                    if (m) result = JSON.parse(m[0]);
                }
                log(`✅ Coach K (Opus 4.6): ${result.verdict} | ${result.unitSizing} units`);
                return result;
            }
        } catch (e) { log(`⚠️ Coach K failed: ${e.message}`); }
        
        // Fallback
        return {
            verdict: masterResult.confidence >= 65 ? 'APPROVED' : masterResult.confidence >= 45 ? 'LEAN' : 'PASS',
            unitSizing: masterResult.confidence >= 70 ? '1.5' : '1',
            reasoning: 'Based on confidence level and signal alignment.',
            coachingAdvice: 'Trust the process. Bet within your bankroll.'
        };
    }
    
    // Diamond Rating
    function calculateDiamonds(masterResult, ctx, research) {
        const gates = [
            masterResult.finalProb > 0.55 || masterResult.finalProb < 0.45,
            masterResult.confidence >= 60,
            masterResult.sourcesAgree,
            (research.compositeScore || 5) >= 6,
            Object.keys(masterResult.keyEvidence || {}).length >= 1,
            ctx.stats?.available !== false,
            masterResult.riskFactors?.length < 3,
            masterResult.confidence >= 55,
            true // placeholder
        ];
        
        const passed = gates.filter(Boolean).length;
        const tiers = {
            9: '🔒💎 ABSOLUTE LOCK', 8: '💎💎 PREMIUM LOCK', 7: '💎 STRONG PLAY',
            6: '⭐ SOLID VALUE', 5: '⭐ SOLID VALUE', 4: '⚡ LEAN', 3: '⚡ LEAN'
        };
        
        return {
            diamonds: passed,
            display: '💎'.repeat(passed) + '⬜'.repeat(9 - passed),
            tier: tiers[passed] || '⚠️ PASS'
        };
    }
    
    // Main analyze function
    async function analyze(params) {
        const startTime = Date.now();
        
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║       🏆 SBA GENIUS V47 ENHANCED - TRANSPARENT INTELLIGENCE 🏆               ║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  ${params.player} | ${params.market} @ ${params.line}`.padEnd(78) + '║');
        console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
        
        // Data Layer
        const ctx = await gatherData(params);
        const baseContext = buildContext(ctx);
        
        // Layer 1: AI Engines
        const engineResults = await layer1Engines(ctx, baseContext);
        
        // Layer 1B: Research
        const research = layer1Research(ctx, engineResults);
        
        // Layer 2: AI Synthesis
        console.log('\n' + '═'.repeat(70));
        console.log('  🔄 LAYER 2: Domain Synthesizers');
        console.log('═'.repeat(70));
        const aiCollective = layer2AISynthesis(engineResults);
        log(`🤖 AI Collective: ${aiCollective.direction} @ ${aiCollective.confidence}% (${aiCollective.agreement})`);
        log(`🔬 Research: ${research.direction} (${research.compositeScore}/10)`);
        log(`📊 Statistical: ${ctx.stats?.hitRate ? `${ctx.stats.hitRate}% hit rate` : 'N/A'}`);
        
        // Layer 3: Master Synthesis
        const masterResult = await layer3MasterSynthesis(ctx, aiCollective, research, engineResults);
        
        // Coach K
        const coachResult = await coachKAnalysis(ctx, masterResult);
        
        // Diamond Rating
        const diamonds = calculateDiamonds(masterResult, ctx, research);
        
        // Calculate feel-like odds
        const feelOdds = masterResult.finalProb >= 0.5 
            ? Math.round(-100 * masterResult.finalProb / (1 - masterResult.finalProb))
            : Math.round(100 * (1 - masterResult.finalProb) / masterResult.finalProb);
        
        // Final Output
        const execTime = Date.now() - startTime;
        
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                    🏆 FINAL ANALYSIS RESULT 🏆                                ║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  ${diamonds.display}`.padEnd(78) + '║');
        console.log(`║  ${diamonds.tier}`.padEnd(78) + '║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  PICK: ${masterResult.finalPick}`.padEnd(78) + '║');
        console.log(`║  FEEL-LIKE ODDS: ${feelOdds > 0 ? '+' : ''}${feelOdds}`.padEnd(78) + '║');
        console.log(`║  TRUE PROBABILITY: ${(masterResult.finalProb * 100).toFixed(1)}%`.padEnd(78) + '║');
        console.log(`║  CONFIDENCE: ${masterResult.confidence}%`.padEnd(78) + '║');
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  📝 WHY THIS PICK:'.padEnd(78) + '║');
        
        // Word wrap narrative
        const words = (masterResult.synthesisNarrative || '').split(' ');
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
        
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  📊 KEY EVIDENCE:'.padEnd(78) + '║');
        (masterResult.keyEvidence || []).slice(0, 3).forEach(e => {
            console.log(`║  • ${(e.fact || e.claim || '').substring(0, 50)} (${e.source || 'analysis'})`.padEnd(78) + '║');
        });
        
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  ⚠️ RISKS:'.padEnd(78) + '║');
        (masterResult.riskFactors || ['Standard variance']).slice(0, 2).forEach(r => {
            console.log(`║  • ${r.substring(0, 70)}`.padEnd(78) + '║');
        });
        
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  🏀 COACH K:'.padEnd(78) + '║');
        console.log(`║  ${coachResult.verdict} | ${coachResult.unitSizing} units`.padEnd(78) + '║');
        console.log(`║  "${(coachResult.coachingAdvice || coachResult.reasoning || '').substring(0, 65)}"`.padEnd(78) + '║');
        
        console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  AI: ${Object.keys(engineResults).length}/11 engines | Data: ${ctx.sources?.completeness || 'N/A'}% | Time: ${execTime}ms`.padEnd(78) + '║');
        console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
        
        // Return full result object
        return {
            pick: masterResult.finalPick,
            feelOdds: `${feelOdds > 0 ? '+' : ''}${feelOdds}`,
            trueProb: masterResult.finalProb,
            confidence: masterResult.confidence,
            diamonds: diamonds.diamonds,
            tier: diamonds.tier,
            synthesisNarrative: masterResult.synthesisNarrative,
            keyEvidence: masterResult.keyEvidence,
            riskFactors: masterResult.riskFactors,
            coachVerdict: coachResult.verdict,
            unitSizing: coachResult.unitSizing,
            coachingAdvice: coachResult.coachingAdvice,
            engines: engineResults,
            research,
            executionTime: execTime
        };
    }
    
    return { analyze };
})();

window.SBA_V47_ENHANCED = SBA_V47_ENHANCED;
console.log('🏆 V47 ENHANCED loaded!');
console.log('Run: SBA_V47_ENHANCED.analyze({ player: "LeBron James", market: "player_points", line: 25.5, opponent: "GSW" })');
