// ═══════════════════════════════════════════════════════════════════════════════
// SBA GENIUS AI PROXY SERVER V3.0 — COMPLETE 12-ENGINE + RESEARCH
// Deploy to Railway - Replaces your existing sba-ai-proxy
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════════
// API KEYS — Uses YOUR Railway variable names (updated for Keith's setup)
// ═══════════════════════════════════════════════════════════════════════════════
const API_KEYS = {
    claude: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
    perplexity: process.env.PERPLEXITY_API_KEY || '',
    together: process.env.TOGETHER_API_KEY || '',
    deepseek: process.env.DEEPSEEK_API_KEY || '',
    cohere: process.env.COHERE_API_KEY || '',
    mistral: process.env.MISTRAL_API_KEY || '',
    gemini: process.env.GEMINI_API_KEY || '',
    grok: process.env.GROK_API_KEY || process.env.XAI_API_KEY || '',
    youcom: process.env.YOUCOM_API_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
    odds: process.env.ODDS_API_KEY || '',
    bdl: process.env.BDL_API_KEY || '',
    betburger: process.env.BETBURGER_API_KEY || ''
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════
const ENGINES = {
    claude: { endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022', weight: 0.18, role: 'Risk Analysis', type: 'anthropic' },
    openai: { endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', weight: 0.16, role: 'Pattern Recognition', type: 'openai' },
    perplexity: { endpoint: 'https://api.perplexity.ai/chat/completions', model: 'llama-3.1-sonar-large-128k-online', weight: 0.12, role: 'Web Research', type: 'openai' },
    deepseek: { endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat', weight: 0.08, role: 'Statistical Modeling', type: 'openai' },
    together: { endpoint: 'https://api.together.xyz/v1/chat/completions', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', weight: 0.06, role: 'Consensus', type: 'openai' },
    groq: { endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', weight: 0.06, role: 'Fast Inference', type: 'openai' },
    cohere: { endpoint: 'https://api.cohere.ai/v1/chat', model: 'command-r-plus', weight: 0.08, role: 'NLP Sentiment', type: 'cohere' },
    mistral: { endpoint: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-large-latest', weight: 0.06, role: 'Euro Markets', type: 'openai' },
    gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', model: 'gemini-1.5-flash', weight: 0.06, role: 'Matchup Analysis', type: 'gemini' },
    grok: { endpoint: 'https://api.x.ai/v1/chat/completions', model: 'grok-beta', weight: 0.08, role: 'X/Twitter Sentiment', type: 'openai' },
    youcom: { endpoint: 'https://api.you.com/v1/chat', searchEndpoint: 'https://api.you.com/v1/search', weight: 0.06, role: 'News & Social Search', type: 'youcom' }
};

function buildPrompt(player, market, line, context, role) {
    const stats = `Player: ${player} | Market: ${market} | Line: ${line} | Season: ${context.seasonAvg || 'N/A'} | L5: ${context.l5Avg || 'N/A'} | Opponent: ${context.opponent || 'Unknown'}`;
    const prompts = {
        'Risk Analysis': `Risk analysis for: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"brief"}`,
        'Pattern Recognition': `Find patterns: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"pattern"}`,
        'Web Research': `Search latest news for ${player}: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"news"}`,
        'Statistical Modeling': `Calculate probability: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"stats"}`,
        'NLP Sentiment': `Analyze sentiment for ${player}: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"sentiment"}`,
        'X/Twitter Sentiment': `What is X/Twitter saying about ${player}?\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"twitterSentiment":"bullish|bearish|neutral","reason":"twitter"}`,
        'Euro Markets': `Sharp European analysis: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"euro"}`,
        'Matchup Analysis': `Matchup analysis: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"matchup"}`,
        'News & Social Search': `Breaking news for ${player}: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"news"}`,
        'Consensus': `Independent assessment: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"consensus"}`,
        'Fast Inference': `Quick analysis: ${stats}\nReturn JSON: {"pick":"OVER|UNDER|PASS","confidence":0-100,"trueProb":0.50,"reason":"quick"}`
    };
    return prompts[role] || prompts['Consensus'];
}

async function callClaude(prompt) {
    if (!API_KEYS.claude) return null;
    const res = await fetch(ENGINES.claude.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEYS.claude, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: ENGINES.claude.model, max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
    });
    if (!res.ok) throw new Error(`Claude: ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text;
}

async function callOpenAIStyle(engineId, prompt) {
    const key = API_KEYS[engineId];
    if (!key) return null;
    const engine = ENGINES[engineId];
    const res = await fetch(engine.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: engine.model, max_tokens: 500, messages: [{ role: 'system', content: 'Sports analyst. JSON only.' }, { role: 'user', content: prompt }] })
    });
    if (!res.ok) throw new Error(`${engineId}: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content;
}

async function callCohere(prompt) {
    if (!API_KEYS.cohere) return null;
    const res = await fetch(ENGINES.cohere.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEYS.cohere}` },
        body: JSON.stringify({ model: ENGINES.cohere.model, message: prompt, preamble: 'Sports analyst. JSON only.' })
    });
    if (!res.ok) throw new Error(`Cohere: ${res.status}`);
    return (await res.json()).text;
}

async function callGemini(prompt) {
    if (!API_KEYS.gemini) return null;
    const res = await fetch(`${ENGINES.gemini.endpoint}?key=${API_KEYS.gemini}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 500 } })
    });
    if (!res.ok) throw new Error(`Gemini: ${res.status}`);
    return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text;
}

async function callYouCom(query) {
    if (!API_KEYS.youcom) return null;
    const res = await fetch(`https://api.you.com/v1/search?query=${encodeURIComponent(query)}`, { headers: { 'X-API-Key': API_KEYS.youcom } });
    if (!res.ok) throw new Error(`You.com: ${res.status}`);
    return await res.json();
}

async function callYouComChat(prompt) {
    if (!API_KEYS.youcom) return null;
    const res = await fetch('https://api.you.com/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEYS.youcom },
        body: JSON.stringify({ query: prompt, chat_mode: 'research' })
    });
    if (!res.ok) throw new Error(`You.com: ${res.status}`);
    const data = await res.json();
    return data.answer || data.response;
}

async function callEngine(engineId, prompt) {
    const engine = ENGINES[engineId];
    if (!engine) throw new Error(`Unknown: ${engineId}`);
    switch (engine.type) {
        case 'anthropic': return await callClaude(prompt);
        case 'cohere': return await callCohere(prompt);
        case 'gemini': return await callGemini(prompt);
        case 'youcom': return await callYouComChat(prompt);
        default: return await callOpenAIStyle(engineId, prompt);
    }
}

function parseResponse(text, engineId) {
    if (!text) return null;
    try {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;
        const r = JSON.parse(match[0]);
        return { pick: r.pick || 'PASS', confidence: Math.min(100, Math.max(0, parseInt(r.confidence) || 50)), trueProb: parseFloat(r.trueProb) || 0.5, reason: r.reason || engineId, raw: r };
    } catch { return null; }
}

// ROUTES
app.get('/', (req, res) => res.json({ status: 'SBA AI Proxy V3.0', engines: Object.keys(ENGINES).length }));

app.get('/api/status', (req, res) => {
    const engines = {};
    let active = 0;
    for (const [id, cfg] of Object.entries(ENGINES)) {
        const hasKey = !!API_KEYS[id];
        engines[id] = { configured: hasKey, role: cfg.role, weight: cfg.weight };
        if (hasKey) active++;
    }
    res.json({ activeCount: active, totalCount: Object.keys(ENGINES).length, totalEngines: Object.keys(ENGINES).length, liveEngines: active, engines, apis: { odds: !!API_KEYS.odds, bdl: !!API_KEYS.bdl, betburger: !!API_KEYS.betburger } });
});

app.post('/api/ai/:engine', async (req, res) => {
    const { engine } = req.params;
    const { player, market, line, context, prompt: custom } = req.body;
    const cfg = ENGINES[engine];
    if (!cfg) return res.status(400).json({ error: 'Unknown engine' });
    const prompt = custom || buildPrompt(player, market, line, context || {}, cfg.role);
    try {
        const response = await callEngine(engine, prompt);
        res.json({ engine, result: parseResponse(response, engine), raw: response });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/analyze', async (req, res) => {
    const { player, market, line, context } = req.body;
    console.log(`\n🎯 Analyzing: ${player} ${market} @ ${line}`);
    const results = {};
    const promises = [];
    for (const [id, cfg] of Object.entries(ENGINES)) {
        if (!API_KEYS[id]) { results[id] = { configured: false }; continue; }
        const prompt = buildPrompt(player, market, line, context || {}, cfg.role);
        promises.push((async () => {
            try {
                const r = await callEngine(id, prompt);
                results[id] = { result: parseResponse(r, id) };
                console.log(`  ✅ ${id}: ${results[id].result?.pick || 'N/A'}`);
            } catch (e) { results[id] = { error: e.message }; console.log(`  ❌ ${id}: ${e.message}`); }
        })());
    }
    await Promise.allSettled(promises);
    let over = 0, under = 0, total = 0, responded = 0;
    for (const [id, d] of Object.entries(results)) {
        if (!d.result?.pick) continue;
        const w = ENGINES[id]?.weight || 0.05;
        responded++;
        if (d.result.pick === 'OVER') over += w * (d.result.confidence / 100);
        else if (d.result.pick === 'UNDER') under += w * (d.result.confidence / 100);
        total += w;
    }
    const consensus = { pick: over > under ? 'OVER' : 'UNDER', overScore: total > 0 ? Math.round((over / total) * 100) : 50, underScore: total > 0 ? Math.round((under / total) * 100) : 50, enginesResponded: responded, totalEngines: Object.keys(ENGINES).length };
    console.log(`📊 Consensus: ${consensus.pick} (${consensus.overScore}% over)`);
    res.json({ engines: results, consensus });
});

// GROK
app.post('/api/grok', async (req, res) => {
    if (!API_KEYS.grok) return res.status(400).json({ error: 'Grok not configured' });
    const { player, team, query } = req.body;
    const prompt = query || `What is X/Twitter saying about ${player} ${team || ''}? Return JSON: {"sentiment":"bullish|bearish|neutral","trending":true|false,"reason":"summary"}`;
    try {
        const r = await callOpenAIStyle('grok', prompt);
        res.json({ result: parseResponse(r, 'grok'), raw: r });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// YOU.COM
app.get('/api/youcom/search', async (req, res) => {
    if (!API_KEYS.youcom) return res.status(400).json({ error: 'You.com not configured' });
    try { res.json(await callYouCom(req.query.q || req.query.query)); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/youcom/search', async (req, res) => {
    if (!API_KEYS.youcom) return res.status(400).json({ error: 'You.com not configured' });
    try { res.json(await callYouCom(req.body.query || `${req.body.player} ${req.body.team || ''} injury news`)); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/youcom/analyze', async (req, res) => {
    if (!API_KEYS.youcom) return res.status(400).json({ error: 'You.com not configured' });
    const { player, market, line, context } = req.body;
    try {
        const r = await callYouComChat(buildPrompt(player, market, line, context || {}, 'News & Social Search'));
        res.json({ result: parseResponse(r, 'youcom'), raw: r });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// BETBURGER
// BETBURGER - Uses POST with form data as per their API docs
app.get('/api/betburger/arbs', async (req, res) => {
    if (!API_KEYS.betburger) return res.status(400).json({ error: 'BetBurger not configured' });
    try {
        // BetBurger requires POST with form-urlencoded
        const params = new URLSearchParams();
        params.append('access_token', API_KEYS.betburger);
        params.append('per_page', '50');
        // Without a filter, we need to pass at least one - use a default "all" filter
        // Note: Without active subscription, limited to 1% arbs
        
        const r = await fetch('https://rest-api-pr.betburger.com/api/v1/arbs/bot_pro_search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        
        if (!r.ok) {
            const errorText = await r.text();
            console.log('BetBurger error:', r.status, errorText);
            return res.status(r.status).json({ error: errorText });
        }
        
        const data = await r.json();
        res.json(data);
    } catch (e) { 
        console.log('BetBurger catch:', e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.get('/api/betburger/valuebets', async (req, res) => {
    if (!API_KEYS.betburger) return res.status(400).json({ error: 'BetBurger not configured' });
    try {
        const params = new URLSearchParams();
        params.append('access_token', API_KEYS.betburger);
        params.append('per_page', '50');
        
        const r = await fetch('https://rest-api-pr.betburger.com/api/v1/valuebets/bot_pro_search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        
        if (!r.ok) {
            const errorText = await r.text();
            return res.status(r.status).json({ error: errorText });
        }
        
        res.json(await r.json());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ODDS API PROXY
app.get('/api/odds/*', async (req, res) => {
    const params = new URLSearchParams(req.query);
    if (!params.has('apiKey') && API_KEYS.odds) params.set('apiKey', API_KEYS.odds);
    try {
        const r = await fetch(`https://api.the-odds-api.com/v4/${req.params[0]}?${params}`);
        res.set('x-requests-remaining', r.headers.get('x-requests-remaining'));
        res.json(await r.json());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// BDL PROXY
app.get('/api/bdl/*', async (req, res) => {
    try {
        const r = await fetch(`https://api.balldontlie.io/${req.params[0]}?${new URLSearchParams(req.query)}`, { headers: { 'Authorization': API_KEYS.bdl } });
        res.json(await r.json());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ESPN PROXY
app.get('/api/espn/:sport/scoreboard', async (req, res) => {
    const map = { nba: 'basketball/nba', nfl: 'football/nfl', mlb: 'baseball/mlb', nhl: 'hockey/nhl', ncaab: 'basketball/mens-college-basketball' };
    try {
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${map[req.params.sport] || req.params.sport}/scoreboard`);
        res.json(await r.json());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/espn/:sport/injuries', async (req, res) => {
    const map = { nba: 'basketball/nba', nfl: 'football/nfl', mlb: 'baseball/mlb', nhl: 'hockey/nhl' };
    try {
        if (req.query.team) {
            const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${map[req.params.sport]}/teams/${req.query.team}/injuries`);
            res.json(await r.json());
        } else {
            res.json({ injuries: [] });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/espn/:sport/news', async (req, res) => {
    const map = { nba: 'basketball/nba', nfl: 'football/nfl', mlb: 'baseball/mlb', nhl: 'hockey/nhl' };
    try {
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${map[req.params.sport] || req.params.sport}/news`);
        res.json(await r.json());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 SBA AI Proxy V3.0 on port ${PORT}`);
    let ai = 0, data = 0;
    for (const id of Object.keys(ENGINES)) if (API_KEYS[id]) ai++;
    if (API_KEYS.odds) data++;
    if (API_KEYS.bdl) data++;
    if (API_KEYS.betburger) data++;
    console.log(`📊 ${ai}/${Object.keys(ENGINES).length} AI engines | ${data}/3 data APIs\n`);
});
