let { dictonary_geb } = require('./geb.js');

//console.log(dictonary_geb.description['feline']);
//console.log(dictonary_geb.functions.find('person', dictonary_geb).context);
//console.log(dictonary_geb.functions.find('person', dictonary_geb).description);

let sense = 'people';
let thought = dictonary_geb.description[sense];

let list = {};
// Creates a count of how many times a word shows up in the defintion and each words context
for (let i = 0; i < thought.description.length; i++) {
	let step_thought = thought.description[i]
	
	if(list[step_thought.value]){
		list[step_thought.value].count ++;
	} else {
		list[step_thought.value] = {};
		list[step_thought.value].count = 1;
		list[step_thought.value].context = number_of_relating_context(thought.context, step_thought.context);
	}
}

let max_points = 0;
let point_list = {};
// Adds number of times in defintion with matching context
// Must have at least one context in order to move on
for (word in list) {
	if (list[word].context > 0) {
		point_list[word] = list[word].context + list[word].count;
		if (point_list[word] > max_points) {
			max_points = point_list[word];
		}
	}
}

// At dead end
if (max_points == 0) {

}

// Gets through words that are of equal value
let equal_points = [];
for (word in point_list) {
	if (point_list[word] = max_points) {
		equal_points.push(point_list[word]);
	}
}

for (let i = 0; i < equal_points.length; i++) {
	
}

console.log(list);
console.log(point_list);

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