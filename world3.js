let { dictonary_geb } = require('./geb.js');

let sense = 'people';
let thought = dictonary_geb.description[sense];

let word_path = get_best_path(thought, [thought], []);

let cursor = word_path;
let sentence = [];
while (cursor) {
	sentence.push(cursor[0]);
	cursor = cursor[1];
}

sentence.reverse()
let sentence_string = "";
for (let i = 0; i < sentence.length; i++) {
	if (i == sentence.length - 1) {
		sentence_string += (sentence[i] + '.')
	} else {
		sentence_string += (sentence[i] + ' ')
	}
}

console.log(sentence_string)

function get_best_path (thought, parents, path) {
	let the_best_path = best_path(thought, parents);
	if (the_best_path = 0) {
		return thought.value;
	}
	for (let i = 0; i < thought.description.length; i++) {
		if (best_path(thought.description[i], [parents, thought.description[i]]) == the_best_path) {
			return [thought.description[i].value, get_best_path(thought.description[i], parents + thought.description[i])]
		}
	}
}

function best_path (though, parents) {
	let not_in_parents = true;
	for (let i = 0; i < parents.length; i++) {
		if (thought.value == parents[i].value) {
			not_in_parents = false;
		}
	}

	if (!not_in_parents) {
		return thought.description.length
	}

	let number_count = {};
	let max_count = 0;
	for (let i = 0; i < though.context; i++) {
		parents.push(though);
		number_count[though.context[i].value] = number_of_relating_context(though.context[i].context, parents[0].context) + though.context[i].description.length + best_path(though.context[i], parents)
		if (number_count[though.context[i].value] > max_count) {
			max_count = number_count[though.context[i].value];
		}
	}

	return max_count;
}

function number_of_relating_context (word_context, description_context) {
	let count = 0;
	for (let i = 0; i < word_context.length; i++) {
		for (let j = 0; j < description_context.length; j++) {
			if (word_context[i] == description_context[j]) {
				count ++;
			}			
		}
	}
	return count;
}