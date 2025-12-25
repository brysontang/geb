/**
 * LLM Visualization Server
 *
 * Streams the latent space exploration in real-time via WebSocket
 * Watch the semantic web unfold as the LLM defines concepts
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:11434/api/generate';
const LLM_MODEL = process.env.LLM_MODEL || 'llama3';

// Base vocabulary - leaves of our semantic tree
const BASE_VOCABULARY = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'it', 'its', 'they', 'them', 'their', 'he', 'she', 'his', 'her',
  'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by', 'as', 'into', 'through', 'about', 'over', 'between', 'under', 'after', 'before',
  'and', 'or', 'but', 'if', 'when', 'while', 'because', 'although', 'than',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'has', 'have', 'had', 'having',
  'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
  'not', 'no', 'yes', 'very', 'more', 'most', 'also', 'just', 'only', 'even', 'still',
  'who', 'what', 'where', 'when', 'why', 'how', 'which',
  'one', 'two', 'first', 'second',
  'other', 'such', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'many', 'much',
  'same', 'different', 'new', 'old', 'good', 'bad', 'great', 'small', 'large', 'long', 'short',
  'thing', 'things', 'something', 'anything', 'nothing', 'everything',
  'way', 'ways', 'time', 'times', 'place', 'part', 'parts',
  'used', 'often', 'usually', 'sometimes', 'always', 'never',
  'called', 'known', 'made', 'found', 'given', 'taken',
  'able', 'like', 'well', 'back', 'then', 'now', 'here', 'there',
]);

// HTTP server for static files
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'viz.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading visualization');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Ask LLM for a definition
async function askLLM(word) {
  const prompt = `Define "${word}" in one simple sentence. Be concise. Just the definition.`;

  try {
    const response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 80 }
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    return data.response?.trim() || null;
  } catch (error) {
    console.error(`Error defining "${word}":`, error.message);
    return null;
  }
}

// Extract meaningful words from text
function extractWords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !BASE_VOCABULARY.has(w));
}

// Explore the latent space and stream results
async function exploreLatentSpace(ws, seedWord, maxDepth = 4, maxWords = 60) {
  const defined = new Set();
  const queue = [{ word: seedWord, depth: 0, parent: null }];
  let wordCount = 0;
  let nodeId = 0;

  // Send initial message
  ws.send(JSON.stringify({
    type: 'start',
    seed: seedWord,
    model: LLM_MODEL,
    maxDepth,
    maxWords
  }));

  while (queue.length > 0 && wordCount < maxWords) {
    const { word, depth, parent } = queue.shift();

    // Skip if already defined or too deep
    if (defined.has(word) || depth > maxDepth) continue;
    if (BASE_VOCABULARY.has(word)) continue;

    defined.add(word);
    wordCount++;
    const currentId = nodeId++;

    // Send "defining" status
    ws.send(JSON.stringify({
      type: 'defining',
      id: currentId,
      word,
      depth,
      parent
    }));

    // Get definition from LLM
    const definition = await askLLM(word);

    if (!definition) {
      ws.send(JSON.stringify({
        type: 'node',
        id: currentId,
        word,
        depth,
        parent,
        definition: null,
        children: []
      }));
      continue;
    }

    // Extract child words
    const childWords = extractWords(definition);
    const newChildren = childWords.filter(w => !defined.has(w) && !BASE_VOCABULARY.has(w));

    // Send the node with its definition
    ws.send(JSON.stringify({
      type: 'node',
      id: currentId,
      word,
      depth,
      parent,
      definition,
      children: childWords,
      newChildren
    }));

    // Add children to queue
    for (const child of newChildren) {
      if (!defined.has(child) && wordCount + queue.length < maxWords) {
        queue.push({ word: child, depth: depth + 1, parent: currentId });
      }
    }

    // Small delay for visualization effect
    await new Promise(r => setTimeout(r, 100));
  }

  // Send completion
  ws.send(JSON.stringify({
    type: 'complete',
    totalWords: wordCount,
    totalNodes: nodeId
  }));
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'explore') {
        const seed = data.seed || 'consciousness';
        const maxDepth = data.maxDepth || 4;
        const maxWords = data.maxWords || 50;

        console.log(`Exploring "${seed}" (depth: ${maxDepth}, max: ${maxWords})`);
        await exploreLatentSpace(ws, seed, maxDepth, maxWords);
      }
    } catch (error) {
      console.error('Message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(PORT, () => {
  console.log(`\n  Latent Space Visualizer`);
  console.log(`  ========================`);
  console.log(`  Open: http://localhost:${PORT}`);
  console.log(`  Model: ${LLM_MODEL}`);
  console.log(`  API: ${LLM_API_URL}\n`);
});
