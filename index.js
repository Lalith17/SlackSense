require('dotenv').config();

const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Minimum message length to consider as a meaningful result
const MIN_MESSAGE_LENGTH = 20;

// Number of top matches to return
const TOP_MATCHES = 3;

/**
 * Score a message against a set of query keywords.
 * Returns the number of keywords found in the message text.
 */
function scoreMessage(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.reduce((score, word) => {
    return score + (lower.includes(word) ? 1 : 0);
  }, 0);
}

/**
 * Extract keywords from the user's query, stripping the bot mention
 * (e.g. "<@U12345678>") and common stop-words.
 */
function extractKeywords(query) {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'in', 'on',
    'at', 'to', 'for', 'of', 'and', 'or', 'but', 'not', 'with',
    'this', 'that', 'it', 'its', 'i', 'you', 'we', 'they', 'me',
    'him', 'her', 'us', 'them', 'what', 'how', 'when', 'where', 'why',
  ]);

  return query
    .replace(/<@[A-Z0-9]+>/g, '') // remove mention tokens like <@U12345>
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

app.event('app_mention', async ({ event, client, say }) => {
  const { channel, text } = event;

  console.log(`[SlackSense] Mention received in channel ${channel}: "${text}"`);

  const keywords = extractKeywords(text);
  console.log(`[SlackSense] Extracted keywords: ${keywords.join(', ') || '(none)'}`);

  if (keywords.length === 0) {
    await say('Please ask me a question and I\'ll search the channel history for relevant messages!');
    return;
  }

  // Fetch recent channel history
  let messages = [];
  try {
    const result = await client.conversations.history({
      channel,
      limit: 50,
    });
    messages = result.messages || [];
    console.log(`[SlackSense] Fetched ${messages.length} messages from channel history`);
  } catch (err) {
    console.error('[SlackSense] Error fetching channel history:', err.message);
    await say('Sorry, I couldn\'t retrieve the channel history. Make sure I have the `channels:history` scope.');
    return;
  }

  // Filter out bot messages, the triggering mention itself, and short messages
  const candidates = messages.filter((msg) => {
    if (msg.bot_id) return false;
    if (msg.subtype) return false;
    if (!msg.text || msg.text.trim().length < MIN_MESSAGE_LENGTH) return false;
    if (msg.ts === event.ts) return false;
    return true;
  });

  console.log(`[SlackSense] ${candidates.length} candidate messages after filtering`);

  // Score each candidate against the query keywords
  const scored = candidates
    .map((msg) => ({ text: msg.text, score: scoreMessage(msg.text, keywords) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_MATCHES);

  if (scored.length === 0) {
    await say('I searched the channel history but couldn\'t find any messages related to your query.');
    return;
  }

  const resultLines = scored.map((item, i) => `*${i + 1}.* ${item.text}`).join('\n\n');
  await say(`Here's something I found:\n\n${resultLines}`);

  console.log(`[SlackSense] Responded with ${scored.length} match(es)`);
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('[SlackSense] Bot is running on port', process.env.PORT || 3000);
})();
