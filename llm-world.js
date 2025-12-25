/**
 * LLM World Builder v2
 *
 * Recursively excavates an LLM's latent space by:
 * 1. Starting with a seed word
 * 2. Asking the LLM for a definition
 * 3. For each word in the definition, recursively getting definitions
 * 4. Building a semantic world from the model's internal representations
 *
 * Uses Ollama by default (local Llama 3), but can work with any OpenAI-compatible API
 */

// Base vocabulary - words so fundamental we don't need to define them
// These become the "leaves" of our semantic tree
const BASE_VOCABULARY = new Set([
  // Articles & determiners
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  // Pronouns
  'it', 'its', 'they', 'them', 'their', 'he', 'she', 'his', 'her',
  // Prepositions
  'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by', 'as', 'into', 'through', 'about', 'over', 'between', 'under', 'after', 'before',
  // Conjunctions
  'and', 'or', 'but', 'if', 'when', 'while', 'because', 'although', 'than',
  // Common verbs (being/having)
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'has', 'have', 'had', 'having',
  'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
  // Common adjectives/adverbs
  'not', 'no', 'yes', 'very', 'more', 'most', 'also', 'just', 'only', 'even', 'still',
  // Question words
  'who', 'what', 'where', 'when', 'why', 'how', 'which',
  // Numbers
  'one', 'two', 'first', 'second',
  // Other fundamentals
  'other', 'such', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'many', 'much',
  'same', 'different', 'new', 'old', 'good', 'bad', 'great', 'small', 'large', 'long', 'short',
  'thing', 'things', 'something', 'anything', 'nothing', 'everything',
  'way', 'ways', 'time', 'times', 'place', 'part', 'parts',
  'used', 'often', 'usually', 'sometimes', 'always', 'never',
  'called', 'known', 'made', 'found', 'given', 'taken',
  'able', 'like', 'well', 'back', 'then', 'now', 'here', 'there',
]);

// Configuration
const CONFIG = {
  // Ollama default endpoint (local Llama)
  apiUrl: process.env.LLM_API_URL || 'http://localhost:11434/api/generate',
  model: process.env.LLM_MODEL || 'llama3',

  // Recursion limits
  maxDepth: parseInt(process.env.MAX_DEPTH) || 5,
  maxWords: parseInt(process.env.MAX_WORDS) || 100,

  // Request settings
  timeout: 30000,

  // Output verbosity
  verbose: true,
};

// The world we're building
const world = {
  definitions: {},  // word -> { definition: string, words: [], depth: number, raw: string }
  pending: [],      // words still to define
  defined: new Set(),
  stats: {
    apiCalls: 0,
    totalWords: 0,
    maxDepthReached: 0,
  }
};

/**
 * Call the LLM API to get a definition
 */
async function askLLM(word) {
  const prompt = `Define "${word}" in one simple sentence. Be concise. Just give the definition, nothing else.`;

  world.stats.apiCalls++;

  try {
    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 100,
        }
      }),
      signal: AbortSignal.timeout(CONFIG.timeout),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.error(`  Timeout getting definition for "${word}"`);
    } else {
      console.error(`  Error getting definition for "${word}":`, error.message);
    }
    return null;
  }
}

/**
 * Alternative: Raw completion mode - just see what the model generates
 * This is the "give it 'cat' and see what it spits out" mode
 */
async function askLLMRaw(word) {
  world.stats.apiCalls++;

  try {
    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.model,
        prompt: word + ' ',  // Just the word with a space
        stream: false,
        options: {
          temperature: 0.8,
          num_predict: 50,
        }
      }),
      signal: AbortSignal.timeout(CONFIG.timeout),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';
  } catch (error) {
    console.error(`  Error with raw completion for "${word}":`, error.message);
    return null;
  }
}

/**
 * Clean and extract words from a definition
 */
function extractWords(text) {
  if (!text) return [];

  // Remove punctuation, lowercase, split into words
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1)  // Skip single letters
    .filter(w => !BASE_VOCABULARY.has(w));  // Skip base vocabulary
}

/**
 * Define a word recursively
 */
async function defineWord(word, depth = 0) {
  // Clean the word
  word = word.toLowerCase().trim();

  // Skip if already defined or in base vocabulary
  if (world.defined.has(word) || BASE_VOCABULARY.has(word)) {
    return;
  }

  // Check limits
  if (depth > CONFIG.maxDepth) {
    world.stats.maxDepthReached++;
    if (CONFIG.verbose) console.log(`  [max depth] ${word}`);
    return;
  }

  if (world.stats.totalWords >= CONFIG.maxWords) {
    if (CONFIG.verbose) console.log(`  [max words reached]`);
    return;
  }

  // Mark as defined (to prevent cycles)
  world.defined.add(word);
  world.stats.totalWords++;

  // Get definition from LLM
  const indent = '  '.repeat(depth);
  if (CONFIG.verbose) console.log(`${indent}[${depth}] Defining: ${word}`);

  const definition = await askLLM(word);

  if (!definition) {
    if (CONFIG.verbose) console.log(`${indent}    (no definition returned)`);
    world.definitions[word] = { definition: null, words: [], depth, raw: null };
    return;
  }

  if (CONFIG.verbose) console.log(`${indent}    -> "${definition.substring(0, 60)}${definition.length > 60 ? '...' : ''}"`);

  // Extract words from definition
  const words = extractWords(definition);
  const newWords = words.filter(w => !world.defined.has(w) && !BASE_VOCABULARY.has(w));

  // Store the definition
  world.definitions[word] = {
    definition: definition,
    words: words,
    newWords: newWords,
    depth: depth,
  };

  // Recursively define new words
  for (const newWord of newWords) {
    if (world.stats.totalWords >= CONFIG.maxWords) break;
    await defineWord(newWord, depth + 1);
  }
}

/**
 * Build a world starting from a seed word
 */
async function buildWorld(seedWord, options = {}) {
  // Apply options
  Object.assign(CONFIG, options);

  console.log('\n=== LLM World Builder ===');
  console.log(`Seed: "${seedWord}"`);
  console.log(`Model: ${CONFIG.model}`);
  console.log(`Max depth: ${CONFIG.maxDepth}`);
  console.log(`Max words: ${CONFIG.maxWords}`);
  console.log('');

  const startTime = Date.now();

  // Start the recursive definition process
  await defineWord(seedWord, 0);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n=== World Complete ===');
  console.log(`Words defined: ${world.stats.totalWords}`);
  console.log(`API calls: ${world.stats.apiCalls}`);
  console.log(`Max depth reached: ${world.stats.maxDepthReached} times`);
  console.log(`Time: ${elapsed}s`);

  return world;
}

/**
 * Convert the world to a geb-compatible format
 */
function toGebFormat() {
  const definitions = [];

  for (const [word, data] of Object.entries(world.definitions)) {
    if (data.definition) {
      definitions.push([word, data.definition]);
    }
  }

  return definitions;
}

/**
 * Visualize the world as a tree
 */
function printTree(word = null, depth = 0, visited = new Set()) {
  if (!word) {
    // Find root (word at depth 0)
    word = Object.keys(world.definitions).find(w => world.definitions[w].depth === 0);
    if (!word) {
      console.log('No world built yet');
      return;
    }
  }

  if (visited.has(word) || depth > 10) return;
  visited.add(word);

  const data = world.definitions[word];
  const indent = '  '.repeat(depth);

  if (data) {
    console.log(`${indent}${word}`);
    for (const childWord of (data.newWords || [])) {
      printTree(childWord, depth + 1, visited);
    }
  } else {
    console.log(`${indent}${word} (leaf)`);
  }
}

/**
 * Export stats about the semantic structure
 */
function getStats() {
  const depths = {};
  const connections = {};

  for (const [word, data] of Object.entries(world.definitions)) {
    // Count by depth
    depths[data.depth] = (depths[data.depth] || 0) + 1;

    // Count connections
    connections[word] = data.words?.length || 0;
  }

  // Find most connected words
  const sorted = Object.entries(connections).sort((a, b) => b[1] - a[1]);

  return {
    wordsByDepth: depths,
    mostConnected: sorted.slice(0, 10),
    totalUniqueWords: Object.keys(world.definitions).length,
  };
}

// Main execution
async function main() {
  const seedWord = process.argv[2] || 'cat';
  const maxDepth = parseInt(process.argv[3]) || 3;
  const maxWords = parseInt(process.argv[4]) || 50;

  try {
    await buildWorld(seedWord, { maxDepth, maxWords });

    console.log('\n=== Semantic Tree ===');
    printTree();

    console.log('\n=== Stats ===');
    const stats = getStats();
    console.log('Words by depth:', stats.wordsByDepth);
    console.log('Most connected:', stats.mostConnected.slice(0, 5));

    console.log('\n=== GEB Format (for integration) ===');
    const gebDefs = toGebFormat();
    console.log(`Generated ${gebDefs.length} definitions`);
    console.log('First 3:', gebDefs.slice(0, 3));

  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('\nError: Could not connect to LLM API');
      console.error('Make sure Ollama is running: ollama serve');
      console.error('And that you have a model: ollama pull llama3');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Export for use as module
module.exports = {
  buildWorld,
  world,
  toGebFormat,
  printTree,
  getStats,
  askLLM,
  askLLMRaw,
  BASE_VOCABULARY,
  CONFIG,
};

// Run if executed directly
if (require.main === module) {
  main();
}
