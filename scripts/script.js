// ToDo:

var wordCardHelper = {
    capitalizeFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    fillTemplate: function(template, replacements) {
        var result = template;

        for (var i = 0; i < replacements.length; i += 2) {
            result = result.replace(new RegExp('{{' + replacements[i] + '}}', 'g'),
                replacements[i + 1]);
        }

        return result;
    },

    openFile: async function (event) {
        var file = event.target.files[0];

        // https://stackoverflow.com/questions/51026420/filereader-readastext-async-issues
        return new Promise((resolve, reject) => {
          let content = '';
          const reader = new FileReader();

          // Wait till complete
          reader.onloadend = function(e) {
            content = e.target.result;
            resolve(content);
          };

          // Make sure to handle error states
          reader.onerror = function(e) {
            reject(e);
          };

          reader.readAsText(file);
        });
    },

    shuffle: function(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
};

(function init(parms) {
    var wordCard = {};

    var currentElement = null;
    var audios = null;
    var currentIndex = 0;

    //

    var categoryTemplate = `
        <div class="col-sm">
            <a href="list-category.html?category={{categoryName}}">
                <img src="{{categoryPicture}}" class="list-thumbnail">
                <h3>{{caregoryTitle}}</h3>
            </a>
        </div>
    `;

    var wordTemplate = `
        <div class="col-sm align-bottom" data-audios="{{wordAudios}}"
                onmouseover="window.wordCard.onmouseover(this)"
                onmouseleave="window.wordCard.onmouseleave(this)">
            <div class="sound-image">
                <img class="img-thumbnail" src="{{wordImage}}">
            </div>
            <div class="sound-ctrl sound" onclick="window.wordCard.playNextAudio(this.parentElement)"></div>
            <div class="sound-ctrl sound-repeat" onclick="window.wordCard.playNextAudio(this.parentElement, true)"></div>
            <div class="sound-stat"></div>
        </div>
    `;

    function getGategory() {
        const urlParams = new URLSearchParams(window.location.search);
        const cat = urlParams.get('category');
        return cat;
    }

    function getChildElement(element, childClass) {
        for (var i = 0; i < element.children.length; i++) {
            if (element.children[i].classList.contains(childClass)) {
                return element.children[i];
            }
        }

        return null;
    };

    wordCard.onmouseover = function(element) {
        if (element == currentElement) {
            getChildElement(element, 'sound-repeat').classList.add('visible');
            getChildElement(element, 'sound-stat').classList.add('visible');
        }
    };

    wordCard.onmouseleave = function(element) {
        getChildElement(element, 'sound-repeat').classList.remove('visible');
        getChildElement(element, 'sound-stat').classList.remove('visible');
    };

    wordCard.playNextAudio = function(element, repeat) {
        if (currentElement != element) {
            currentElement = element;
            audios = element.dataset.audios.trim().split(/\s+/gm);
            currentIndex = repeat ? 0 : -1;
        }

        if (!repeat) {
            currentIndex++;
        }
        if (currentIndex >= audios.length) {
            currentIndex = 0;
        }

        var audio = new Audio(audios[currentIndex]);

        console.log('Playing ' + currentIndex + ' audio...');
        audio.play();

        getChildElement(currentElement, 'sound-repeat').classList.add('visible');

        // Show statistics.
        var statInfo = (currentIndex + 1) + '/' + audios.length;
        var statEl = getChildElement(currentElement, 'sound-stat');
        statEl.innerHTML = statInfo;
        statEl.classList.add('visible');
    };

    wordCard.listCategories = function(perRow) {
        console.log('Creating categories...');

        var categories = parms.repository.getCategories();

        var resultStr = '<div>\n';

        for (var i = 0; i < categories.length; i += perRow) {
            resultStr += '    <div class="row">';

            for (var j = 0; j < perRow; j++) {
                if (i + j < categories.length) {
                    resultStr += wordCardHelper.fillTemplate(categoryTemplate, [
                        'categoryName',    categories[i+j].name,
                        'categoryPicture', categories[i+j].picturePath,
                        'caregoryTitle',   wordCardHelper.capitalizeFirstLetter(categories[i+j].name)
                    ]);
                }
            }

            resultStr += '</div>\n';
        }

        resultStr += '</div>';

        document.getElementById('categoriesList').innerHTML = resultStr;
    };

    wordCard.listVocabulary = function(perRow) {
        console.log('Listing vocabulary...');

        var category = getGategory();

        document.title = 'Word Cards - ' + category;

        var resultStr = '';
        var vocabulary = parms.repository.getVocabulary()
                .filter(entry => entry.categories.indexOf(category) != -1);
        
        if (parms.repository.getShuffle()) {
            wordCardHelper.shuffle(vocabulary);
        }

        for (var i = 0; i < vocabulary.length; i += perRow) {
            resultStr += '<br><div class="row align-items-end">\n';

            for (var j = 0; j < perRow; j++) {
                if (i + j < vocabulary.length) {
                    resultStr += wordCardHelper.fillTemplate(wordTemplate, [
                        'wordAudios', vocabulary[i + j].pronunciations.join('\n'),
                        'wordImage', vocabulary[i + j].picture
                    ]);
                }
                else {
                    resultStr += '<div class="col"></div>';
                }
            }

            resultStr += '</div>';
        }

        document.getElementById('vocabulary').innerHTML = resultStr;
    };

    wordCard.importCategories = async function(event) {
        console.log('Importing from file...');

        var text = await wordCardHelper.openFile(event);
        var vocabulary = JSON.parse(text);

        parms.repository.saveCategories(JSON.stringify(vocabulary));
    };

    wordCard.importVocabulary = async function(event) {
        console.log('Importing from file...');

        var text = await wordCardHelper.openFile(event);
        var vocabulary = JSON.parse(text);

        parms.repository.saveVocabulary(JSON.stringify(vocabulary));
    };

    wordCard.shuffleChange = function() {
        var shuffle = document.getElementById('chkShuffle').checked;
        parms.repository.saveShuffle(shuffle);
    }

    wordCard.test = function() {
        console.log('Settings...');

        var vocabulary = parms.repository.getVocabulary();

        console.log(JSON.stringify(vocabulary));
    };

    //

    window.wordCard = wordCard;

})({
    repository: {

        getCategories: function() {
            return JSON.parse(localStorage.getItem('categories'));
        },

        saveCategories: function(text) {
            localStorage.setItem('categories', text);
        },

        getVocabulary: function() {
            return JSON.parse(localStorage.getItem('vocabulary'));
        },

        saveVocabulary: function(text) {
            localStorage.setItem('vocabulary', text);
        },

        getShuffle: function() {
            var shuffle = localStorage.getItem('shuffle');
            if (shuffle === null) {
                this.saveShuffle(false);
                return false;
            }
            return JSON.parse(shuffle);
        },

        saveShuffle: function(shuffle) {
            localStorage.setItem('shuffle', shuffle);
        },

        check: function() {
            var categories = this.getCategories();
            var categoryNames = [];

            for (var i = 0; i < categories.length; i++) {
                categoryNames.push(categories[i].name);
            }

            var vocabulary = this.getVocabulary();
            var categoriesVoc = [];

            for (var i = 0; i < vocabulary.length; i++) {
                for (var j = 0; j < vocabulary[i].categories.length; j++) {
                    if (categoriesVoc.indexOf(vocabulary[i].categories[j]) < 0) {
                        categoriesVoc.push(vocabulary[i].categories[j]);
                    }
                }
            }

            // Check.

            for (var i = 0; i < categoriesVoc.length; i++) {
                if (categoryNames.indexOf(categoriesVoc[i]) == -1) {
                    console.log('Category not found: ' + categoriesVoc[i]);
                }
            }
        }
    }
});