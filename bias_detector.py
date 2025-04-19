import re
import joblib
import numpy as np
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

# Load the trained models
def load_models():
    try:
        # Check if files exist
        if not os.path.exists('tfidf_vectorizer.pkl'):
            raise FileNotFoundError("tfidf_vectorizer.pkl not found")
        if not os.path.exists('nb_classifier.pkl'):
            raise FileNotFoundError("nb_classifier.pkl not found")
            
        # Try to load the files using joblib
        tfidf_vectorizer = joblib.load('tfidf_vectorizer.pkl')
        nb_classifier = joblib.load('nb_classifier.pkl')
            
        return tfidf_vectorizer, nb_classifier
        
    except Exception as e:
        print(f"Error loading models: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        return None, None

# Load the models
tfidf_vectorizer, nb_classifier = load_models()

# Professional titles and their gender-neutral alternatives
professional_titles = {
    r"\bchairman\b": "chairperson",
    r"\bspokesman\b": "spokesperson",
    r"\bpoliceman\b": "police officer",
    r"\bfireman\b": "firefighter",
    r"\bstewardess\b": "flight attendant",
    r"\bactress\b": "actor",
    r"\bwaitress\b": "server",
    r"\bsalesman\b": "salesperson",
    r"\bmailman\b": "mail carrier",
    r"\bcongressman\b": "member of congress",
    r"\bforeman\b": "supervisor",
    r"\bworkman\b": "worker",
    r"\bmanpower\b": "workforce",
    r"\bmankind\b": "humankind"
}

# Gender-coded language patterns
gender_coded_patterns = {
    "masculine": [
        "active", "adventurous", "aggressive", "ambitious", "assertive", 
        "confident", "competent", "driven", "energetic", "independent", 
        "leadership", "strong", "successful", "dominant", "competitive",
        "analytical", "logical", "rational", "decisive", "ambitious"
    ],
    "feminine": [
        "emotional", "sensitive", "intuitive", "caring", "supportive", 
        "warm", "gentle", "nurturing", "compassionate", "understanding", 
        "patient", "cheerful", "affectionate", "submissive", "cute", 
        "pretty", "sweet", "cooperative", "empathetic", "nurturing"
    ],
    "neutral": [
        "capable", "skilled", "professional", "experienced", "knowledgeable",
        "efficient", "organized", "reliable", "dedicated", "motivated",
        "innovative", "creative", "collaborative", "adaptable", "flexible"
    ]
}

# Inclusive language patterns
inclusive_patterns = {
    "pronouns": {
        r"\bhe\b": "they",
        r"\bshe\b": "they",
        r"\bhis\b": "their",
        r"\bher\b": "their",
        r"\bhim\b": "them",
        r"\bhimself\b": "themself",
        r"\bherself\b": "themself"
    },
    "relationships": {
        r"\bhusband\b": "spouse/partner",
        r"\bwife\b": "spouse/partner",
        r"\bboyfriend\b": "partner",
        r"\bgirlfriend\b": "partner",
        r"\bfather\b": "parent",
        r"\bmother\b": "parent",
        r"\bson\b": "child",
        r"\bdaughter\b": "child"
    }
}

microaggressions = [
    {
        "pattern": r"\byou should smile more\b",
        "explanation": "Often used in a patronizing context, especially toward women and non-binary individuals."
    },
    {
        "pattern": r"\byou're too sensitive\b",
        "explanation": "Dismisses valid emotional reactions, reinforcing stereotypes."
    },
    {
        "pattern": r"\bare you sure you can handle this\b",
        "explanation": "Implies incompetence or lack of capability."
    },
    {
        "pattern": r"\byou people\b",
        "explanation": "Generalizes and others a group in a potentially offensive way."
    },
    {
        "pattern": r"\bshe must be on her period\b",
        "explanation": "A sexist trope used to delegitimize emotions."
    },
    {
        "pattern": r"\bman up\b",
        "explanation": "Reinforces toxic masculinity and harmful gender expectations."
    },
    {
        "pattern": r"\bnot all men\b",
        "explanation": "Derails conversations about systemic gender issues."
    },
    {
        "pattern": r"\btoughen up\b",
        "explanation": "Similar to 'man up', reinforces toxic expectations of strength."
    },
    {
        "pattern": r"\bso weak\b",
        "explanation": "Uses weakness as a derogatory term, often in a gendered context."
    },
    {
        "pattern": r"\bwhat are your pronouns\b",
        "explanation": "While asking for pronouns is generally good, this specific phrasing can be othering."
    },
    {
        "pattern": r"\byou don't look like a (man|woman)\b",
        "explanation": "Invalidates gender identity and expression."
    }
]

def analyze_tone(text):
    if tfidf_vectorizer is None or nb_classifier is None:
        return "Error: Models not loaded"
    
    text_features = tfidf_vectorizer.transform([text])
    tone = nb_classifier.predict(text_features)[0]
    return tone

def analyze_bias(text):
    text = text.lower()
    words = text.split()
    gender_flags = []
    title_suggestions = []
    pronoun_suggestions = []
    relationship_suggestions = []

    # Analyze tone
    tone = analyze_tone(text)

    # Check for gender-coded words
    for word in words:
        for gender, patterns in gender_coded_patterns.items():
            if word in patterns:
                gender_flags.append({
                    "word": word,
                    "gender": gender,
                    "suggestion": "Consider using more neutral language"
                })

    # Check for gendered professional titles
    for title, alternative in professional_titles.items():
        if re.search(title, text):
            title_suggestions.append({
                "original": re.search(title, text).group(),
                "suggestion": alternative,
                "explanation": f"Consider using the gender-neutral term '{alternative}'"
            })

    # Check for gendered pronouns
    for pronoun, alternative in inclusive_patterns["pronouns"].items():
        if re.search(pronoun, text):
            pronoun_suggestions.append({
                "original": re.search(pronoun, text).group(),
                "suggestion": alternative,
                "explanation": f"Consider using the gender-neutral pronoun '{alternative}'"
            })

    # Check for gendered relationships
    for relationship, alternative in inclusive_patterns["relationships"].items():
        if re.search(relationship, text):
            relationship_suggestions.append({
                "original": re.search(relationship, text).group(),
                "suggestion": alternative,
                "explanation": f"Consider using the gender-neutral term '{alternative}'"
            })

    # Check for microaggressions
    microaggression_flags = []
    for i in microaggressions:
        if re.search(i["pattern"], text):
            microaggression_flags.append({
                "pattern": i["pattern"],
                "explanation": i["explanation"]
            })

    return {
        "tone": tone,
        "gender_coded": gender_flags,
        "microaggressions": microaggression_flags,
        "professional_title_suggestions": title_suggestions,
        "pronoun_suggestions": pronoun_suggestions,
        "relationship_suggestions": relationship_suggestions
    }

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    text = data.get('text', '')
    results = analyze_bias(text)
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)