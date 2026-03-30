# Practical Demonstration: The Evolution of Text Representation

## Introduction: Watching Representation Methods Evolve

In this comprehensive practical demonstration, we will take the same corpus of text and apply each representation method we have learned, witnessing firsthand how text representation has evolved from simple to sophisticated. By seeing the same text processed through one-hot encoding, bag of words, TF-IDF, and word embeddings, you will gain intuitive understanding of what each method captures, what it loses, and why the field has progressed toward increasingly sophisticated representations.

Our demonstration uses a small corpus of five documents about technology and nature. This modest size allows us to show complete calculations while still illustrating the key principles that scale to real-world applications. We will build each representation step by step, examining the resulting vectors and analyzing what semantic information each method preserves or discards.

---

## Our Sample Corpus: Five Documents

Let us begin with our corpus—five short documents covering different topics. These documents are intentionally crafted to demonstrate key challenges and opportunities in text representation: some share topics (machine learning appears in multiple documents), some use synonyms (intelligent/smart), and some have completely different themes (nature versus technology).

```
Document 1 (D1): "Machine learning is transforming technology"
Document 2 (D2): "Deep learning revolutionizes artificial intelligence"  
Document 3 (D3): "Machine learning and deep learning are intelligent systems"
Document 4 (D4): "The forest is beautiful and natural"
Document 5 (D5): "Nature is beautiful and the environment is precious"
```

Before applying any representation method, we perform standard text preprocessing. We convert all text to lowercase, remove punctuation, and tokenize into words. After preprocessing, our documents become:

```
D1: ["machine", "learning", "is", "transforming", "technology"]
D2: ["deep", "learning", "revolutionizes", "artificial", "intelligence"]
D3: ["machine", "learning", "and", "deep", "learning", "are", "intelligent", "systems"]
D4: ["the", "forest", "is", "beautiful", "and", "natural"]
D5: ["nature", "is", "beautiful", "and", "the", "environment", "is", "precious"]
```

Notice that D3 contains "learning" twice—this repetition will matter for frequency-based methods but not for presence-based methods. Also observe that "beautiful" appears in both D4 and D5, while technology-related terms appear only in D1-D3. These patterns will manifest differently in each representation.

---

## Building Our Vocabulary

Every representation method requires a vocabulary—the complete set of unique words across all documents. We extract all unique words and sort them alphabetically for consistency. This vocabulary becomes the foundation for our vector space.

```
Complete Vocabulary (27 unique words):

Position  0: and
Position  1: are
Position  2: artificial
Position  3: beautiful
Position  4: deep
Position  5: environment
Position  6: forest
Position  7: intelligent
Position  8: is
Position  9: learning
Position 10: machine
Position 11: natural
Position 12: nature
Position 13: precious
Position 14: revolutionizes
Position 15: systems
Position 16: technology
Position 17: the
Position 18: transforming

Total vocabulary size: V = 19 words
```

This vocabulary size of 19 determines the dimensionality of our one-hot encoded vectors, bag of words vectors, and TF-IDF vectors. Each method will represent documents in this 19-dimensional space, though in very different ways.

---

## Method 1: One-Hot Encoding

One-hot encoding represents each word as a sparse vector where exactly one position is 1 (corresponding to that word's vocabulary index) and all other positions are 0. Let us encode several words from our vocabulary to see the pattern.

```
One-Hot Encoded Words:

Word: "machine" (position 10)
Vector: [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0]
         0 1 2 3 4 5 6 7 8 9 10 ...

Word: "learning" (position 9)
Vector: [0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0]
         0 1 2 3 4 5 6 7 8 9 10 ...

Word: "beautiful" (position 3)
Vector: [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
         0 1 2 3 4 5 6 7 8 9 10 ...

Word: "is" (position 8)
Vector: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0]
         0 1 2 3 4 5 6 7 8 9 10 ...
```

To represent an entire document, we create a sequence of one-hot vectors, one for each word in order. Document 1 contains five words, so its representation is a sequence of five 19-dimensional vectors.

```
Document 1: "machine learning is transforming technology"

Sequence of one-hot vectors:
Word 1 "machine":      [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0]
Word 2 "learning":     [0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0]
Word 3 "is":           [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0]
Word 4 "transforming": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]
Word 5 "technology":   [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0]

Total representation: 5 vectors × 19 dimensions = 95 numbers
Sparsity: 5 ones out of 95 positions = 94.7% zeros
```

### Analysis of One-Hot Encoding Results

The representation is extremely sparse—only 5.3% of values are non-zero. This sparsity explodes with real-world vocabularies of 50,000 words, where 99.998% of values would be zero. Such extreme sparsity wastes memory and computational resources.

More critically, one-hot encoding treats all words as completely independent. Let us compute the similarity between words using dot product (which equals the cosine similarity for binary vectors):

```
Similarity Analysis:

"machine" · "learning" = 0 (orthogonal)
"machine" · "intelligent" = 0 (orthogonal)
"beautiful" · "precious" = 0 (orthogonal)

Every pair of different words has similarity = 0
```

The words "machine" and "intelligent" have zero similarity, even though they both relate to technology and appear in similar contexts. The words "beautiful" and "precious" also have zero similarity, despite being near-synonyms in many contexts. One-hot encoding cannot capture any semantic relationships — all words are equidistant from each other in this representation space.

For document-level tasks, one-hot encoding provides no direct way to compare documents. We must either use sequential models that process word sequences or aggregate the one-hot vectors somehow (which leads us to our next method).

### Key Insight

**One-hot encoding preserves word identity and sequence order but completely discards semantic relationships and creates prohibitively high-dimensional sparse representations.**

---

## Method 2: Bag of Words

Bag of words aggregates one-hot vectors by counting how many times each vocabulary word appears in a document. This produces a single fixed-length vector per document where each dimension represents a word count.

Let us construct the bag of words representation for each document by counting word occurrences.

```
Document 1: "machine learning is transforming technology"
Token count: machine(1), learning(1), is(1), transforming(1), technology(1)

BoW vector for D1:
Position:  [and, are, artificial, beautiful, deep, environment, forest, 
            intelligent, is, learning, machine, natural, nature, precious,
            revolutionizes, systems, technology, the, transforming]
Counts:    [0,   0,   0,         0,         0,    0,           0,      
            0,           1,  1,        1,       0,       0,      0,
            0,             0,       1,          0,   1]

Compact notation:
D1 = [0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1,0,1]
```

Now let us compute vectors for all five documents:

```
D1: "machine learning is transforming technology"
[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1]

D2: "deep learning revolutionizes artificial intelligence"
[0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0]

D3: "machine learning and deep learning are intelligent systems"
[1, 1, 0, 0, 1, 0, 0, 1, 0, 2, 1, 0, 0, 0, 0, 1, 0, 0, 0]
                            ↑
                          Note: "learning" appears twice, so count = 2

D4: "the forest is beautiful and natural"
[1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]

D5: "nature is beautiful and the environment is precious"
[1, 0, 0, 1, 0, 1, 0, 0, 3, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0]
                            ↑
                   Note: "is" appears three times
```

### Computing Document Similarity with Bag of Words

Now we can compare documents using cosine similarity. Let us compare D1 (machine learning) with D2 (deep learning) and with D4 (forest nature).

```
Cosine Similarity Formula:
similarity(A, B) = (A · B) / (||A|| × ||B||)

Where:
A · B = dot product (sum of element-wise products)
||A|| = magnitude (square root of sum of squares)

D1 vs D2 Similarity:

D1 = [0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1,0,1]
D2 = [0,0,1,0,1,0,0,1,0,1,0,0,0,0,1,0,0,0,0]

Dot product:
Only position 9 (learning) has non-zero values in both: 1×1 = 1
D1 · D2 = 1

Magnitudes:
||D1|| = √(1² + 1² + 1² + 1² + 1²) = √5 ≈ 2.236
||D2|| = √(1² + 1² + 1² + 1² + 1²) = √5 ≈ 2.236

Similarity:
cos(D1, D2) = 1 / (2.236 × 2.236) = 1/5 = 0.20

D1 vs D4 Similarity:

D1 = [0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1,0,1]
D4 = [1,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1,0]

Dot product:
Only position 8 (is) matches: 1×1 = 1
D1 · D4 = 1

Magnitudes:
||D1|| = √5 ≈ 2.236
||D4|| = √(1² + 1² + 1² + 1² + 1² + 1²) = √6 ≈ 2.449

Similarity:
cos(D1, D4) = 1 / (2.236 × 2.449) = 0.183
```

Documents D1 and D2, both about machine learning and AI, have similarity 0.20. Documents D1 and D4, about completely different topics (technology vs nature), have similarity 0.183—almost the same! The similarity is driven almost entirely by common stop words like "is" rather than semantic content.

### Analysis of Bag of Words Results

Bag of words improves over one-hot encoding by creating fixed-length document vectors suitable for machine learning algorithms. The dimensionality remains manageable at vocabulary size (19 dimensions in our case), and we can directly compare documents using vector operations.

However, significant problems remain. The similarity between D1 (technology) and D2 (AI) is barely higher than between D1 (technology) and D4 (nature), despite the obvious topical relationship between D1 and D2. This occurs because the documents share only one content word ("learning") but also share common words like "is."

Word order is completely lost. Consider these hypothetical documents:

```
"The product is not good, it is bad"
"The product is not bad, it is good"

Both would have identical BoW representations:
[the(2), product(1), is(2), not(1), good(1), it(1), bad(1)]

Yet they express opposite sentiments!
```

Common words like "is," "the," and "and" contribute equally to similarity as distinctive content words. Document D3 has "learning" appearing twice, giving it count 2, but this frequency information doesn't effectively capture the document's meaning—it's still dominated by the presence/absence pattern.

### Key Insight

**Bag of words creates fixed-length document vectors and captures word frequency, but treats all words equally, loses word order, and cannot distinguish important from unimportant words.**

---

## Method 3: TF-IDF

TF-IDF addresses bag of words' weakness by weighting words according to their importance. Common words appearing in many documents receive low weights, while distinctive words appearing in few documents receive high weights.

### Step 1: Calculate Document Frequencies

First, we count in how many documents each word appears (Document Frequency, DF):

```
Word Document Frequencies:

Word              | D1 | D2 | D3 | D4 | D5 | DF
------------------|----|----|----|----|----|----|
and               | 0  | 0  | 1  | 1  | 1  | 3
are               | 0  | 0  | 1  | 0  | 0  | 1
artificial        | 0  | 1  | 0  | 0  | 0  | 1
beautiful         | 0  | 0  | 0  | 1  | 1  | 2
deep              | 0  | 1  | 1  | 0  | 0  | 2
environment       | 0  | 0  | 0  | 0  | 1  | 1
forest            | 0  | 0  | 0  | 1  | 0  | 1
intelligent       | 0  | 1  | 1  | 0  | 0  | 2
is                | 1  | 0  | 0  | 1  | 1  | 3
learning          | 1  | 1  | 1  | 0  | 0  | 3
machine           | 1  | 0  | 1  | 0  | 0  | 2
natural           | 0  | 0  | 0  | 1  | 0  | 1
nature            | 0  | 0  | 0  | 0  | 1  | 1
precious          | 0  | 0  | 0  | 0  | 1  | 1
revolutionizes    | 0  | 1  | 0  | 0  | 0  | 1
systems           | 0  | 0  | 1  | 0  | 0  | 1
technology        | 1  | 0  | 0  | 0  | 0  | 1
the               | 0  | 0  | 0  | 1  | 1  | 2
transforming      | 1  | 0  | 0  | 0  | 0  | 1
```

### Step 2: Calculate IDF Values

Now we compute IDF for each word using the formula: IDF(word) = log(N / DF), where N = 5 (total documents).

```
IDF Calculations:

Total documents: N = 5

High IDF (rare words, appear in 1 document):
IDF("are")          = log(5/1) = log(5) = 1.609
IDF("artificial")   = log(5/1) = 1.609
IDF("environment")  = log(5/1) = 1.609
IDF("forest")       = log(5/1) = 1.609
IDF("natural")      = log(5/1) = 1.609
IDF("nature")       = log(5/1) = 1.609
IDF("precious")     = log(5/1) = 1.609
IDF("revolutionizes") = log(5/1) = 1.609
IDF("systems")      = log(5/1) = 1.609
IDF("technology")   = log(5/1) = 1.609
IDF("transforming") = log(5/1) = 1.609

Medium IDF (appear in 2 documents):
IDF("beautiful")    = log(5/2) = log(2.5) = 0.916
IDF("deep")         = log(5/2) = 0.916
IDF("intelligent")  = log(5/2) = 0.916
IDF("machine")      = log(5/2) = 0.916
IDF("the")          = log(5/2) = 0.916

Low IDF (common words, appear in 3 documents):
IDF("and")          = log(5/3) = log(1.667) = 0.511
IDF("is")           = log(5/3) = 0.511
IDF("learning")     = log(5/3) = 0.511

Pattern: Rare words (DF=1) get highest weight (1.609)
         Common words (DF=3) get lowest weight (0.511)
```

### Step 3: Calculate TF-IDF Vectors

For each document, we multiply term frequency by IDF. Let us compute complete TF-IDF vectors for D1 and D2.

```
Document 1: "machine learning is transforming technology"

Word          | TF    | IDF   | TF-IDF
--------------|-------|-------|-------
machine       | 1     | 0.916 | 0.916
learning      | 1     | 0.511 | 0.511
is            | 1     | 0.511 | 0.511
transforming  | 1     | 1.609 | 1.609
technology    | 1     | 1.609 | 1.609

D1 TF-IDF vector (showing only non-zero positions):
[..., is:0.511, learning:0.511, machine:0.916, ..., technology:1.609, ..., transforming:1.609]

Full vector (all 19 positions):
Position: [and, are, artif, beaut, deep, env, forest, intel, is, learn, 
           mach, nat, nature, prec, revol, sys, tech, the, trans]
D1 = [0, 0, 0, 0, 0, 0, 0, 0, 0.511, 0.511, 0.916, 0, 0, 0, 0, 0, 
      1.609, 0, 1.609]


Document 2: "deep learning revolutionizes artificial intelligence"

Word          | TF    | IDF   | TF-IDF
--------------|-------|-------|-------
deep          | 1     | 0.916 | 0.916
learning      | 1     | 0.511 | 0.511
revolutionizes| 1     | 1.609 | 1.609
artificial    | 1     | 1.609 | 1.609
intelligent   | 1     | 0.916 | 0.916

D2 TF-IDF vector:
[0, 0, 1.609, 0, 0.916, 0, 0, 0.916, 0, 0.511, 0, 0, 0, 0, 1.609, 
 0, 0, 0, 0]


Document 3: "machine learning and deep learning are intelligent systems"

Word        | TF    | IDF   | TF-IDF
------------|-------|-------|-------
machine     | 1     | 0.916 | 0.916
learning    | 2     | 0.511 | 1.022  ← Note: TF=2
and         | 1     | 0.511 | 0.511
deep        | 1     | 0.916 | 0.916
are         | 1     | 1.609 | 1.609
intelligent | 1     | 0.916 | 0.916
systems     | 1     | 1.609 | 1.609

D3 TF-IDF vector:
[0.511, 1.609, 0, 0, 0.916, 0, 0, 0.916, 0, 1.022, 0.916, 0, 0, 0, 
 0, 1.609, 0, 0, 0]
```

### Step 4: Compare Documents with TF-IDF

Now let us compute similarities using TF-IDF vectors and compare with bag of words results.

```
D1 vs D2 Similarity (TF-IDF):

D1 = [0, 0, 0, 0, 0, 0, 0, 0, 0.511, 0.511, 0.916, 0, 0, 0, 0, 0, 
      1.609, 0, 1.609]
D2 = [0, 0, 1.609, 0, 0.916, 0, 0, 0.916, 0, 0.511, 0, 0, 0, 0, 
      1.609, 0, 0, 0, 0]

Dot product (only position 9 "learning" overlaps):
D1 · D2 = 0.511 × 0.511 = 0.261

Magnitudes:
||D1|| = √(0.511² + 0.511² + 0.916² + 1.609² + 1.609²) 
       = √6.282 = 2.506
||D2|| = √(1.609² + 0.916² + 0.916² + 0.511² + 1.609²) 
       = √6.282 = 2.506

Cosine similarity:
cos(D1, D2) = 0.261 / (2.506 × 2.506) = 0.0415

D1 vs D4 Similarity (TF-IDF):

D4 = [0.511, 0, 0, 0.916, 0, 0, 1.609, 0, 0.511, 0, 0, 1.609, 0, 0, 
      0, 0, 0, 0.916, 0]

Only position 8 "is" overlaps:
D1 · D4 = 0.511 × 0.511 = 0.261

||D4|| = √(0.511² + 0.916² + 1.609² + 0.511² + 1.609² + 0.916²) 
       = √6.282 = 2.506

Cosine similarity:
cos(D1, D4) = 0.261 / (2.506 × 2.506) = 0.0415

PROBLEM: Still showing similar similarity scores!
```

Wait—we are getting the same similarity for D1-D2 and D1-D4! This seems wrong. The issue is that our corpus is too small and our documents only share one word each. Let us compute D1 vs D3 for a more meaningful comparison:

```
D1 vs D3 Similarity:

D1 = [0, 0, 0, 0, 0, 0, 0, 0, 0.511, 0.511, 0.916, 0, 0, 0, 0, 0, 
      1.609, 0, 1.609]
D3 = [0.511, 1.609, 0, 0, 0.916, 0, 0, 0.916, 0, 1.022, 0.916, 0, 
      0, 0, 0, 1.609, 0, 0, 0]

Overlapping words: "learning" (pos 9) and "machine" (pos 10)

Dot product:
learning: 0.511 × 1.022 = 0.522
machine:  0.916 × 0.916 = 0.839
Total: 0.522 + 0.839 = 1.361

Magnitudes:
||D1|| = 2.506
||D3|| = √(0.511² + 1.609² + 0.916² + 0.916² + 1.022² + 0.916² + 1.609²)
       = √7.693 = 2.774

Cosine similarity:
cos(D1, D3) = 1.361 / (2.506 × 2.774) = 0.196

This is higher than D1-D2 (0.0415) because D1 and D3 share two content words!
```

### Analysis of TF-IDF Results

TF-IDF successfully downweights common words. Notice that "learning" (appears in 3 documents) has IDF = 0.511, while unique words like "technology" and "transforming" have IDF = 1.609—more than three times higher. This means distinctive words contribute more to similarity calculations.

In Document 3, "learning" appears twice (TF=2), so its TF-IDF is 2 × 0.511 = 1.022, higher than words appearing once. This captures the intuition that repeated words are more important to the document.

However, TF-IDF still cannot capture semantic similarity. The words "machine" and "intelligent" both relate to technology but have no relationship in TF-IDF space—they occupy orthogonal dimensions just like in bag of words. The words "beautiful" and "precious" are semantically similar but completely independent in TF-IDF representation.

Word order remains lost. "Machine learning is good" and "Good is machine learning" would have identical TF-IDF vectors. This makes TF-IDF unsuitable for tasks requiring understanding of syntax, negation, or sentence structure.

### Key Insight

**TF-IDF weights words by importance, emphasizing distinctive terms and downweighting common words, but still treats words as independent dimensions and cannot capture semantic relationships or word order.**

---

## Method 4: Word2Vec Embeddings

Now we enter the modern era of word embeddings. Word2Vec learns dense, low-dimensional vectors where semantically similar words have similar representations. For this demonstration, we will use pre-trained Word2Vec embeddings rather than training from scratch (which would require a much larger corpus).

### Pre-trained Word Embeddings

Let us imagine we have pre-trained 5-dimensional Word2Vec embeddings (real embeddings use 100-300 dimensions, but 5 dimensions make the demonstration manageable). These embeddings were learned from a large corpus and capture semantic relationships.

```
Pre-trained Word2Vec Embeddings (5 dimensions):

Technology/AI cluster:
machine:        [0.8, 0.7, 0.1, 0.2, 0.1]
learning:       [0.7, 0.8, 0.2, 0.1, 0.1]
deep:           [0.6, 0.7, 0.3, 0.1, 0.2]
artificial:     [0.7, 0.6, 0.2, 0.2, 0.1]
intelligent:    [0.7, 0.7, 0.1, 0.3, 0.2]
technology:     [0.8, 0.6, 0.1, 0.1, 0.2]
systems:        [0.6, 0.5, 0.4, 0.2, 0.1]
revolutionizes: [0.5, 0.4, 0.3, 0.3, 0.2]

Nature/Beauty cluster:
forest:         [0.1, 0.2, 0.7, 0.8, 0.1]
nature:         [0.1, 0.1, 0.8, 0.7, 0.2]
beautiful:      [0.2, 0.1, 0.6, 0.9, 0.3]
natural:        [0.1, 0.2, 0.7, 0.7, 0.1]
environment:    [0.2, 0.1, 0.8, 0.6, 0.2]
precious:       [0.2, 0.2, 0.5, 0.8, 0.4]

Function words (low magnitude across dimensions):
is:             [0.1, 0.1, 0.1, 0.1, 0.1]
and:            [0.1, 0.1, 0.1, 0.1, 0.0]
are:            [0.1, 0.1, 0.1, 0.1, 0.1]
the:            [0.1, 0.0, 0.1, 0.1, 0.0]

Other:
transforming:   [0.5, 0.6, 0.2, 0.2, 0.3]
```

Notice the patterns in these embeddings:

- Technology words ("machine", "learning", "artificial") have high values in dimensions 0 and 1
- Nature words ("forest", "nature", "beautiful") have high values in dimensions 2 and 3
- Function words ("is", "and", "the") have uniformly low values
- Related words cluster together in the vector space

### Computing Word Similarities

Let us verify that semantically similar words have similar embeddings by computing cosine similarities:

```
Similarity Calculations:

"machine" · "learning":
[0.8, 0.7, 0.1, 0.2, 0.1] · [0.7, 0.8, 0.2, 0.1, 0.1]
= 0.8×0.7 + 0.7×0.8 + 0.1×0.2 + 0.2×0.1 + 0.1×0.1
= 0.56 + 0.56 + 0.02 + 0.02 + 0.01 = 1.17

||machine|| = √(0.8² + 0.7² + 0.1² + 0.2² + 0.1²) = √1.19 = 1.091
||learning|| = √(0.7² + 0.8² + 0.2² + 0.1² + 0.1²) = √1.19 = 1.091

cos(machine, learning) = 1.17 / (1.091 × 1.091) = 0.983
→ Very high similarity! (close to 1.0)


"machine" · "intelligent":
[0.8, 0.7, 0.1, 0.2, 0.1] · [0.7, 0.7, 0.1, 0.3, 0.2]
= 0.8×0.7 + 0.7×0.7 + 0.1×0.1 + 0.2×0.3 + 0.1×0.2
= 0.56 + 0.49 + 0.01 + 0.06 + 0.02 = 1.14

||intelligent|| = √(0.7² + 0.7² + 0.1² + 0.3² + 0.2²) = √1.13 = 1.063

cos(machine, intelligent) = 1.14 / (1.091 × 1.063) = 0.983
→ Also very high similarity!


"beautiful" · "precious":
[0.2, 0.1, 0.6, 0.9, 0.3] · [0.2, 0.2, 0.5, 0.8, 0.4]
= 0.2×0.2 + 0.1×0.2 + 0.6×0.5 + 0.9×0.8 + 0.3×0.4
= 0.04 + 0.02 + 0.30 + 0.72 + 0.12 = 1.20

||beautiful|| = √(0.2² + 0.1² + 0.6² + 0.9² + 0.3²) = √1.31 = 1.145
||precious|| = √(0.2² + 0.2² + 0.5² + 0.8² + 0.4²) = √1.09 = 1.044

cos(beautiful, precious) = 1.20 / (1.145 × 1.044) = 1.004
→ Extremely high similarity! (essentially 1.0)


"machine" · "forest" (different semantic domains):
[0.8, 0.7, 0.1, 0.2, 0.1] · [0.1, 0.2, 0.7, 0.8, 0.1]
= 0.8×0.1 + 0.7×0.2 + 0.1×0.7 + 0.2×0.8 + 0.1×0.1
= 0.08 + 0.14 + 0.07 + 0.16 + 0.01 = 0.46

||forest|| = √(0.1² + 0.2² + 0.7² + 0.8² + 0.1²) = √1.19 = 1.091

cos(machine, forest) = 0.46 / (1.091 × 1.091) = 0.386
→ Much lower similarity (different topics)


Summary:
- Related words (same domain): similarity ≈ 0.98-1.00
- Unrelated words (different domains): similarity ≈ 0.39
- Clear distinction based on meaning!
```

This is revolutionary! Word2Vec captures that "machine" and "intelligent" are related (similarity 0.983) even though they are completely orthogonal in one-hot/BoW/TF-IDF representations. Similarly, "beautiful" and "precious" have similarity ~1.0, reflecting their semantic relationship.

### Representing Documents with Word Embeddings

For document representation, we have individual word vectors but need a single document vector. This is where we need aggregation methods. Let us represent each document as a matrix of word vectors first:

```
Document 1: "machine learning is transforming technology"

Word vectors (5 words × 5 dimensions):
machine:      [0.8, 0.7, 0.1, 0.2, 0.1]
learning:     [0.7, 0.8, 0.2, 0.1, 0.1]
is:           [0.1, 0.1, 0.1, 0.1, 0.1]
transforming: [0.5, 0.6, 0.2, 0.2, 0.3]
technology:   [0.8, 0.6, 0.1, 0.1, 0.2]

Document representation: 5×5 matrix
This is not a single vector yet!
```

We have word vectors but no single document vector. This brings us to our final method.

### Key Insight

**Word2Vec creates dense, low-dimensional embeddings where semantically similar words have similar vectors, capturing relationships impossible in sparse classical methods. However, it provides word-level representations, not document-level representations.**

---

## Method 5: Average Word2Vec

Average Word2Vec solves the document representation problem by computing the arithmetic mean of all word embeddings in a document. This aggregates individual word vectors into a single document vector that captures the overall semantic content.

### Computing Average Embeddings for Each Document

Let us compute the average Word2Vec representation for all five documents:

```
Document 1: "machine learning is transforming technology"

Word embeddings:
machine:      [0.8, 0.7, 0.1, 0.2, 0.1]
learning:     [0.7, 0.8, 0.2, 0.1, 0.1]
is:           [0.1, 0.1, 0.1, 0.1, 0.1]
transforming: [0.5, 0.6, 0.2, 0.2, 0.3]
technology:   [0.8, 0.6, 0.1, 0.1, 0.2]

Sum all vectors:
Dimension 0: 0.8 + 0.7 + 0.1 + 0.5 + 0.8 = 2.9
Dimension 1: 0.7 + 0.8 + 0.1 + 0.6 + 0.6 = 2.8
Dimension 2: 0.1 + 0.2 + 0.1 + 0.2 + 0.1 = 0.7
Dimension 3: 0.2 + 0.1 + 0.1 + 0.2 + 0.1 = 0.7
Dimension 4: 0.1 + 0.1 + 0.1 + 0.3 + 0.2 = 0.8

Average (divide by 5 words):
D1_avg = [2.9/5, 2.8/5, 0.7/5, 0.7/5, 0.8/5]
       = [0.58, 0.56, 0.14, 0.14, 0.16]


Document 2: "deep learning revolutionizes artificial intelligence"

Word embeddings:
deep:          [0.6, 0.7, 0.3, 0.1, 0.2]
learning:      [0.7, 0.8, 0.2, 0.1, 0.1]
revolutionizes:[0.5, 0.4, 0.3, 0.3, 0.2]
artificial:    [0.7, 0.6, 0.2, 0.2, 0.1]
intelligent:   [0.7, 0.7, 0.1, 0.3, 0.2]

Sum:
[3.2, 3.2, 1.1, 1.0, 0.8]

Average (divide by 5):
D2_avg = [0.64, 0.64, 0.22, 0.20, 0.16]


Document 3: "machine learning and deep learning are intelligent systems"

Word embeddings:
machine:     [0.8, 0.7, 0.1, 0.2, 0.1]
learning:    [0.7, 0.8, 0.2, 0.1, 0.1]  (appears twice)
and:         [0.1, 0.1, 0.1, 0.1, 0.0]
deep:        [0.6, 0.7, 0.3, 0.1, 0.2]
learning:    [0.7, 0.8, 0.2, 0.1, 0.1]  (second occurrence)
are:         [0.1, 0.1, 0.1, 0.1, 0.1]
intelligent: [0.7, 0.7, 0.1, 0.3, 0.2]
systems:     [0.6, 0.5, 0.4, 0.2, 0.1]

Sum (8 words):
[5.3, 5.4, 1.5, 1.2, 0.9]

Average (divide by 8):
D3_avg = [0.66, 0.68, 0.19, 0.15, 0.11]


Document 4: "the forest is beautiful and natural"

Word embeddings:
the:       [0.1, 0.0, 0.1, 0.1, 0.0]
forest:    [0.1, 0.2, 0.7, 0.8, 0.1]
is:        [0.1, 0.1, 0.1, 0.1, 0.1]
beautiful: [0.2, 0.1, 0.6, 0.9, 0.3]
and:       [0.1, 0.1, 0.1, 0.1, 0.0]
natural:   [0.1, 0.2, 0.7, 0.7, 0.1]

Sum (6 words):
[0.7, 0.7, 2.3, 2.7, 0.6]

Average (divide by 6):
D4_avg = [0.12, 0.12, 0.38, 0.45, 0.10]


Document 5: "nature is beautiful and the environment is precious"

Word embeddings:
nature:      [0.1, 0.1, 0.8, 0.7, 0.2]
is:          [0.1, 0.1, 0.1, 0.1, 0.1]  (appears 3 times)
beautiful:   [0.2, 0.1, 0.6, 0.9, 0.3]
and:         [0.1, 0.1, 0.1, 0.1, 0.0]
the:         [0.1, 0.0, 0.1, 0.1, 0.0]
environment: [0.2, 0.1, 0.8, 0.6, 0.2]
is:          [0.1, 0.1, 0.1, 0.1, 0.1]  (second occurrence)
precious:    [0.2, 0.2, 0.5, 0.8, 0.4]

Sum (8 words):
[1.1, 0.8, 3.1, 3.4, 1.3]

Average (divide by 8):
D5_avg = [0.14, 0.10, 0.39, 0.43, 0.16]
```

### Document Similarity with Average Word2Vec

Now let us compute similarities between documents using these averaged embeddings:

```
D1 vs D2 (both about machine learning/AI):

D1_avg = [0.58, 0.56, 0.14, 0.14, 0.16]
D2_avg = [0.64, 0.64, 0.22, 0.20, 0.16]

Dot product:
0.58×0.64 + 0.56×0.64 + 0.14×0.22 + 0.14×0.20 + 0.16×0.16
= 0.371 + 0.358 + 0.031 + 0.028 + 0.026
= 0.814

||D1_avg|| = √(0.58² + 0.56² + 0.14² + 0.14² + 0.16²) = √0.693 = 0.833
||D2_avg|| = √(0.64² + 0.64² + 0.22² + 0.20² + 0.16²) = √0.923 = 0.961

cos(D1, D2) = 0.814 / (0.833 × 0.961) = 1.016 ≈ 1.0
→ EXTREMELY HIGH similarity (essentially perfect)


D1 vs D4 (technology vs nature):

D1_avg = [0.58, 0.56, 0.14, 0.14, 0.16]
D4_avg = [0.12, 0.12, 0.38, 0.45, 0.10]

Dot product:
0.58×0.12 + 0.56×0.12 + 0.14×0.38 + 0.14×0.45 + 0.16×0.10
= 0.070 + 0.067 + 0.053 + 0.063 + 0.016
= 0.269

||D4_avg|| = √(0.12² + 0.12² + 0.38² + 0.45² + 0.10²) = √0.377 = 0.614

cos(D1, D4) = 0.269 / (0.833 × 0.614) = 0.526
→ MODERATE similarity


D4 vs D5 (both about nature):

D4_avg = [0.12, 0.12, 0.38, 0.45, 0.10]
D5_avg = [0.14, 0.10, 0.39, 0.43, 0.16]

Dot product:
0.12×0.14 + 0.12×0.10 + 0.38×0.39 + 0.45×0.43 + 0.10×0.16
= 0.017 + 0.012 + 0.148 + 0.194 + 0.016
= 0.387

||D5_avg|| = √(0.14² + 0.10² + 0.39² + 0.43² + 0.16²) = √0.391 = 0.625

cos(D4, D5) = 0.387 / (0.614 × 0.625) = 1.008 ≈ 1.0
→ EXTREMELY HIGH similarity


D2 vs D3 (both mention deep learning and intelligence):

D2_avg = [0.64, 0.64, 0.22, 0.20, 0.16]
D3_avg = [0.66, 0.68, 0.19, 0.15, 0.11]

Dot product:
0.64×0.66 + 0.64×0.68 + 0.22×0.19 + 0.20×0.15 + 0.16×0.11
= 0.422 + 0.435 + 0.042 + 0.030 + 0.018
= 0.947

||D3_avg|| = √(0.66² + 0.68² + 0.19² + 0.15² + 0.11²) = √0.936 = 0.968

cos(D2, D3) = 0.947 / (0.961 × 0.968) = 1.018 ≈ 1.0
→ EXTREMELY HIGH similarity
```

### Analysis of Average Word2Vec Results

The results are stunning! Let us compare similarities across all methods:

```
Similarity Comparison Across Methods:

Document Pair    | Topic Relation     | BoW   | TF-IDF | Avg W2V
-----------------|-------------------|-------|--------|--------
D1 vs D2         | Both AI/ML        | 0.200 | 0.042  | 1.000
D1 vs D3         | Both mention ML   | —     | 0.196  | —
D1 vs D4         | Different topics  | 0.183 | 0.042  | 0.526
D2 vs D3         | Both AI/DL        | —     | —      | 1.000
D4 vs D5         | Both nature       | —     | —      | 1.000

Key Observations:

1. Same-topic documents (D1-D2, D2-D3, D4-D5) have similarity ≈ 1.0 with Average Word2Vec
2. Different-topic documents (D1-D4) have much lower similarity (0.526)
3. Bag of Words barely distinguished topics (0.200 vs 0.183)
4. TF-IDF struggled with small corpus (similar scores for related/unrelated docs)
5. Average Word2Vec clearly separates related from unrelated documents!
```

The semantic understanding is remarkable. D1 talks about "machine learning" and "technology," while D2 discusses "deep learning" and "artificial intelligence"—they share only the word "learning." Yet Average Word2Vec gives them near-perfect similarity because the semantic content is nearly identical. The embeddings captured that "machine" relates to "artificial," "learning" relates to "intelligence," and both documents discuss the same domain.

Similarly, D4 and D5 both discuss nature and beauty but use mostly different words ("forest/natural" vs "nature/environment/precious"). Classical methods would rate them as dissimilar, but Average Word2Vec recognizes their semantic similarity through learned embeddings.

The contrast with classical methods is stark:

```
Why Classical Methods Failed:

Bag of Words D1 vs D2:
- Shared only "learning" → low similarity
- Couldn't recognize "machine" ≈ "artificial"
- Couldn't recognize "technology" ≈ "intelligence"

TF-IDF D1 vs D2:
- Downweighted "learning" (common word)
- Made similarity WORSE than BoW!
- Still orthogonal dimensions for related words

Average Word2Vec D1 vs D2:
- "machine" embedding ≈ "artificial" embedding
- "learning" embedding bridges both
- "technology" embedding ≈ "intelligence" embedding
- Result: near-perfect similarity!
```

### Dimensionality Comparison

Let us appreciate the dimensionality reduction:

```
Dimensionality Across Methods:

Method          |Dimensions | Non-zero | Sparsity
----------------|-----------|----------|----------
One-hot         | 19        | 1        | 94.7%
Bag of Words    | 19        | ~5       | ~73%
TF-IDF          | 19        | ~5       | ~73%
Word2Vec        | 5         | 5        | 0%
Avg Word2Vec    | 5         | 5        | 0%

Document D1 storage:
- One-hot: 5 words × 19 dim = 95 numbers (mostly zeros)
- BoW/TF-IDF: 19 numbers (mostly zeros)
- Avg Word2Vec: 5 numbers (all meaningful)

For 50,000 word vocabulary:
- Classical methods: 50,000 dimensions
- Word2Vec: 300 dimensions (167× smaller!)
```

### Limitations Remaining

Despite its power, Average Word2Vec inherits limitations:

```
Word Order Loss:

"Machine learning is not good" 
vs 
"Machine learning is good"

Both average to nearly identical vectors!
The negation "not" gets averaged away.

Solution: Need sequence models (RNNs, Transformers) that preserve order
```

Average Word2Vec also dilutes important information in long documents. If a 1000-word document contains one crucial sentence, averaging buries that signal under 999 other words.

### Key Insight

**Average Word2Vec combines the semantic understanding of embeddings with document-level representation, dramatically outperforming classical methods for capturing document similarity based on meaning rather than word overlap. However, it loses word order and may dilute important localized information.**

---

## The Evolution: Comparing All Methods Side by Side

Let us create a comprehensive comparison showing how each method represents Document 1 and what information each captures or loses.

```
Document 1: "machine learning is transforming technology"

Method 1: One-Hot Encoding
Representation: Sequence of 5 vectors, each 19-dimensional
machine:      [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0]
learning:     [0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0]
is:           [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0]
transforming: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]
technology:   [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0]

✓ Preserves: Word identity, word order
✗ Loses: Semantic similarity, creates 95 numbers (94.7% zeros)
✗ Problem: Cannot compare documents directly


Method 2: Bag of Words  
Representation: Single 19-dimensional vector
[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1]
 ^                       ^  ^  ^                 ^     ^
and                     is learn machine      tech  transform

✓ Preserves: Word presence, word frequency
✗ Loses: Word order, semantic similarity, word importance
✗ Problem: Common and rare words weighted equally


Method 3: TF-IDF
Representation: Single 19-dimensional vector  
[0, 0, 0, 0, 0, 0, 0, 0, 0.511, 0.511, 0.916, 0, 0, 0, 0, 0, 
 1.609, 0, 1.609]
                        ^^^^^ ^^^^^ ^^^^^              ^^^^^  ^^^^^
                        is(↓) learn machine            tech   transform
                              (↓)   (↑)                (↑)    (↑)

✓ Preserves: Word presence, importance weighting
✗ Loses: Word order, semantic similarity  
✓ Improves: Downweights common words, emphasizes distinctive terms
✗ Problem: Still treats semantically related words as orthogonal


Method 4: Word2Vec (individual words)
Representation: 5 vectors, each 5-dimensional
machine:      [0.8, 0.7, 0.1, 0.2, 0.1]
learning:     [0.7, 0.8, 0.2, 0.1, 0.1]
is:           [0.1, 0.1, 0.1, 0.1, 0.1]
transforming: [0.5, 0.6, 0.2, 0.2, 0.3]
technology:   [0.8, 0.6, 0.1, 0.1, 0.2]

✓ Preserves: Semantic similarity (similar words have similar vectors)
✓ Improves: Dense representation (5 dims vs 19), captures meaning
✗ Loses: No single document vector (still 5 separate vectors)
✗ Problem: Cannot directly compare documents yet


Method 5: Average Word2Vec  
Representation: Single 5-dimensional vector
[0.58, 0.56, 0.14, 0.14, 0.16]
 ^^^^  ^^^^  ^^^^  ^^^^  ^^^^
 High  High  Low   Low   Low
 (technology dimensions)

✓ Preserves: Semantic content, document-level representation
✓ Improves: Fixed-length, low-dimensional (5 dims), dense
✓ Captures: Overall topic/theme through averaged semantics
✗ Loses: Word order, individual word importance
✗ Trade-off: Best for topic similarity, not syntax-dependent tasks
```

### Performance Summary Table

```
Comprehensive Comparison:

Capability           | One-Hot | BoW | TF-IDF | W2V | Avg W2V
---------------------|---------|-----|--------|-----|--------
Word Identity        | ✓       | ✓   | ✓      | ✓   | ✓
Word Order           | ✓       | ✗   | ✗      | ✗   | ✗
Word Frequency       | ✗       | ✓   | ✓      | ✗   | ✗
Importance Weighting | ✗       | ✗   | ✓      | ✗   | ✗
Semantic Similarity  | ✗       | ✗   | ✗      | ✓   | ✓
Fixed Document Vec   | ✗       | ✓   | ✓      | ✗   | ✓
Low Dimensionality   | ✗       | ✗   | ✗      | ✓   | ✓
Dense (not sparse)   | ✗       | ✗   | ✗      | ✓   | ✓

Dimensionality       | 19      | 19  | 19     | 5   | 5
Sparsity             | 94.7%   | 73% | 73%    | 0%  | 0%
Captures Synonyms    | ✗       | ✗   | ✗      | ✓   | ✓
Captures Topics      | ✗       | Weak| Weak   | ✓   | ✓
Good for ML          | No      | Yes | Yes    | Word| Yes
```

### The Evolution Story

The progression from classical to modern methods tells a clear story of improvement:

**Stage 1 (One-Hot):** We established the basic principle of representing words as vectors, but treated each word as completely independent. Useful as neural network input but not as final representation.

**Stage 2 (Bag of Words):** We aggregated word occurrences to create document vectors, enabling document comparison. But we lost word order and treated all words equally.

**Stage 3 (TF-IDF):** We added intelligence about word importance, recognizing that rare words matter more than common words. Still couldn't capture semantic relationships.

**Stage 4 (Word2Vec):** We learned semantic representations where similar words have similar vectors, capturing relationships and meaning. Revolutionary but word-level only.

**Stage 5 (Average Word2Vec):** We combined semantic embeddings with document aggregation, creating representations that capture meaning and enable direct document comparison.

Each stage addressed specific limitations of the previous stage while introducing new capabilities. The field continues evolving—modern contextualized embeddings (BERT, GPT) address the remaining limitations of static embeddings, but that's a story for another day.

---

## Practical Implications: When to Use Each Method

Based on our demonstration, here are practical guidelines for choosing representation methods:

```
Use One-Hot Encoding when:
- Feeding words into neural networks (input layer)
- Building sequence models (RNNs, LSTMs)
- You need to preserve exact word identity and order
- Example: Language modeling, machine translation

Use Bag of Words when:
- Building quick baselines for classification
- Working with very small datasets
- Computational resources are extremely limited
- You need maximum interpretability
- Example: Spam detection, simple topic classification

Use TF-IDF when:
- Building information retrieval systems
- Document ranking and search
- You want to emphasize distinctive terms
- Classical ML methods (SVM, Logistic Regression)
- Example: Search engines, document similarity

Use Word2Vec (word-level) when:
- You need semantic similarity between words
- Finding synonyms or analogies
- Word-level predictions (NER, POS tagging)
- Transfer learning with pre-trained embeddings
- Example: Word analogies, semantic search

Use Average Word2Vec when:
- Document classification with semantic understanding
- Document clustering by topic
- Semantic document similarity
- You have pre-trained embeddings available
- Limited training data (transfer learning)
- Example: Article recommendation, topic clustering

DON'T use any of these when:
- Word order critically matters (use RNNs, Transformers)
- Context-dependent meaning is crucial (use BERT, GPT)
- You need to understand negation or syntax
- Working with very long documents (consider hierarchical methods)
```

---

## Conclusion: The Journey from Symbols to Semantics

Our practical demonstration revealed the dramatic evolution of text representation methods. We started with one-hot encoding's simple but sparse symbol assignment, where "machine" and "intelligent" were orthogonal strangers despite their obvious relationship. We progressed through bag of words' frequency counting and TF-IDF's importance weighting, gaining the ability to represent documents but still treating words as independent atomic units.

The revolution came with word embeddings. Suddenly, "machine" and "intelligent" recognized their kinship with similarity scores near 1.0 instead of 0. Documents about the same topic achieved near-perfect similarity even when using different vocabularies. The semantic understanding that humans take for granted began manifesting in numerical representations.

Average Word2Vec completed the journey for document-level tasks, combining semantic embeddings with practical document representation. The contrast is clear: classical methods gave similar scores to related and unrelated document pairs, while Average Word2Vec achieved near-perfect similarity for related documents and notably lower similarity for unrelated ones.

This progression from symbolic to semantic representation underpins modern natural language processing. While newer methods like contextualized embeddings continue advancing the field, the fundamental insights from this evolution remain essential: words are not atomic symbols but carriers of meaning, similar words should have similar representations, and learned representations outperform hand-crafted features.

Understanding this evolution—not just theoretically but through practical application—prepares you to make informed decisions about representation methods for your NLP tasks and to appreciate the sophisticated models that build upon these foundations.