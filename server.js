import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";
import express from "express";

const exec = promisify(execFile);
const PORT = process.env.PORT || 3000;

async function run(args) {
  try {
    const { stdout, stderr } = await exec("npx", ["-y", "agent-ads", ...args], {
      timeout: 120_000,
      maxBuffer: 5 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1" },
    });
    return stdout + (stderr ? `\n--- stderr ---\n${stderr}` : "");
  } catch (e) {
    return e.stdout || e.stderr || e.message;
  }
}

function parseCommand(str) {
  return (str.match(/(?:[^\s"]+|"[^"]*")+/g) || []).map((a) => a.replace(/^"|"$/g, ""));
}

const server = new McpServer({ name: "agent-ads", version: "1.0.0" });

const SKILL_DOC = `# agent-ads Full Command Reference

Read-only CLI for ad platform APIs. Every command: agent-ads <provider> <command>.
Providers: meta, google, tiktok, pinterest, linkedin, x

## GLOBAL
- agent-ads providers list
- agent-ads auth status
- agent-ads auth clear
- agent-ads <provider> doctor [--api]
- agent-ads <provider> auth set | status | delete
- agent-ads <provider> config path | show | validate

Shared output flags: --format json|jsonl|csv  --output PATH  --pretty  --envelope  --include-meta  --all  --max-items N  -q (quiet)  -v (verbose)

## META (Facebook/Instagram)

### Auth
- meta auth set (store token in OS credential store)
- meta auth status / delete
- Env: META_ADS_ACCESS_TOKEN
- Permissions: ads_read (required), business_management (optional, for businesses list)

### Discovery
- meta businesses list [--all] [--fields id,name,verification_status]
- meta ad-accounts list [--business-id ID] [--scope accessible|owned|pending-client] [--fields id,name,account_status,currency,timezone_name] [--all]
- meta campaigns list --account ACT_ID [--fields id,name,status,objective] [--all]
- meta adsets list --account ACT_ID [--fields id,name,campaign_id,status,daily_budget] [--all]
- meta ads list --account ACT_ID [--fields id,name,adset_id,status] [--all]

### Insights (sync)
- meta insights query --account ACT_ID --fields FIELDS [--level account|campaign|adset|ad] [--since YYYY-MM-DD --until YYYY-MM-DD | --date-preset today|yesterday|last_7d|last_14d|last_28d|last_30d|last_90d|this_month|last_month] [--time-increment 1|7|monthly|all_days] [--breakdowns age,gender,country,placement,publisher_platform,device_platform] [--action-breakdowns action_type,action_device,action_destination] [--attribution-windows 1d_click,7d_click,1d_view] [--filter JSON] [--filter-file PATH] [--sort spend_descending] [--fields-file PATH] [--page-size N] [--cursor C] [--all] [--max-items N]
  NOTE: --account and --object are mutually exclusive. --action-breakdowns requires 'actions' in --fields. --time-increment 'daily' is invalid, use 1.

### Insights (async)
- meta insights export --account ACT_ID --fields FIELDS [--async --wait] [--poll-interval-seconds 5] [--wait-timeout-seconds 3600] [same flags as insights query]

### Report Runs (explicit async lifecycle)
- meta report-runs submit --account ACT_ID --level LEVEL --fields FIELDS --since DATE --until DATE
- meta report-runs status --id REPORT_RUN_ID
- meta report-runs wait --id REPORT_RUN_ID [--poll-interval-seconds 10] [--wait-timeout-seconds 1800]
- meta report-runs results --id REPORT_RUN_ID [--all] [--fields FIELDS] [--format csv --output FILE]

### Creative & Changes
- meta creatives get --id CREATIVE_ID [--fields id,name,object_story_spec,asset_feed_spec,thumbnail_url]
- meta creatives preview --ad AD_ID --ad-format MOBILE_FEED_STANDARD|DESKTOP_FEED_STANDARD [--render-type FALLBACK]
- meta creatives preview --creative CREATIVE_ID --ad-format FORMAT
- meta activities list --account ACT_ID [--since ISO8601] [--until ISO8601] [--category AD|CAMPAIGN|BUDGET] [--oid OBJECT_ID] [--business-id ID] [--add-children] [--all]

### Tracking & Measurement
- meta custom-conversions list --account ACT_ID [--all]
- meta pixels list --account ACT_ID [--all] [--fields id,name,last_fired_time,match_rate_approx]
- meta datasets get --id DATASET_ID [--fields id,name,event_stats,match_rate_approx]
- meta pixel-health get --pixel PIXEL_ID [--event Purchase|Lead] [--start-time DATE] [--end-time DATE] [--aggregation LEVEL] [--event-source SOURCE]

### Meta Pagination: --page-size N, --cursor C, --all, --max-items N

## GOOGLE ADS

### Auth
- google auth set (stores developer token, client ID, client secret, refresh token)
- google auth status / delete
- Env: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN
- Optional: GOOGLE_ADS_DEFAULT_CUSTOMER_ID, GOOGLE_ADS_LOGIN_CUSTOMER_ID (for manager/MCC accounts)

### Discovery
- google customers list [--all]
- google customers hierarchy --customer-id CID [--all]
- google campaigns list --customer-id CID [--all]
- google adgroups list --customer-id CID [--all]
- google ads list --customer-id CID [--all]

### GAQL Queries
- google gaql search --customer-id CID --query "GAQL" [--login-customer-id MCC_ID] [--page-token T] [--all] [--max-items N]
- google gaql search --customer-id CID --query-file FILE [same flags]
- google gaql search-stream --customer-id CID --query "GAQL" [--format csv --output FILE] [--max-items N]
- google gaql search-stream --customer-id CID --query-file FILE [same flags]
  NOTE: search uses page-token pagination. search-stream has no page tokens, use --max-items.

### Google Pagination: --page-token T, --all, --max-items N

## TIKTOK

### Auth
- tiktok auth set (access token only)
- tiktok auth set --refresh-token (access + refresh token)
- tiktok auth set --full (app ID, app secret, access token, optional refresh token)
- tiktok auth set --stdin [--refresh-token|--full] (pipe tokens)
- tiktok auth status / delete
- tiktok auth refresh [--app-id ID --app-secret SECRET] (rotates expired token)
- Env: TIKTOK_ADS_ACCESS_TOKEN, TIKTOK_ADS_REFRESH_TOKEN, TIKTOK_ADS_APP_ID, TIKTOK_ADS_APP_SECRET
- Optional: TIKTOK_ADS_DEFAULT_ADVERTISER_ID
- NOTE: Access tokens expire every 24 hours. Refresh tokens expire after 1 year.

### Discovery
- tiktok advertisers list --app-id ID --app-secret SECRET (or use env vars)
- tiktok advertisers info --advertiser-id ID [--fields display_name,company,status]
- tiktok campaigns list --advertiser-id ID [--filter JSON] [--all]
- tiktok adgroups list --advertiser-id ID [--filter JSON] [--all]
- tiktok ads list --advertiser-id ID [--fields ad_id,ad_name,adgroup_id,status] [--all]

### Insights (sync)
- tiktok insights query --advertiser-id ID --report-type BASIC|AUDIENCE|PLAYABLE_MATERIAL|CATALOG --dimensions DIMS --metrics METRICS [--data-level AUCTION_CAMPAIGN|AUCTION_ADGROUP|AUCTION_AD|AUCTION_ADVERTISER] [--start-date YYYY-MM-DD --end-date YYYY-MM-DD] [--filter JSON] [--filter-file PATH] [--order-field METRIC --order-type ASC|DESC] [--query-lifetime] [--page N --page-size N] [--all] [--max-items N]
  Common dimensions: stat_time_day, stat_time_hour, campaign_id, adgroup_id, ad_id, country_code, gender, age
  Common metrics: spend, impressions, clicks, cpc, cpm, ctr, conversion, cost_per_conversion, conversion_rate, reach, frequency, video_play_actions, video_watched_2s, video_watched_6s

### Report Runs (async)
- tiktok report-runs submit --advertiser-id ID --report-type TYPE --data-level LEVEL --dimensions DIMS --metrics METRICS --start-date DATE --end-date DATE
- tiktok report-runs status --advertiser-id ID --task-id TASK_ID
- tiktok report-runs cancel --advertiser-id ID --task-id TASK_ID

### Creative & Tracking
- tiktok creatives videos --advertiser-id ID [--filter JSON] [--all]
- tiktok creatives images --advertiser-id ID --image-id IMG1,IMG2
- tiktok pixels list --advertiser-id ID [--all]
- tiktok audiences list --advertiser-id ID [--all]

### TikTok Pagination: --page N (1-indexed), --page-size N, --all, --max-items N

## PINTEREST

### Auth
- pinterest auth set (app ID, app secret, access token, refresh token)
- pinterest auth status / delete
- pinterest auth refresh (exchanges refresh token for new access token)
- Env: PINTEREST_ADS_APP_ID, PINTEREST_ADS_APP_SECRET, PINTEREST_ADS_ACCESS_TOKEN, PINTEREST_ADS_REFRESH_TOKEN
- Optional: PINTEREST_ADS_DEFAULT_AD_ACCOUNT_ID

### Discovery
- pinterest ad-accounts list [--all]
- pinterest ad-accounts get --ad-account-id ID
- pinterest campaigns list --ad-account-id ID [--all]
- pinterest adgroups list --ad-account-id ID [--all]
- pinterest ads list --ad-account-id ID [--all]
- pinterest audiences list --ad-account-id ID [--all]
- pinterest audiences get --ad-account-id ID --audience-id AID

### Analytics (sync)
- pinterest analytics query --ad-account-id ID --columns COLS --start-date DATE --end-date DATE [--level campaign|ad_group|ad|ad_pin] [--granularity DAY|WEEK|MONTH|TOTAL] [--campaign-id CID] [--all]

### Targeting Analytics
- pinterest targeting-analytics query --ad-account-id ID --targeting-type GENDER|AGE_BUCKET|LOCATION|INTEREST|KEYWORD|... --columns COLS [--start-date DATE --end-date DATE]

### Report Runs (async)
- pinterest report-runs submit --ad-account-id ID --level CAMPAIGN|AD_GROUP|... --start-date DATE --end-date DATE --granularity DAY --columns COLS
- pinterest report-runs status --ad-account-id ID --token REPORT_TOKEN
- pinterest report-runs wait --ad-account-id ID --token REPORT_TOKEN

### Pinterest Pagination: --bookmark B, --page-size N, --all, --max-items N

## LINKEDIN

### Auth
- linkedin auth set (access token only)
- linkedin auth status / delete
- Env: LINKEDIN_ADS_ACCESS_TOKEN
- Optional: LINKEDIN_ADS_DEFAULT_ACCOUNT_ID, LINKEDIN_ADS_API_VERSION (default 202603)

### Discovery
- linkedin ad-accounts list [--all] (includes authenticated_user_role)
- linkedin ad-accounts get --account-id ID
- linkedin ad-accounts search [--status ACTIVE|DRAFT|CANCELED] [--all]
- linkedin campaign-groups list --account-id ID [--all]
- linkedin campaigns list --account-id ID [--all]
- linkedin campaigns get --campaign-id ID
- linkedin creatives list --account-id ID [--all]
- linkedin creatives get --creative-id ID
  NOTE: IDs accept raw numeric or full URNs. CLI normalizes internally.

### Analytics
- linkedin analytics query --finder statistics|analytics|attributed-revenue-metrics --account-id ID --fields FIELDS [--pivot CAMPAIGN|CREATIVE|COMPANY|CAMPAIGN_GROUP] [--time-granularity DAILY|MONTHLY|ALL] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--campaign-id CID] [--creative-id CRID] [--start N] [--page-size N | --count N] [--all] [--max-items N]
  NOTE: --finder statistics: exactly one --pivot, requires --time-granularity
  NOTE: --finder analytics: one to three --pivot values
  NOTE: --finder attributed-revenue-metrics: one to three pivots (ACCOUNT/CAMPAIGN_GROUP/CAMPAIGN only), requires --since and --until, 30-366 day range

### LinkedIn List Pagination: --page-token T, --page-size N, --all, --max-items N
### LinkedIn Report Pagination: --start N (offset), --page-size N | --count N, --all, --max-items N

## X (TWITTER)

### Auth
- x auth set (consumer key, consumer secret, access token, access token secret — OAuth 1.0a)
- x auth status / delete
- Env: X_ADS_CONSUMER_KEY, X_ADS_CONSUMER_SECRET, X_ADS_ACCESS_TOKEN, X_ADS_ACCESS_TOKEN_SECRET
- Optional: X_ADS_DEFAULT_ACCOUNT_ID

### Discovery
- x accounts list
- x accounts get --account-id ID
- x authenticated-user-access get --account-id ID
- x campaigns list --account-id ID [--all]
- x line-items list --account-id ID [--all]
- x funding-instruments list --account-id ID [--all]
- x promotable-users list --account-id ID [--all]

### Creative & Media
- x promoted-tweets list --account-id ID [--all]
- x promoted-accounts list --account-id ID [--all]
- x draft-tweets list --account-id ID [--all]
- x scheduled-tweets list --account-id ID [--all]
- x cards list --account-id ID [--all]
- x account-media list --account-id ID [--all]
- x media-library list --account-id ID [--all]
- x account-apps list --account-id ID [--all]
- x scoped-timeline list --account-id ID [--all]

### Audiences & Measurement
- x custom-audiences list --account-id ID [--all]
- x do-not-reach-lists list --account-id ID [--all]
- x targeting-criteria list --account-id ID [--all]
- x web-event-tags list --account-id ID [--all]
- x app-lists list --account-id ID [--all]
- x ab-tests list --account-id ID [--all]

### Analytics (sync — max 7-day window)
- x analytics query --account-id ID --entity campaign|line_item|promoted_tweet|media_creative --entity-id EID --start-time ISO8601 --end-time ISO8601 --metric-group engagement|billing|video|media|web_conversion|mobile_conversion|life_time_value --placement all-on-twitter|publisher-network [--granularity day|hour|total]

### Analytics (other)
- x analytics reach --account-id ID [flags]
- x analytics active-entities --account-id ID [flags] (requires whole-hour RFC 3339 timestamps)

### Analytics Jobs (async — max 90-day window, max 20 entity IDs)
- x analytics jobs submit --account-id ID --entity TYPE --entity-id EID --start-time ISO --end-time ISO --metric-group GROUPS --placement PLACEMENT [--granularity day]
- x analytics jobs status --account-id ID --job-id JID
- x analytics jobs results --account-id ID --job-id JID

### X Pagination: --cursor C, --page-size N, --all, --max-items N
`;

server.resource("agent-ads-reference", "agent-ads://reference", async (uri) => ({
  contents: [{ uri: uri.href, mimeType: "text/plain", text: SKILL_DOC }],
}));

// --- TOOLS ---

server.tool(
  "agent_ads_run",
  "Run any agent-ads CLI command. Read the agent-ads-reference resource first to see all available commands. Pass the full command after 'agent-ads'.",
  { command: z.string().describe("Full command after 'agent-ads', e.g. 'meta campaigns list --account act_123' or 'tiktok creatives videos --advertiser-id 123'") },
  async ({ command }) => ({
    content: [{ type: "text", text: await run(parseCommand(command)) }],
  })
);

server.tool("agent_ads_auth_status", "Check auth status across all ad platforms", {}, async () => ({
  content: [{ type: "text", text: await run(["auth", "status"]) }],
}));

server.tool("agent_ads_providers", "List available ad platform providers", {}, async () => ({
  content: [{ type: "text", text: await run(["providers", "list"]) }],
}));

server.tool(
  "agent_ads_doctor",
  "Run doctor check for a provider (meta, google, tiktok, pinterest, linkedin, x)",
  {
    provider: z.enum(["meta", "google", "tiktok", "pinterest", "linkedin", "x"]),
    api: z.boolean().optional().describe("Also test API connectivity"),
  },
  async ({ provider, api }) => {
    const a = [provider, "doctor"];
    if (api) a.push("--api");
    return { content: [{ type: "text", text: await run(a) }] };
  }
);

server.tool(
  "agent_ads_list",
  "List objects for any provider. Covers: businesses, ad-accounts, campaigns, adsets, adgroups, ads, advertisers, audiences, creatives, line-items, promoted-tweets, promoted-accounts, draft-tweets, scheduled-tweets, cards, account-media, media-library, account-apps, scoped-timeline, pixels, custom-audiences, do-not-reach-lists, targeting-criteria, web-event-tags, app-lists, ab-tests, campaign-groups, funding-instruments, promotable-users, custom-conversions.",
  {
    provider: z.enum(["meta", "google", "tiktok", "pinterest", "linkedin", "x"]),
    object: z.string().describe("Object type to list, e.g. 'campaigns', 'ad-accounts', 'promoted-tweets'"),
    account_id: z.string().optional().describe("Account/customer/advertiser ID"),
    extra_args: z.string().optional().describe("Additional flags, e.g. '--business-id 123 --scope owned --all --fields id,name'"),
  },
  async ({ provider, object, account_id, extra_args }) => {
    const a = [provider, object, "list"];
    if (account_id) {
      const flag = { meta: "--account", google: "--customer-id", tiktok: "--advertiser-id", pinterest: "--ad-account-id", linkedin: "--account-id", x: "--account-id" }[provider];
      a.push(flag, account_id);
    }
    if (extra_args) a.push(...parseCommand(extra_args));
    return { content: [{ type: "text", text: await run(a) }] };
  }
);

server.tool(
  "agent_ads_meta_insights",
  "Query Meta (Facebook/Instagram) ad insights. Supports breakdowns, action breakdowns, attribution windows, filtering, sorting.",
  {
    account: z.string().describe("Ad account ID, e.g. act_12345678"),
    fields: z.string().describe("Comma-separated: spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type"),
    level: z.string().optional().describe("account, campaign, adset, ad"),
    date_preset: z.string().optional().describe("today,yesterday,last_7d,last_14d,last_28d,last_30d,last_90d,this_month,last_month"),
    since: z.string().optional().describe("Start date YYYY-MM-DD (use with --until)"),
    until: z.string().optional().describe("End date YYYY-MM-DD (use with --since)"),
    time_increment: z.string().optional().describe("1 for daily, 7 for weekly, monthly, all_days. NOT 'daily'."),
    breakdowns: z.string().optional().describe("age,gender,country,placement,publisher_platform,device_platform"),
    action_breakdowns: z.string().optional().describe("action_type,action_device,action_destination. REQUIRES 'actions' in fields."),
    extra_args: z.string().optional().describe("Additional flags: --attribution-windows 1d_click,7d_click --filter JSON --sort spend_descending --all --max-items N"),
  },
  async ({ account, fields, level, date_preset, since, until, time_increment, breakdowns, action_breakdowns, extra_args }) => {
    const a = ["meta", "insights", "query", "--account", account, "--fields", fields];
    if (level) a.push("--level", level);
    if (date_preset) a.push("--date-preset", date_preset);
    if (since) a.push("--since", since);
    if (until) a.push("--until", until);
    if (time_increment) a.push("--time-increment", time_increment);
    if (breakdowns) a.push("--breakdowns", breakdowns);
    if (action_breakdowns) a.push("--action-breakdowns", action_breakdowns);
    if (extra_args) a.push(...parseCommand(extra_args));
    return { content: [{ type: "text", text: await run(a) }] };
  }
);

server.tool(
  "agent_ads_google_gaql",
  "Run a Google Ads GAQL query (search or search-stream).",
  {
    customer_id: z.string().describe("Google Ads customer ID"),
    query: z.string().optional().describe("Inline GAQL query"),
    query_file: z.string().optional().describe("Path to .sql file with GAQL query"),
    stream: z.boolean().optional().describe("Use search-stream instead of search (better for large results)"),
    login_customer_id: z.string().optional().describe("Manager/MCC account ID"),
    extra_args: z.string().optional().describe("Additional flags: --all --max-items N --format csv --output FILE"),
  },
  async ({ customer_id, query, query_file, stream, login_customer_id, extra_args }) => {
    const cmd = stream ? "search-stream" : "search";
    const a = ["google", "gaql", cmd, "--customer-id", customer_id];
    if (query) a.push("--query", query);
    if (query_file) a.push("--query-file", query_file);
    if (login_customer_id) a.push("--login-customer-id", login_customer_id);
    if (extra_args) a.push(...parseCommand(extra_args));
    return { content: [{ type: "text", text: await run(a) }] };
  }
);

server.tool(
  "agent_ads_tiktok_insights",
  "Query TikTok ad performance. Supports BASIC, AUDIENCE, PLAYABLE_MATERIAL, CATALOG report types.",
  {
    advertiser_id: z.string().describe("TikTok advertiser ID"),
    metrics: z.string().describe("Comma-separated: spend,impressions,clicks,cpc,cpm,ctr,conversion,cost_per_conversion,reach,frequency"),
    dimensions: z.string().describe("Comma-separated: stat_time_day,stat_time_hour,campaign_id,adgroup_id,ad_id,country_code,gender,age"),
    report_type: z.string().optional().describe("BASIC (default), AUDIENCE, PLAYABLE_MATERIAL, CATALOG"),
    data_level: z.string().optional().describe("AUCTION_CAMPAIGN, AUCTION_ADGROUP, AUCTION_AD, AUCTION_ADVERTISER"),
    start_date: z.string().optional().describe("YYYY-MM-DD"),
    end_date: z.string().optional().describe("YYYY-MM-DD"),
    extra_args: z.string().optional().describe("Additional flags: --filter JSON --order-field spend --order-type DESC --query-lifetime --all --max-items N"),
  },
  async ({ advertiser_id, metrics, dimensions, report_type, data_level, start_date, end_date, extra_args }) => {
    const a = ["tiktok", "insights", "query", "--advertiser-id", advertiser_id, "--metrics", metrics, "--dimensions", dimensions];
    if (report_type) a.push("--report-type", report_type);
    if (data_level) a.push("--data-level", data_level);
    if (start_date) a.push("--start-date", start_date);
    if (end_date) a.push("--end-date", end_date);
    if (extra_args) a.push(...parseCommand(extra_args));
    return { content: [{ type: "text", text: await run(a) }] };
  }
);

server.tool(
  "agent_ads_pinterest_analytics",
  "Query Pinterest ad analytics (sync) or targeting analytics.",
  {
    ad_account_id: z.string().describe("Pinterest ad account ID"),
    columns: z.string().describe("Comma-separated: IMPRESSION_1,CLICKTHROUGH_1,SPEND_IN_DOLLAR,TOTAL_CONVERSIONS,TOTAL_PAGE_VISIT"),
    start_date: z.string().describe("YYYY-MM-DD"),
    end_date: z.string().describe("YYYY-MM-DD"),
    level: z.string().optional().describe("campaign, ad_group, ad, ad_pin"),
    granularity: z.string().optional().describe("DAY, WEEK, MONTH, TOTAL"),
    targeting: z.boolean().optional().describe("Use targeting-analytics query instead"),
    targeting_type: z.string().optional().describe("For targeting-analytics: GENDER,AGE_BUCKET,LOCATION,INTEREST,KEYWORD"),
    extra_args: z.string().optional().describe("Additional flags: --campaign-id CID --all"),
  },
  async ({ ad_account_id, columns, start_date, end_date, level, granularity, targeting, targeting_type, extra_args }) => {
    const cmd = targeting ? "targeting-analytics" : "analytics";
    const a = ["pinterest", cmd, "query", "--ad-account-id", ad_account_id, "--columns", columns, "--start-date", start_date, "--end-date", end_date];
    if (level) a.push("--level", level);
    if (granularity) a.push("--granularity", granularity);
    if (targeting_type) a.push("--targeting-type", targeting_type);
    if (extra_args) a.push(...parseCommand(extra_args));
    return { content: [{ type: "text", text: await run(a) }] };
  }
);

server.tool(
  "agent_ads_linkedin_analytics",
  "Query LinkedIn adAnalytics. Supports statistics, analytics, and attributed-revenue-metrics finders.",
  {
    account_id: z.string().describe("LinkedIn ad account ID"),
    fields: z.string().describe("Comma-separated: impressions,clicks,costInLocalCurrency,externalWebsiteConversions"),
    finder: z.string().optional().describe("statistics (default), analytics, attributed-revenue-metrics"),
    pivot: z.string().optional().describe("CAMPAIGN,CREATIVE,COMPANY,CAMPAIGN_GROUP (1 for statistics, up to 3 for others)"),
    time_granularity: z.string().optional().describe("DAILY, MONTHLY, ALL"),
    since: z.string().optional().describe("YYYY-MM-DD"),
    until: z.string().optional().describe("YYYY-MM-DD"),
    extra_args: z.string().optional().describe("Additional flags: --campaign-id CID --creative-id CRID --start N --count N --all --max-items N"),
  },
  async ({ account_id, fields, finder, pivot, time_granularity, since, until, extra_args }) => {
    const a = ["linkedin", "analytics", "query", "--finder", finder || "statistics", "--account-id", account_id, "--fields", fields];
    if (pivot) a.push("--pivot", pivot);
    if (time_granularity) a.push("--time-granularity", time_granularity);
    if (since) a.push("--since", since);
    if (until) a.push("--until", until);
    if (extra_args) a.push(...parseCommand(extra_args));
    return { content: [{ type: "text", text: await run(a) }] };
  }
);

server.tool(
  "agent_ads_x_analytics",
  "Query X (Twitter) ad analytics. Sync queries max 7-day window. For longer ranges use agent_ads_run with 'x analytics jobs submit'.",
  {
    account_id: z.string().describe("X Ads account ID"),
    entity: z.string().describe("campaign, line_item, promoted_tweet, media_creative"),
    entity_id: z.string().describe("Entity ID"),
    start_time: z.string().describe("ISO 8601, e.g. 2026-03-01T00:00:00Z"),
    end_time: z.string().describe("ISO 8601"),
    metric_group: z.string().describe("engagement,billing,video,media,web_conversion,mobile_conversion,life_time_value"),
    granularity: z.string().optional().describe("day, hour, total"),
    placement: z.string().optional().describe("all-on-twitter (default), publisher-network"),
  },
  async ({ account_id, entity, entity_id, start_time, end_time, metric_group, granularity, placement }) => {
    const a = ["x", "analytics", "query", "--account-id", account_id, "--entity", entity, "--entity-id", entity_id, "--start-time", start_time, "--end-time", end_time, "--metric-group", metric_group, "--placement", placement || "all-on-twitter"];
    if (granularity) a.push("--granularity", granularity);
    return { content: [{ type: "text", text: await run(a) }] };
  }
);

// --- SSE transport for Render ---
const app = express();
app.use(express.json());
const sessions = {};
const AUTH_KEY = process.env.MCP_AUTH_KEY;

function checkAuth(req, res, next) {
  if (AUTH_KEY && req.query.key !== AUTH_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/sse", checkAuth, async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  sessions[transport.sessionId] = transport;
  res.on("close", () => delete sessions[transport.sessionId]);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const t = sessions[req.query.sessionId];
  if (!t) return res.status(400).json({ error: "Unknown session" });
  await t.handlePostMessage(req, res);
});

app.get("/health", (_, res) => res.json({ status: "ok" }));
app.listen(PORT, () => console.log(`agent-ads MCP running on port ${PORT}`));
