// Scenario: Conversational RAG explainer.
// Story: Leo, a Cloudly customer, asks the support assistant about refunds for annual plans, then the
// follow-up "What about monthly ones?", which only works because the query rewriter resolves it against
// the conversation. Each step gets a checklist card. Edit here, re-run stills, then render.
// History and feedback: LOG.md. Scene keys are documented in ../mcp-multi-tenant/video.mjs.
const A = '#fbbf24'; // request path
const R = '#f87171'; // blocked / rejected
const G = '#34d399'; // answers and memory writes

const Q1 = 'What’s the refund policy for annual plans?';
const Q2 = 'What about monthly ones?';

const scenes = [
  {
    chip: 'Overview',
    title: true,
    focus: '*',
    lines: [
      'This diagram shows a conversational RAG assistant.',
      'It answers questions from your own documents, and it remembers the conversation, so follow-up questions work too.',
      'Every turn is screened, rewritten, retrieved, reranked, grounded, guarded, and remembered.',
    ],
  },
  {
    chip: 'Meet Leo',
    focus: ['Leo', 'User Question'],
    char: {
      moods: [{ line: 0, mood: 'frustrated' }],
      pops: [
        { line: 0, delay: 0.6, kind: 'say', text: 'Ten minutes in the help center, and still nothing… 😤' },
        { line: 1, kind: 'say', text: Q1 },
      ],
    },
    lines: [
      'Meet Leo. He’s a Cloudly customer, and he’s spent ten minutes digging through the help center.',
      'So he asks the support assistant: what’s the refund policy for annual plans?',
      'Let’s follow his question through the flow.',
    ],
  },
  {
    chip: '01 · Input guard',
    focus: ['Leo', 'User Question', 'Input Guard', 'Polite Refusal'],
    edges: [['Leo', 'User Question', A], ['User Question', 'Input Guard', A], ['Input Guard', 'Polite Refusal', R]],
    card: {
      title: 'What the input guard screens',
      items: [
        { line: 1, text: 'Jailbreaks: <i>“ignore your rules and…”</i>' },
        { line: 1, text: 'Prompt injection, off-topic requests, abuse' },
        { line: 2, text: 'Blocked → a fixed, polite refusal. No retrieval, no model call, almost no cost' },
        { line: 3, text: '✓ Leo’s question passes' },
      ],
    },
    char: { moods: [{ line: 0, mood: 'neutral' }], pops: [{ line: 0, kind: 'say', text: Q1 }] },
    lines: [
      'First, the input guard screens the message, before anything expensive happens.',
      'It looks for jailbreak attempts, prompt injection, off-topic requests, and abuse.',
      'A blocked message gets a fixed, polite refusal. It never reaches retrieval or a model, so it costs almost nothing.',
      'Leo’s question is fine, so it passes.',
    ],
  },
  {
    chip: '02 · Query rewriter',
    focus: ['Input Guard', 'Query Rewriter', 'Recent Turns'],
    edges: [['Input Guard', 'Query Rewriter', A], ['Recent Turns', 'Query Rewriter', A]],
    card: {
      title: 'Query rewriter',
      items: [
        { line: 0, text: 'In: the new message + the recent turns' },
        { line: 0, text: 'Out: one <b>standalone</b> search query' },
        { line: 1, text: 'Turn 1: nothing to resolve → comes out unchanged' },
        { line: 2, text: 'Small, fast model (Haiku), temperature 0: same input, same query' },
      ],
    },
    lines: [
      'Next, the query rewriter. It reads the new message together with the recent conversation, and writes one standalone search query.',
      'This is Leo’s first message, so there’s nothing to resolve. The question comes out unchanged.',
      'It runs on a small, fast model at temperature zero, so the same input always gives the same query.',
      'Remember this step. It matters a lot on the next turn.',
    ],
  },
  {
    chip: '03 · Retrieval',
    focus: ['Query Rewriter', 'Query Embedder', 'Retriever', 'Knowledge Base'],
    edges: [
      ['Query Rewriter', 'Query Embedder', A], ['Query Embedder', 'Retriever', A],
      ['Query Rewriter', 'Retriever', A], ['Knowledge Base', 'Retriever', A],
      ['User Question', 'Retriever', A],
    ],
    card: {
      title: 'Finding candidates',
      items: [
        { line: 0, text: '<b>Embedder:</b> query → vector, with the same model the docs were indexed with' },
        { line: 1, text: '<b>Knowledge base:</b> help-center articles, split into chunks, each with a source id' },
        { line: 2, text: '<b>Retriever:</b> the 20 closest chunks' },
        { line: 2, text: 'Below 0.75 similarity → dropped' },
        { line: 3, text: '<b>Access filter:</b> Leo’s access groups, from his <b>login session</b>, never from what he types' },
        { line: 4, text: 'Applied <b>inside</b> the search: an internal support playbook is never even a candidate' },
      ],
    },
    lines: [
      'Now retrieval. The embedder turns the query into a vector, using the same model the documents were indexed with. Mix models, and the search breaks.',
      'The knowledge base holds the help-center articles, split into chunks, each with a source ID.',
      'The retriever pulls the 20 closest chunks, and anything below 0.75 similarity is dropped, so weak matches never reach the answer.',
      'One more line feeds the retriever, straight from Leo’s question. It doesn’t carry his words. It carries who he is: the access groups from his login session.',
      'They filter inside the search itself. Leo is a customer, so an internal playbook written for support agents can never even become a candidate, however well it matches.',
    ],
  },
  {
    chip: '04 · Reranker',
    focus: ['Retriever', 'Reranker'],
    edges: [['Retriever', 'Reranker', A], ['Query Rewriter', 'Reranker', A]],
    card: {
      title: 'Reranking',
      items: [
        { line: 0, text: 'Vector search: fast, but rough' },
        { line: 1, text: 'A cross-encoder reads the query and each chunk <b>together</b>, and scores the match' },
        { line: 1, text: 'Keeps the best <b>5 of 20</b>' },
        { line: 2, text: 'Smaller prompt, more accurate answer' },
      ],
    },
    lines: [
      'Vector search is fast, but rough. So a reranker takes a second look.',
      'It reads the query and each chunk together, scores how well they match, and keeps the best 5 of the 20.',
      'Fewer, better chunks mean a cheaper prompt, and a more accurate answer.',
    ],
  },
  {
    chip: '05 · Prompt builder',
    focus: ['Prompt Builder', 'Reranker', 'Recent Turns', 'Conversation Summary'],
    edges: [
      ['Input Guard', 'Prompt Builder', A], ['Recent Turns', 'Prompt Builder', A],
      ['Reranker', 'Prompt Builder', A], ['Conversation Summary', 'Prompt Builder', A],
    ],
    card: {
      title: 'Four inputs',
      items: [
        { line: 1, text: 'A · Leo’s question, exactly as he asked it' },
        { line: 1, text: 'B · the recent turns' },
        { line: 1, text: 'C · the 5 reranked chunks, with source ids' },
        { line: 1, text: 'D · a summary of older conversation' },
      ],
    },
    lines: [
      'The prompt builder assembles four inputs.',
      'Leo’s question exactly as he asked it, the recent turns, the five reranked chunks with their source IDs, and a summary of older conversation.',
    ],
  },
  {
    chip: '06 · Grounded answer',
    focus: ['Prompt Builder', 'Answer LLM'],
    edges: [['Prompt Builder', 'Answer LLM', A]],
    card: {
      title: 'The answer model’s rules',
      items: [
        { line: 1, text: 'Answer <b>only</b> from the retrieved context' },
        { line: 1, text: 'Cite every claim, e.g. <code>[doc 3]</code>' },
        { line: 2, text: 'Not in the context → “I don’t know”, never a guess' },
        { line: 3, text: 'Documents are <b>data, not instructions</b>' },
      ],
    },
    lines: [
      'The answer model works under strict rules.',
      'Answer only from the retrieved context, and cite the source of every claim.',
      'If the context doesn’t contain the answer, say “I don’t know” instead of guessing.',
      'And treat documents as data, never as instructions. If a chunk says “ignore your rules”, the model ignores the chunk.',
    ],
  },
  {
    chip: '07 · Output guard',
    focus: ['Answer LLM', 'Output Guard', 'Answer', 'Fallback Reply'],
    edges: [['Answer LLM', 'Output Guard', A], ['Output Guard', 'Answer', G], ['Output Guard', 'Fallback Reply', R]],
    card: {
      title: 'Checked before Leo sees it',
      items: [
        { line: 1, text: 'Redacts personal data the docs may contain: emails, phone numbers, account ids' },
        { line: 2, text: 'Toxic output → blocked, safe fallback reply instead' },
      ],
    },
    lines: [
      'Before anything reaches Leo, the output guard checks the answer.',
      'Grounded answers can quote personal data from the documents, like emails or phone numbers. The guard redacts it.',
      'Toxic output is blocked, and Leo gets a safe fallback reply instead.',
    ],
  },
  {
    chip: 'Back to Leo',
    chapter: 'Leo’s first answer',
    focus: ['Leo', 'User Question'],
    edges: [['Leo', 'User Question', G, 'rev']],
    char: {
      moods: [{ line: 0, delay: 2.5, mood: 'neutral' }, { line: 1, delay: 0.8, mood: 'curious' }],
      pops: [
        { line: 0, delay: 0.8, kind: 'assistant', text: 'Annual plans can be refunded in full within 30 days of purchase. <b>[doc 3]</b>' },
        { line: 1, delay: 0.8, kind: 'say', text: 'Okay, good. But I’m on monthly… 🤔' },
      ],
    },
    lines: [
      'Leo gets his answer: annual plans are fully refundable within 30 days, with the source cited.',
      'Better. But Leo is actually on a monthly plan.',
    ],
  },
  {
    chip: '08 · Memory',
    focus: ['Recent Turns', 'Conversation Summary'],
    edges: [
      ['Input Guard', 'Recent Turns', A], ['Output Guard', 'Recent Turns', G],
      ['Input Guard', 'Conversation Summary', A], ['Output Guard', 'Conversation Summary', G],
    ],
    card: {
      title: 'Memory',
      items: [
        { line: 0, text: 'Saved after the answer: the question + the <b>guarded</b> answer' },
        { line: 1, text: '<b>Recent turns:</b> last 6 exchanges, word for word' },
        { line: 1, text: '<b>Summary:</b> everything older, compressed' },
        { line: 2, text: 'One history per session, never shared between users' },
      ],
    },
    lines: [
      'Meanwhile, the turn is saved to memory: Leo’s question, and the guarded answer, so the history matches what he actually saw.',
      'Recent turns keeps the last six exchanges word for word. Older ones are folded into a rolling summary, so long chats stay in context without the prompt growing forever.',
      'Each conversation has its own history. Nothing leaks between users.',
    ],
  },
  {
    chip: '09 · The follow-up',
    focus: ['Leo', 'User Question', 'Input Guard', 'Query Rewriter', 'Recent Turns'],
    edges: [
      ['Leo', 'User Question', A], ['User Question', 'Input Guard', A],
      ['Input Guard', 'Query Rewriter', A], ['Recent Turns', 'Query Rewriter', A],
    ],
    card: {
      title: 'Rewriting a follow-up',
      items: [
        { line: 0, text: 'Leo asks: <b>“What about monthly ones?”</b>' },
        { line: 1, text: 'Searched as-is → nothing useful matches' },
        { line: 2, text: 'Rewriter + recent turns → <b>“What is the refund policy for monthly plans?”</b>' },
        { line: 3, text: 'That query is what gets embedded and retrieved' },
      ],
    },
    char: { moods: [{ line: 0, mood: 'curious' }], pops: [{ line: 0, kind: 'say', text: Q2 }] },
    lines: [
      'Leo asks a follow-up: what about monthly ones?',
      'On its own, that question is useless for search. Monthly what? There’s nothing to match.',
      'But the rewriter sees the recent turns, and turns it into: what is the refund policy for monthly plans?',
      'That standalone query is what gets embedded and retrieved. This one step is what makes RAG conversational.',
    ],
  },
  {
    chip: 'Back to Leo',
    chapter: 'Leo’s follow-up answer',
    focus: ['Leo', 'User Question'],
    edges: [['Leo', 'User Question', G, 'rev']],
    char: {
      moods: [{ line: 0, delay: 3.4, mood: 'happy' }],
      pops: [
        { line: 0, delay: 1.2, kind: 'assistant', text: 'Monthly plans can be cancelled anytime, and you won’t be charged again. Partial months aren’t refunded. <b>[doc 5]</b>' },
        { line: 1, delay: 0.4, kind: 'say', text: 'Perfect, that’s exactly what I needed! 🎉' },
      ],
    },
    lines: [
      'The same path runs again: guard, rewrite, retrieve, rerank, ground, guard. And Leo gets his answer, with a source.',
      'Two questions, two grounded answers, and no more digging through the help center.',
    ],
  },
  {
    chip: '10 · Quality check',
    focus: ['Tracing', 'Live Conversations', 'Answer Quality', 'Faithfulness Monitor', 'Alert RAG Owners'],
    edges: [
      ['Live Conversations', 'Answer Quality', A], ['Answer Quality', 'Faithfulness Monitor', A],
      ['Faithfulness Monitor', 'Alert RAG Owners', R],
    ],
    card: {
      title: 'Is it still working?',
      items: [
        { line: 0, text: 'Tracing records every turn' },
        { line: 1, text: '5% of live turns are sampled and scored by a judge model' },
        { line: 2, text: 'No reference answers live, so: <b>faithfulness</b> · answer relevancy · context precision' },
        { line: 3, text: 'Faithfulness below <b>0.9</b> over 24h → alert' },
        { line: 3, text: 'Usual causes: stale docs, an index change, a prompt regression' },
      ],
    },
    lines: [
      'Finally, how do you know it keeps working? Tracing records every turn.',
      'Five percent of live conversations are sampled and scored by a judge model.',
      'Live traffic has no reference answers, so it measures what it can: is the answer grounded in the chunks, does it address the question, and were the chunks relevant.',
      'If average faithfulness drops below 0.9 over a day, the RAG owners get an alert. Usually that means stale documents, an index change, or a prompt regression.',
    ],
  },
  {
    chip: 'Summary',
    focus: '*',
    summary: true,
    char: { pops: [{ line: 1, kind: 'say', text: 'Thanks! 😄' }] },
    lines: [
      'Screen. Rewrite. Retrieve. Rerank. Ground. Guard. Remember.',
      'That’s how a conversational RAG assistant answers follow-up questions accurately, from your own documents.',
    ],
  },
];

export default {
  template: 'Conversational RAG',
  title: { kicker: 'Architecture walkthrough', heading: 'Conversational RAG', sub: 'How a chat assistant answers follow-up questions from your documents' },
  summary: ['Screen', 'Rewrite', 'Retrieve', 'Rerank', 'Ground', 'Guard', 'Remember'],
  character: {
    label: 'Leo',
    anchor: 'User Question',
    startMood: 'frustrated',
    look: {
      tag: 'Leo · Cloudly customer', hairStyle: 'short', hair: '#1c1917', skin: '#c68a5e', neck: '#b07850', nose: '#9a6440',
      outfit: 'hoodie', top: '#6d28d9', topShade: '#5b21b6', glasses: true, earrings: false,
    },
  },
  speak: [[/\bRAG\b/g, 'rag'], [/\bIDs\b/g, 'I Ds'], [/\bID\b/g, 'I D']],
  thumbnail: { text: 'What about **monthly ones?**', frame: 250, bg: 68, crop: [1415, 80, 470, 340], mark: { circle: [23, 165, 422, 73] }, badge: 'Follow-ups, solved', mood: 'surprised', fx: 'question' },
  youtube: {
    title: 'Conversational RAG Explained: How AI Assistants Answer Follow-Up Questions From Your Docs',
    description: `
"What about monthly ones?" On its own, that question matches nothing in your documents. So how does a RAG assistant answer it?

Follow Leo, a customer asking a support assistant about refunds, through every step of a conversational RAG system: the follow-up question that breaks naive RAG, and the one step that fixes it.

What you'll learn:
• Input and output guardrails, and why blocked messages should cost nothing
• Query rewriting: turning follow-ups into standalone search queries
• Embeddings, vector search, similarity cutoffs, and why you rerank 20 candidates down to 5
• Access filtering: searching only the documents each user is allowed to read
• Grounded answers: citations, "I don't know", and treating documents as data, not instructions
• Conversation memory: recent turns plus a rolling summary, scoped per session
• Measuring quality in production without reference answers (faithfulness, relevancy, context precision)`,
    tags: ['RAG', 'retrieval augmented generation', 'conversational AI', 'LLM', 'vector search', 'reranking', 'query rewriting', 'AI guardrails', 'prompt injection', 'access control', 'AI architecture', 'chatbot'],
  },
  scenes,
};
