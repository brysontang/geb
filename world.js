let { dictonary_geb } = require('./geb.js');

//console.log(dictonary_geb.description['feline']);
//console.log(dictonary_geb.functions.find('person', dictonary_geb).context);
//console.log(dictonary_geb.functions.find('person', dictonary_geb).description);

let sense = 'people';
let thought = dictonary_geb.description[sense];

console.log(thought.value);
for (let i = 0; i < 10; i ++){
	let last_thougt = thought.value;
	let word_tally = {};
	let max_total = -1;
	// Finds which word shows up most frequenty in the description
	for (let i = 0; i < thought.description.length; i ++) {
		if (word_tally[thought.description[i].value]) {
			word_tally[thought.description[i].value] ++;
		} else {
			word_tally[thought.description[i].value] = 1;
		}
	}

	// Gets max total
	for (key in word_tally) {
		if (word_tally[key] > max_total) {
			max_total = word_tally[key]
		}
	}

	// Gets tied words
	let tied_words = [];
	for (key in word_tally) {
		if (word_tally[key] == max_total) {
			tied_words.push(key)
		}
	}

	let max_context = -1;
	for (let i = 0; i < tied_words.length; i++) {
		if (max_context < dictonary_geb.description[tied_words[i]].context.length) {
			max_context = dictonary_geb.description[tied_words[i]].context.length;
		}
	}

	for (let i = 0; i < tied_words.length; i++) {
		if (dictonary_geb.description[tied_words[i]].context.length == max_context) {
			thought = dictonary_geb.description[tied_words[i]];
			break;
		}
	}

	console.log(thought.value);

	// Goes from (most def -> context) into (lest context -> def)

	word_tally = {};
	max_total = -1;
	for (let i = 0; i < thought.context.length; i++) {
		if (word_tally[thought.context[i].value]) {
			word_tally[thought.context[i].value] ++;
		} else {
			word_tally[thought.context[i].value] = 1;
		}
	}


	for (key in word_tally) {
		if (word_tally[key] > max_total) {
			max_total = word_tally[key]
		}
	}
	// Gets tied words
	tied_words = [];
	for (key in word_tally) {
		if (word_tally[key] == max_total) {
			tied_words.push(key)
		}
	}
	let longest_description = -1;
	for (let i = 0; i < tied_words.length; i++) {
		if (longest_description < dictonary_geb.description[tied_words[i]].description.length) {
			longest_description = dictonary_geb.description[tied_words[i]].description.length;
		}
	}

	let new_word_found = false;
	for (let i = 0; i < tied_words.length; i++) {
		if (dictonary_geb.description[tied_words[i]].description.length == longest_description && dictonary_geb.description[tied_words[i]].value != last_thougt) {
			thought = dictonary_geb.description[tied_words[i]];
			new_word_found = true;
			break;
		}
	}

	if (!new_word_found) {
		thought = dictonary_geb.description[last_thougt]

		word_tally = {};
		min_total = Number.MAX_VALUE;
		// Finds which word shows up less frequenty in the description
		for (let i = 0; i < thought.description.length; i ++) {
			if (word_tally[thought.description[i].value]) {
				word_tally[thought.description[i].value] ++;
			} else {
				word_tally[thought.description[i].value] = 1;
			}
		}

		// Gets max total
		for (key in word_tally) {
			if (word_tally[key] < min_total) {
				min_total = word_tally[key]
			}
		}

		// Gets tied words
		tied_words = [];
		for (key in word_tally) {
			if (word_tally[key] == min_total) {
				tied_words.push(key)
			}
		}
		
		max_context = -1;
		for (let i = 0; i < tied_words.length; i++) {
			if (max_context < dictonary_geb.description[tied_words[i]].context.length) {
				max_context = dictonary_geb.description[tied_words[i]].context.length;
			}
		}

		for (let i = 0; i < tied_words.length; i++) {
			if (dictonary_geb.description[tied_words[i]].context.length == max_context) {
				thought = dictonary_geb.description[tied_words[i]];
				break;
			}
		}
		console.log(thought.value);
		break;
	}

	console.log(thought.value);
}

// console.log(thought.value);
// while (thought.context.length >= 1) {
// 	thought = dictonary_geb.description[thought.value].context[dictonary_geb.description[thought.value].context.length - 1];
// 	console.log(thought.value);
// }