// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Function to update the UI with analysis results
function updateResults(results) {
    // Update tone analysis
    const toneResult = document.getElementById('tone-result');
    toneResult.innerHTML = `<div class="tone-badge ${results.tone.toLowerCase()}">${results.tone}</div>`;

    // Update gender-coded language
    const genderResult = document.getElementById('gender-result');
    if (results.gender_coded.length > 0) {
        genderResult.innerHTML = results.gender_coded.map(item => `
            <div class="flagged-word">
                <span class="word">${item.word}</span>
                <span class="gender-tag ${item.gender}">${item.gender}</span>
                <div class="suggestion">${item.suggestion}</div>
            </div>
        `).join('');
    } else {
        genderResult.textContent = 'No gender-coded words detected';
    }

    // Handle inclusive language suggestions (combining pronouns and relationships)
    const inclusiveResult = document.getElementById('inclusive-result');
    
    // Combine pronoun and relationship suggestions for the inclusive-result section
    const pronounSuggestions = results.pronoun_suggestions || [];
    const relationshipSuggestions = results.relationship_suggestions || [];
    
    if (pronounSuggestions.length > 0 || relationshipSuggestions.length > 0) {
        let inclusiveHTML = '';
        
        // Add pronoun suggestions
        if (pronounSuggestions.length > 0) {
            inclusiveHTML += '<h4>Pronouns</h4>';
            inclusiveHTML += pronounSuggestions.map(item => `
                <div class="suggestion-item">
                    <div class="original">${item.original}</div>
                    <div class="suggestion">→ ${item.suggestion}</div>
                    <div class="explanation">${item.explanation}</div>
                </div>
            `).join('');
        }
        
        // Add relationship suggestions
        if (relationshipSuggestions.length > 0) {
            inclusiveHTML += '<h4>Relationships</h4>';
            inclusiveHTML += relationshipSuggestions.map(item => `
                <div class="suggestion-item">
                    <div class="original">${item.original}</div>
                    <div class="suggestion">→ ${item.suggestion}</div>
                    <div class="explanation">${item.explanation}</div>
                </div>
            `).join('');
        }
        
        inclusiveResult.innerHTML = inclusiveHTML;
    } else {
        inclusiveResult.textContent = 'No gendered pronouns or relationship terms detected';
    }

    // Update microaggressions
    const microaggressionResult = document.getElementById('microaggression-result');
    if (results.microaggressions.length > 0) {
        microaggressionResult.innerHTML = results.microaggressions.map(item => `
            <div class="microaggression-item">
                <div class="pattern">${item.pattern.replace(/\\b/g, '')}</div>
                <div class="explanation">${item.explanation}</div>
            </div>
        `).join('');
    } else {
        microaggressionResult.textContent = 'No microaggressions detected';
    }

    // Update professional title suggestions
    const titleResult = document.getElementById('title-result');
    if (results.professional_title_suggestions.length > 0) {
        titleResult.innerHTML = results.professional_title_suggestions.map(item => `
            <div class="suggestion-item">
                <div class="original">${item.original}</div>
                <div class="suggestion">→ ${item.suggestion}</div>
                <div class="explanation">${item.explanation}</div>
            </div>
        `).join('');
    } else {
        titleResult.textContent = 'No gendered titles detected';
    }
}

// Function to analyze text
async function analyzeText(text) {
    if (!text.trim()) {
        // Reset all results if text is empty
        document.getElementById('tone-result').textContent = 'Waiting for input...';
        document.getElementById('gender-result').textContent = 'No gender-coded words detected';
        document.getElementById('inclusive-result').textContent = 'No gendered pronouns or relationship terms detected';
        document.getElementById('microaggression-result').textContent = 'No microaggressions detected';
        document.getElementById('title-result').textContent = 'No gendered titles detected';
        return;
    }

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const results = await response.json();
        updateResults(results);
    } catch (error) {
        console.error('Error analyzing text:', error);
        document.getElementById('tone-result').textContent = 'Error analyzing text';
    }
}

// Add event listener to textarea with debounce
document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    if (textInput) {
        textInput.addEventListener('input', debounce((e) => {
            analyzeText(e.target.value);
        }, 500));
    } else {
        console.error('Could not find text-input element');
    }
});

// Add interactive card features
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.result-card');
    
    cards.forEach(card => {
        // Add click-to-expand functionality
        card.addEventListener('click', () => {
            const content = card.querySelector('div[id$="-result"]');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                card.style.transform = '';
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                card.style.transform = 'scale(1.02) translateY(-10px)';
            }
        });

        // Add tilt effect on mouse move
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const angleX = (y - centerY) / 20;
            const angleY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(1.02)`;
        });

        // Reset tilt on mouse leave
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
});

// Add some initial styles
const style = document.createElement('style');
style.textContent = `
    .tone-badge {
        display: inline-block;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: 500;
        background-color: var(--success-color);
        color: white;
    }

    .flagged-word {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background-color: var(--card-background);
        border-radius: 5px;
        border-left: 4px solid var(--primary-color);
    }

    .gender-tag {
        padding: 0.25rem 0.5rem;
        border-radius: 10px;
        font-size: 0.8rem;
        display: inline-block;
    }

    .gender-tag.masculine {
        background-color: #E3F2FD;
        color: #1976D2;
    }

    .gender-tag.feminine {
        background-color: #FCE4EC;
        color: #C2185B;
    }

    .gender-tag.neutral {
        background-color: #E8F5E9;
        color: #2E7D32;
    }

    .suggestion-item {
        margin-bottom: 1rem;
        padding: 0.5rem;
        background-color: var(--card-background);
        border-radius: 5px;
        border-left: 4px solid var(--primary-color);
    }

    .suggestion-item .original {
        font-weight: 500;
        color: var(--text-color);
    }

    .suggestion-item .suggestion {
        color: var(--success-color);
        font-weight: 500;
    }

    .suggestion-item .explanation {
        font-size: 0.9rem;
        color: #666;
        margin-top: 0.25rem;
    }

    .microaggression-item {
        margin-bottom: 1rem;
        padding: 0.5rem;
        background-color: var(--warning-color);
        border-radius: 5px;
    }

    .microaggression-item .pattern {
        font-weight: 500;
    }

    .microaggression-item .explanation {
        font-size: 0.9rem;
        margin-top: 0.25rem;
    }
    
    h4 {
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        color: var(--primary-color);
    }
`;
document.head.appendChild(style);