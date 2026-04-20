# SlackSense

A minimal Slack bot built with Node.js and the [Bolt framework](https://github.com/slackapi/bolt-js).  
When mentioned in a channel, SlackSense fetches the last 50 messages, performs keyword matching against your query, and replies with the top 3 most relevant past messages — no database, no AI APIs.

---

## Features

- Responds to `app_mention` events
- Fetches up to 50 recent channel messages via `conversations.history`
- Filters out bot messages and very short messages
- Performs simple keyword scoring to rank results
- Returns up to 3 best-matching messages

---

## Prerequisites

- Node.js ≥ 18
- A Slack app with the following **Bot Token Scopes**:
  - `app_mentions:read`
  - `channels:history`
  - `chat:write`
- The **Event Subscriptions** URL pointing to `https://<your-host>/slack/events` with the `app_mention` event subscribed

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/Lalith17/SlackSense.git
cd SlackSense
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your Slack credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
```

You can find these values in your [Slack App settings](https://api.slack.com/apps):
- **Bot Token** → *OAuth & Permissions → Bot User OAuth Token*
- **Signing Secret** → *Basic Information → App Credentials*

### 4. Run the bot

```bash
npm start
```

The bot listens on port **3000** by default. Set the `PORT` environment variable to change it.

---

## Usage

1. Invite the bot to a channel: `/invite @SlackSense`
2. Mention the bot with a question:

   ```
   @SlackSense how do I reset my password?
   ```

3. The bot replies with the most relevant past messages from that channel.

---

## Project Structure

```
SlackSense/
├── index.js        # Main bot logic
├── package.json    # Dependencies and scripts
├── .env.example    # Environment variable template
└── README.md       # This file
```

---

## How It Works

1. The `app_mention` event fires when someone mentions the bot.
2. The bot strips the mention token and stop-words from the query to extract keywords.
3. It calls `conversations.history` to fetch the last 50 messages.
4. Each message is scored by how many keywords it contains.
5. The top 3 scoring messages (with at least 1 keyword hit) are returned.