# 📡 agent-ads MCP Server

> Query **Meta, Google, TikTok, Pinterest, LinkedIn & X** ad platforms from Claude and ChatGPT — powered by [agent-ads](https://agent-ads.dev).

An MCP server that wraps the `agent-ads` CLI so AI assistants can query your ad accounts using natural language. Deploy once on Render, connect from any MCP client.

**Read-only** — never creates, modifies, or deletes anything on your ad platforms.

---

## How It Works

```
 "Show me last week's Meta spend by age"
                  │
                  ▼
     ┌──────────────────────┐
     │  Claude / ChatGPT    │
     │  picks the right     │
     │  MCP tool + params   │
     └──────────┬───────────┘
                │ Streamable HTTP + OAuth 2.1
                ▼
     ┌──────────────────────┐
     │  MCP Server (Render) │
     │  translates to CLI   │
     └──────────┬───────────┘
                │ spawns process
                ▼
     ┌──────────────────────┐
     │  agent-ads CLI       │
     │  calls ad platform   │
     └──────────┬───────────┘
                │ HTTPS
                ▼
     Meta / Google / TikTok / Pinterest / LinkedIn / X
```

You talk naturally. The AI picks the right tool. The server handles the rest.

---

## Authentication

The server implements **OAuth 2.1** with a password-protected login page. This is what Claude and ChatGPT require for remote MCP servers.

**How it works:**

1. You add the MCP URL in Claude/ChatGPT
2. The client auto-discovers OAuth endpoints and registers itself
3. Your browser opens a **login page** asking for a password
4. You enter the password you set on Render → connection approved
5. The client gets a token (expires after 1 hour, auto-refreshes)

**No password = no access.** Anyone without the password gets rejected.

### OAuth Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/.well-known/oauth-authorization-server` | OAuth metadata discovery |
| `/.well-known/oauth-protected-resource` | Protected resource metadata (RFC 9728) |
| `/register` | Dynamic Client Registration (RFC 7591) |
| `/authorize` | Login page → issues auth code |
| `/token` | Exchanges code for Bearer token |
| `/mcp` | MCP endpoint (protected) |

---

## Supported Platforms

| Platform | Auth Method | Key Commands |
|----------|------------|--------------|
| **Meta** (Facebook/Instagram) | Access token | Insights, campaigns, creatives, pixels, activities |
| **Google Ads** | OAuth + developer token | GAQL queries, campaigns, ad groups, customer hierarchy |
| **TikTok** | Access token + app credentials | Insights, campaigns, creatives, audiences, pixels |
| **Pinterest** | OAuth + app credentials | Analytics, targeting analytics, audiences, report runs |
| **LinkedIn** | Access token | adAnalytics, campaigns, creatives, campaign groups |
| **X** (Twitter) | OAuth 1.0a (4 keys) | Analytics, campaigns, line items, promoted tweets |

---

## MCP Tools

### Typed Tools (structured parameters)

| Tool | Description |
|------|-------------|
| `agent_ads_meta_insights` | Meta reporting — breakdowns, attribution windows, filtering |
| `agent_ads_google_gaql` | Google Ads GAQL queries (search + search-stream) |
| `agent_ads_tiktok_insights` | TikTok performance — BASIC, AUDIENCE, CATALOG reports |
| `agent_ads_pinterest_analytics` | Pinterest sync analytics + targeting analytics |
| `agent_ads_linkedin_analytics` | LinkedIn adAnalytics finder queries |
| `agent_ads_x_analytics` | X sync analytics (7-day window) |
| `agent_ads_list` | List any object for any provider (campaigns, ads, audiences, pixels, etc.) |
| `agent_ads_doctor` | Health check for any provider |
| `agent_ads_auth_status` | Auth status across all platforms |
| `agent_ads_providers` | List available providers |

### Catch-All Tool

| Tool | Description |
|------|-------------|
| `agent_ads_run` | Run **any** `agent-ads` command — covers all 50+ commands not in typed tools |

### Resource

The server includes a full command reference (`agent-ads-reference`) that Claude reads automatically. This teaches it every command, flag, and option across all 6 platforms — so even through the catch-all tool, it knows exactly what to run.

---

## Deploy to Render

### 1. Fork or clone this repo

```bash
git clone https://github.com/AlaaElsayed01/agent-ads-mcp.git
```

### 2. Create a Web Service on Render

1. Go to [render.com](https://render.com) → **New +** → **Web Service**
2. Connect your GitHub account and select this repo
3. Render auto-detects the `Dockerfile`
4. Settings:
   - **Name:** `agent-ads-mcp`
   - **Region:** closest to you
   - **Instance:** Starter ($7/mo, always-on) or Free (sleeps after inactivity)
5. Click **Create Web Service**

### 3. Add environment variables

Go to your Render service → **Environment**:

#### Required

| Variable | Purpose |
|----------|---------|
| `MCP_PASSWORD` | **Required.** Password for the login page when connecting from Claude/ChatGPT. Pick a strong password. |

#### Ad Platform Tokens

Add only the platforms you use:

<details>
<summary><strong>Meta</strong></summary>

| Variable | Required |
|----------|----------|
| `META_ADS_ACCESS_TOKEN` | Yes |

Generate at [Graph API Explorer](https://developers.facebook.com/tools/explorer/) with `ads_read` permission.
</details>

<details>
<summary><strong>Google Ads</strong></summary>

| Variable | Required |
|----------|----------|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Yes |
| `GOOGLE_ADS_CLIENT_ID` | Yes |
| `GOOGLE_ADS_CLIENT_SECRET` | Yes |
| `GOOGLE_ADS_REFRESH_TOKEN` | Yes |
| `GOOGLE_ADS_DEFAULT_CUSTOMER_ID` | Optional |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Optional (for MCC) |
</details>

<details>
<summary><strong>TikTok</strong></summary>

| Variable | Required |
|----------|----------|
| `TIKTOK_ADS_ACCESS_TOKEN` | Yes |
| `TIKTOK_ADS_APP_ID` | Yes |
| `TIKTOK_ADS_APP_SECRET` | Yes |
| `TIKTOK_ADS_REFRESH_TOKEN` | Optional |
| `TIKTOK_ADS_DEFAULT_ADVERTISER_ID` | Optional |

⚠️ TikTok tokens expire every 24 hours.
</details>

<details>
<summary><strong>Pinterest</strong></summary>

| Variable | Required |
|----------|----------|
| `PINTEREST_ADS_ACCESS_TOKEN` | Yes |
| `PINTEREST_ADS_APP_ID` | Yes |
| `PINTEREST_ADS_APP_SECRET` | Yes |
| `PINTEREST_ADS_REFRESH_TOKEN` | Yes |
| `PINTEREST_ADS_DEFAULT_AD_ACCOUNT_ID` | Optional |
</details>

<details>
<summary><strong>LinkedIn</strong></summary>

| Variable | Required |
|----------|----------|
| `LINKEDIN_ADS_ACCESS_TOKEN` | Yes |
| `LINKEDIN_ADS_DEFAULT_ACCOUNT_ID` | Optional |
</details>

<details>
<summary><strong>X (Twitter)</strong></summary>

| Variable | Required |
|----------|----------|
| `X_ADS_CONSUMER_KEY` | Yes |
| `X_ADS_CONSUMER_SECRET` | Yes |
| `X_ADS_ACCESS_TOKEN` | Yes |
| `X_ADS_ACCESS_TOKEN_SECRET` | Yes |
| `X_ADS_DEFAULT_ACCOUNT_ID` | Optional |
</details>

### 4. Verify

```
https://your-service.onrender.com/health
→ {"status":"ok","sessions":0}
```

---

## Connect Claude

1. Go to [claude.ai](https://claude.ai) or open Claude Desktop
2. **Settings** → **Connectors** → **Add custom connector**
3. Enter URL: `https://your-service.onrender.com/mcp`
4. Leave OAuth Client ID and Secret **empty** (auto-registered)
5. Click **Add**
6. **Your browser opens a login page** → enter your `MCP_PASSWORD`
7. Connected ✅

---

## Connect ChatGPT

> Requires Business, Enterprise, or Edu plan (MCP is in beta).

1. ChatGPT → **Settings** → **Connected Apps**
2. Add connector URL: `https://your-service.onrender.com/mcp`
3. **Your browser opens a login page** → enter your `MCP_PASSWORD`
4. Connected ✅ — use `@agent-ads` in chat or select from the **+** menu

---

## Example Prompts

| What you say | What happens |
|-------------|--------------|
| "Check my ad platform auth status" | Runs `agent-ads auth status` |
| "List my Meta ad accounts" | Runs `meta ad-accounts list` |
| "Show last 7 days Meta spend by age and gender" | Runs `meta insights query` with breakdowns |
| "Which Google campaigns spent the most last month?" | Runs `google gaql search` with GAQL |
| "Show TikTok cost per conversion for each campaign" | Runs `tiktok insights query` |
| "List my Pinterest audiences" | Runs `pinterest audiences list` |
| "Get daily LinkedIn campaign clicks for last week" | Runs `linkedin analytics query` |
| "Show X campaign engagement metrics" | Runs `x analytics query` |
| "Preview the creative for Meta ad 12345" | Runs `meta creatives preview` |
| "Check my TikTok pixels" | Runs `tiktok pixels list` |

---

## Important Notes

| Topic | Detail |
|-------|--------|
| **Security** | OAuth 2.1 with password-protected login. Read-only. Tokens expire after 1 hour. |
| **Token expiry** | Meta tokens can be short-lived. TikTok expires every 24h. Update in Render → Environment when needed. |
| **Render free tier** | Sleeps after inactivity (~30s cold start). Starter plan ($7/mo) stays always-on. |
| **No OS keychain** | Render/Docker has no keychain — ad platform tokens are read from environment variables. |
| **Upstream updates** | Uses `agent-ads` via npm — update by redeploying (picks up latest CLI version). |

---

## Project Structure

```
agent-ads-mcp/
├── server.js        # MCP server: OAuth + tools + command reference + Streamable HTTP
├── package.json     # Dependencies
├── Dockerfile       # Container build for Render
├── render.yaml      # Render deployment config
└── .gitignore
```

---

## Credits

Built on top of [agent-ads](https://github.com/bengoism/agent-ads) (MIT license) — a Rust CLI for querying ad platform APIs.

## License

MIT
