# agent-ads MCP Server

Wraps the [agent-ads](https://agent-ads.dev) CLI as a remote MCP server for **Claude Desktop** and **ChatGPT Desktop**.

---

## How it works

```
You: "Show me last week's Meta spend by age"
        ↓
Claude sees MCP tools + reads the command reference resource
        ↓
Claude picks agent_ads_meta_insights (or agent_ads_run for anything else)
        ↓
server.js translates tool params → CLI command → runs agent-ads
        ↓
JSON result goes back to Claude → answers you in plain English
```

The server has **two layers** so it covers every agent-ads command:

1. **Typed tools** (11 tools) — for the most common operations. Claude gets structured parameters with descriptions, so it fills them in accurately.
2. **Catch-all tool** (`agent_ads_run`) — runs ANY agent-ads command. For the 50+ commands not covered by typed tools (creatives, pixels, report-runs, async jobs, etc.).
3. **Resource** (`agent-ads-reference`) — a full command reference document that Claude reads. This teaches Claude every available command across all 6 platforms, so it knows what to pass to `agent_ads_run`.

### Tools included

| Tool | What it does |
|------|-------------|
| `agent_ads_run` | Run ANY agent-ads command (catch-all) |
| `agent_ads_auth_status` | Check auth across all platforms |
| `agent_ads_providers` | List available providers |
| `agent_ads_doctor` | Run doctor check for any provider |
| `agent_ads_list` | List any object type for any provider |
| `agent_ads_meta_insights` | Meta reporting with breakdowns |
| `agent_ads_google_gaql` | Google Ads GAQL queries |
| `agent_ads_tiktok_insights` | TikTok performance reporting |
| `agent_ads_pinterest_analytics` | Pinterest analytics + targeting |
| `agent_ads_linkedin_analytics` | LinkedIn adAnalytics queries |
| `agent_ads_x_analytics` | X/Twitter analytics |

---

## Files

| File | Purpose |
|------|---------|
| `server.js` | MCP server — tools + resource + SSE transport |
| `package.json` | Node dependencies |
| `Dockerfile` | Container build for Render |
| `render.yaml` | Render deployment config |

---

## Deploy to Render

### 1. Push to GitHub

```bash
cd agent-ads-mcp
git init && git add . && git commit -m "agent-ads MCP server"
gh repo create agent-ads-mcp --public --push --source .
```

### 2. Create service on Render

1. [render.com](https://render.com) → **New** → **Web Service**
2. Connect your `agent-ads-mcp` repo
3. Render auto-detects the Dockerfile
4. Pick **Starter** plan ($7/mo, always-on) or Free (sleeps after inactivity)
5. **Create Web Service**

### 3. Add environment variables

In Render dashboard → your service → **Environment**, add tokens for the platforms you use:

| Variable | Platform |
|----------|----------|
| `META_ADS_ACCESS_TOKEN` | Meta |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google |
| `GOOGLE_ADS_CLIENT_ID` | Google |
| `GOOGLE_ADS_CLIENT_SECRET` | Google |
| `GOOGLE_ADS_REFRESH_TOKEN` | Google |
| `TIKTOK_ADS_ACCESS_TOKEN` | TikTok |
| `TIKTOK_ADS_APP_ID` | TikTok |
| `TIKTOK_ADS_APP_SECRET` | TikTok |
| `PINTEREST_ADS_ACCESS_TOKEN` | Pinterest |
| `PINTEREST_ADS_APP_ID` | Pinterest |
| `PINTEREST_ADS_APP_SECRET` | Pinterest |
| `PINTEREST_ADS_REFRESH_TOKEN` | Pinterest |
| `LINKEDIN_ADS_ACCESS_TOKEN` | LinkedIn |
| `X_ADS_CONSUMER_KEY` | X |
| `X_ADS_CONSUMER_SECRET` | X |
| `X_ADS_ACCESS_TOKEN` | X |
| `X_ADS_ACCESS_TOKEN_SECRET` | X |

Only add the ones you need.

### 4. Verify

```
https://your-service.onrender.com/health → {"status":"ok"}
```

---

## Connect to Claude Desktop

Edit config file:
- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agent-ads": {
      "url": "https://your-service.onrender.com/sse"
    }
  }
}
```

Restart Claude Desktop. Ask: *"What tools do you have?"*

---

## Connect to ChatGPT Desktop

1. ChatGPT → **Settings** → **Connected Apps**
2. Add connector URL: `https://your-service.onrender.com/sse`
3. Use `@agent-ads` in chat

> ChatGPT MCP is beta for Business/Enterprise/Edu plans.

---

## Example prompts

- "Check my ad platform auth status"
- "List my Meta ad accounts"
- "Show last 7 days Meta spend broken down by age and gender for act_123"
- "Which Google campaigns spent the most last month?"
- "Show TikTok cost per conversion for each campaign"
- "List my Pinterest audiences"
- "Get daily LinkedIn campaign clicks for last week"
- "Show X campaign engagement metrics for March"
- "Preview the creative for Meta ad 12345"
- "Check my TikTok pixels"

---

## Notes

- **Read-only**: agent-ads never creates, modifies, or deletes anything.
- **Token expiry**: Meta tokens can be short-lived. TikTok expires every 24h. Update in Render Environment when needed.
- **Render free tier** sleeps after inactivity (~30s cold start). Starter ($7/mo) stays on.
