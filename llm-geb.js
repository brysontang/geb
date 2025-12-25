/**
 * LLM-GEB Integration
 *
 * Combines the LLM world builder with the existing geb semantic network.
 * This lets you:
 * 1. Build a world from an LLM's latent space
 * 2. Use the existing mind algorithm (world3.js style) to traverse it
 * 3. Generate sentences that represent the model's understanding
 */

const { buildWorld, toGebFormat, world, CONFIG } = require('./llm-world.js');

/**
 * geb class - same as original but works with LLM-generated definitions
 */
class geb {
  constructor({ context, value, description, functions, master }) {
    this.context = context || [];
    this.functions = functions;
    this.value = value;

    if (functions.teach) {
      this.description = {};
      functions.teach(description, this);
    } else if (functions.define) {
      let results = functions.define(description, this, master);
      this.description = results[1];
      this.master = results[0];
      this.master.description[this.value] = this;
    }
  }
}

function teach(list, master) {
  for (let i = 0; i < list.length; i++) {
    let collective_search = master.description[list[i][0]];
    if (!collective_search) {
      let newWord = new geb({
        value: list[i][0],
        description: list[i][1].split(' '),
        functions: { define },
        master
      });
      master = newWord.master;
    } else {
      master.description[list[i][0]].description = collective_search.functions.define(
        list[i][1].split(' '),
        collective_search,
        master
      )[1];
    }
  }
}

function define(description, parent_object, master) {
  let definitions = [];

  for (let i = 0; i < description.length; i++) {
    if (master.description[description[i]]) {
      master.description[description[i]].context.push(parent_object);
      definitions.push(master.description[description[i]]);
    } else {
      let new_word = new geb({
        context: [parent_object],
        value: description[i],
        description: [],
        functions: { define },
        master
      });
      master.description[description[i]] = new_word;
      definitions.push(new_word);
    }
  }
  return [master, definitions];
}

function find(string, master) {
  return master.description[string];
}

/**
 * Build a geb network from the LLM-generated world
 */
async function buildLLMGeb(seedWord, options = {}) {
  // First, build the world using LLM
  await buildWorld(seedWord, options);

  // Convert to geb format
  const definitions = toGebFormat();

  if (definitions.length === 0) {
    throw new Error('No definitions generated');
  }

  // Create the geb network
  const dictonary_geb = new geb({
    description: definitions,
    functions: { teach, find }
  });

  return dictonary_geb;
}

/**
 * Mind algorithm - find best semantic path (from world3.js)
 */
function getBestPath(thought, parents, path) {
  const theBestPath = bestPath(thought, parents);

  if (theBestPath === 0) {
    return [thought.value];
  }

  for (let i = 0; i < thought.description.length; i++) {
    parents.push(thought.description[i]);
    if (bestPath(thought.description[i], parents) === theBestPath) {
      return [thought.description[i].value, getBestPath(thought.description[i], parents, path)];
    }
    parents.pop();
  }
}

function bestPath(thought, parents) {
  let inParents = false;
  for (let i = 1; i < parents.length; i++) {
    if (thought.value === parents[i].value) {
      inParents = true;
    }
  }

  if (inParents) {
    return thought.description.length;
  }

  let numberCount = {};
  let maxCount = 0;

  for (let i = 0; i < thought.description.length; i++) {
    parents.push(thought.description[i]);

    if (thought.description[i] && numberOfRelatingContext(thought.description[i].context, parents[0].context) !== 0) {
      if (numberCount[thought.description[i].value]) {
        numberCount[thought.description[i].value] += numberOfRelatingContext(thought.description[i].context, parents[0].context) + bestPath(thought.description[i], parents);
      } else {
        numberCount[thought.description[i].value] = 1;
      }
      if (numberCount[thought.description[i].value] > maxCount) {
        maxCount = numberCount[thought.description[i].value];
      }
    }
    parents.pop();
  }

  return maxCount;
}

function numberOfRelatingContext(wordContext, descriptionContext) {
  let count = 0;
  for (let i = 0; i < wordContext.length; i++) {
    for (let j = 0; j < descriptionContext.length; j++) {
      if (wordContext[i] === descriptionContext[j]) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Generate a sentence from the LLM-built semantic network
 */
function generateSentence(thought) {
  if (!thought || !thought.description || thought.description.length === 0) {
    return thought?.value || '';
  }

  const wordPath = getBestPath(thought, [thought], []);

  let cursor = wordPath;
  const sentence = [];

  while (cursor) {
    if (Array.isArray(cursor)) {
      sentence.push(cursor[0]);
      cursor = cursor[1];
    } else {
      sentence.push(cursor);
      break;
    }
  }

  sentence.reverse();
  return sentence.join(' ') + '.';
}

/**
 * Explore the LLM's latent space for a concept
 */
async function explore(seedWord, options = {}) {
  console.log(`\nExploring "${seedWord}" in the LLM's latent space...\n`);

  const gebNetwork = await buildLLMGeb(seedWord, {
    maxDepth: 3,
    maxWords: 30,
    verbose: true,
    ...options
  });

  console.log('\n=== Generated Semantic Network ===');

  // Find the seed word in the network
  const seedNode = find(seedWord, gebNetwork);

  if (seedNode && seedNode.description.length > 0) {
    console.log(`\nMind's interpretation of "${seedWord}":`);
    const sentence = generateSentence(seedNode);
    console.log(`  "${sentence}"`);
  }

  // Show some interesting paths
  console.log('\n=== Sample Concepts ===');
  const words = Object.keys(gebNetwork.description).slice(0, 10);
  for (const word of words) {
    const node = gebNetwork.description[word];
    if (node.description.length > 0) {
      const related = node.description.map(n => n.value).slice(0, 5).join(', ');
      console.log(`  ${word} -> [${related}]`);
    }
  }

  return gebNetwork;
}

// Main
async function main() {
  const seed = process.argv[2] || 'consciousness';

  try {
    await explore(seed, {
      maxDepth: 3,
      maxWords: 25,
    });
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('\nCould not connect to Ollama.');
      console.error('Start it with: ollama serve');
      console.error('Then pull a model: ollama pull llama3');
      console.error('\nOr set LLM_API_URL for a different endpoint.');
    } else {
      console.error('Error:', error.message);
    }
  }
}

module.exports = {
  buildLLMGeb,
  explore,
  generateSentence,
  geb,
  find,
};

if (require.main === module) {
  main();
}
