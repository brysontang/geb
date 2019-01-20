let { dictonary_geb } = require('./geb.js');

let sense = 'feline';
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
	
	if (the_best_path == 0) {
		return [thought.value];
	}
	for (let i = 0; i < thought.description.length; i++) {
		parents.push(thought.description[i])
		if (best_path(thought.description[i], parents) == the_best_path) {
			return [thought.description[i].value, get_best_path(thought.description[i], parents, path)]
		}
		parents.pop();
	}
}

function best_path (though, parents) {

	let in_parents = false;
	for (let i = 1; i < parents.length; i++) {
		if (thought.value == parents[i].value) {
			in_parents = true;
		}
	}

	if (in_parents) {
		return thought.description.length
	}

	let number_count = {};
	let max_count = 0;
	for (let i = 0; i < thought.description.length; i++) {
		parents.push(though.description[i]);

		if (though.description[i] && number_of_relating_context(though.description[i].context, parents[0].context) != 0){
			if(number_count[though.description[i].value]) {
				number_count[though.description[i].value] += number_of_relating_context(though.description[i].context, parents[0].context) /*+ though.context[i].description.length*/ + best_path(though.description[i], parents);
			} else {
				number_count[though.description[i].value] = 1;
			}
			if (number_count[though.description[i].value] > max_count) {
				max_count = number_count[though.description[i].value];
			}
		}
		parents.pop();
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