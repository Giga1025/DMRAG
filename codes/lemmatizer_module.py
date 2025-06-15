import nltk
nltk.download("wordnet")
nltk.download("omw-1.4")
nltk.download('averaged_perceptron_tagger_eng')
from nltk.corpus import wordnet
from nltk.stem import WordNetLemmatizer


def get_wordnet_pos(treebank_tag):
    if treebank_tag.startswith('J'):
        return wordnet.ADJ
    elif treebank_tag.startswith('V'):
        return wordnet.VERB
    elif treebank_tag.startswith('N'):
        return wordnet.NOUN
    elif treebank_tag.startswith('R'):
        return wordnet.ADV
    else:
        return wordnet.NOUN  


def get_lemmas(words):
    grouped = []
    wnl = WordNetLemmatizer()
    
    if isinstance(words[0], list):
        for chunk in words:
            lemmatized_words = []   
            for word, pos in nltk.pos_tag(chunk):
                wordnet_pos = get_wordnet_pos(pos)
                lemma = wnl.lemmatize(word, pos=wordnet_pos)
                lemmatized_words.append(lemma)
            grouped.append(lemmatized_words)
    else: 
            lemmatized_words = []
            for word, pos in nltk.pos_tag(words):
                wordnet_pos = get_wordnet_pos(pos)
                lemma = wnl.lemmatize(word, pos=wordnet_pos)
                lemmatized_words.append(lemma)
            grouped = lemmatized_words
    
    return grouped


# trying = nltk.pos_tag(list1)
# print(trying)
if __name__ == "__main__":

    list1 = ['kites', 'babies', 'dogs', 'flying', 'smiling', 
                'driving', 'jumping', 'tried', 'feet']

    lemma_words = get_lemmas(list1) #word, pos, lemma format
    print(lemma_words )