class geb {
	constructor ({context, value, description, functions, master}) {
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

function teach (list, master) {
	let definitions = {};
	for (let i = 0; i < list.length; i ++) {
		let collective_search = master.description[list[i][0]]
		if (!collective_search) { // Word is not in collective (new definition)
			// Creates hash table of words
			definitions[list[i][0]] = new geb({
					// The word
					value: list[i][0],
					// The description of the word, in format of array where each word is attribute
					description: list[i][1].split(' '),
					functions: {
						define
					},
					master
				});
			// Sets the colletive to the most recent version of it
			master = definitions[list[i][0]].master;

		} else { // Word already exists in collective (Word already soft added)
			master.description[list[i][0]].description = collective_search.functions.define(list[i][1].split(' '), collective_search, master)[1];
		}
	}
}

// defnies each word in a description
function define (description, parent_object, master) {
	// Sets definitions as empty
	let definitions = [];

	// For each word in definition
	for (let i = 0; i < description.length; i ++) {
		// If word is already in collective
		if (master.description[description[i]]) {
			// Add another context to the word
			master.description[description[i]].context.push(parent_object);


			// Add word to definitions for parent geb
			definitions.push(master.description[description[i]]);
		} else {
			// Soft word is created
			// Soft word is a word that has no definition so it does not create any
			// recussion, it is the end of a branch
			let new_word = new geb({
				context: [parent_object], // Context is created on leave
				value: description[i], // Set the value of the leave to the description name  
				description: [],
				functions: {
					define // Gives branch power to get a description at some point
				},
				master // Gives copy of collective
			});

			// Adds word to collective
			master.description[description[i]] = new_word;

			// Add word to definitions for parent geb
			definitions.push(new_word);
		}
	}
	// Gives lastest version of master and the definitions
	return [master, definitions];
}

function find (string, master) {
	return master.description[string]
}

function read (sentences, master) {

}

let dictonary_geb = new geb({
	description: [['cat', 'a feline'], ['feline', 'member of the cat family'], ['member', 'one of the people composing a group'], ['group', 'two or more figures forming a complete unit in a composition'], ['figure', 'an object noticeable only as a shape or form'], ['family', 'a person with a common ancestor'], ['people', 'human beings making up a group or assembly or linked by a common interest'], ['human', 'a person'], ['ancestor', 'one from whom a person is descended and who is usually more remote in the line of descent than a grandparent'], ['grandparent', 'a parent of a parent'], ['parent', 'a person who brings up and cares for another'], ['person', 'sometimes used in combination especially by those who prefer to avoid a man in compounds applicable to both sexes'], ['tiger', 'a large cat'], ],
	functions: {
		teach,
		find
	}
});

module.exports = {
	dictonary_geb
}