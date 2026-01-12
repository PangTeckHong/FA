/**
 * MENTAL WELLNESS MICRO-COACH
 * JavaScript for Landing Page Interactions
 */

// ========================================
// SMOOTH SCROLLING
// ========================================

/**
 * Enable smooth scrolling for anchor links
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get all anchor links that start with #
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                // Smooth scroll to target section
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// ========================================
// SCROLL ANIMATIONS
// ========================================

/**
 * Add fade-in animation when sections come into view
 */
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, observerOptions);

// Observe sections for animation
window.addEventListener('load', function() {
    const sections = document.querySelectorAll('.about, .how-it-works, .chatbot-placeholder, .disclaimer');
    sections.forEach(section => {
        observer.observe(section);
    });
});

// ========================================
// BUTTON INTERACTIONS
// ========================================

/**
 * Add ripple effect to CTA button
 */
const ctaButton = document.querySelector('.cta-button');

if (ctaButton) {
    ctaButton.addEventListener('click', function(e) {
        // Create ripple element
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        
        // Position ripple at click location
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        // Add ripple to button
        this.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// ========================================
// CHATBOT INTERACTION
// ========================================

/**
 * Webhook Configuration
 * This connects to n8n workflow for AI integration
 */
const WEBHOOK_URL = 'https://n8ngc.codeblazar.org/webhook/f330b68b-3b5a-45b8-bb65-952280da2264';

/**
 * Send a message to the AI chatbot via webhook
 * @param {string} userMessage - The user's message
 * @returns {Promise<string>} - The AI's response
 */
async function sendMessageToAI(userMessage) {
    // Limit message length to prevent token limit errors (approximately 500 words = 750 tokens)
    const MAX_MESSAGE_LENGTH = 2000; // characters
    let messageToSend = userMessage;
    
    if (userMessage.length > MAX_MESSAGE_LENGTH) {
        messageToSend = userMessage.substring(0, MAX_MESSAGE_LENGTH) + '...';
        console.warn('Message truncated to fit token limits');
    }
    
    // Prepare payload with user message
    const payload = {
        source: 'mental-wellness-frontend',
        timestamp: new Date().toISOString(),
        message: messageToSend,
        event: 'chat_message',
        sessionId: getOrCreateSessionId()
    };

    try {
        console.log('Sending message to AI:', payload);

        // Send POST request to webhook
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);

        // Check if request was successful
        if (response.ok) {
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            // Try to parse JSON response
            try {
                const data = JSON.parse(responseText);
                console.log('AI response received:', data);
                console.log('Available fields:', Object.keys(data));
                
                // Extract AI response from the webhook response
                // Try multiple possible field names that n8n/Flowise might use
                const aiMessage = data.response || data.message || data.output || 
                                data.text || data.reply || data.answer || 
                                data.ai_response || data.result || data.data;
                
                // If we found a message field, return it
                if (aiMessage) {
                    return typeof aiMessage === 'string' ? aiMessage : JSON.stringify(aiMessage);
                }
                
                // If the entire response is a string, return it
                if (typeof data === 'string') {
                    return data;
                }
                
                // If data has nested structure, try to find the message
                if (data.data && typeof data.data === 'object') {
                    const nestedMessage = data.data.response || data.data.message || 
                                        data.data.output || data.data.text;
                    if (nestedMessage) {
                        return typeof nestedMessage === 'string' ? nestedMessage : JSON.stringify(nestedMessage);
                    }
                }
                
                // Last resort: return the entire JSON as a string so you can see the structure
                console.warn('Could not find message field. Returning full response.');
                return JSON.stringify(data, null, 2);
            } catch (parseError) {
                console.log('Response is not JSON, using as plain text:', responseText);
                // Return the plain text response directly
                return responseText;
            }
        } else {
            const errorText = await response.text();
            console.error('Webhook error:', response.status, response.statusText, errorText);
            
            // Check if it's a token limit error
            if (errorText.includes('Request too large') || errorText.includes('token')) {
                return "Your message is a bit too detailed for me to process right now. Could you try asking in a shorter, more concise way? I'm here to help! 💙";
            }
            
            throw new Error(`Failed to get AI response: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('AI request failed:', error);
        console.error('Error details:', error.message, error.stack);
        // Return a fallback message
        return "I'm having trouble connecting right now. But I'm here for you. Would you like to try again?";
    }
}

/**
 * Get or create a unique session ID for the user
 * This helps track conversations without identifying users
 */
function getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('chat_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('chat_session_id', sessionId);
    }
    return sessionId;
}

/**
 * Parse markdown-style formatting to HTML
 * @param {string} text - The text with markdown
 * @returns {string} - HTML string
 */
function parseMarkdown(text) {
    try {
        let html = text;
        
        // Parse tables FIRST (before escaping HTML)
        html = parseTable(html);
        
        // Escape HTML tags (security) - but preserve our table HTML
        const tables = [];
        html = html.replace(/<table class="chat-table">[\s\S]*?<\/table>/g, (match) => {
            tables.push(match);
            return `<!---TABLE-PLACEHOLDER-${tables.length - 1}--->`; // Use HTML comment style
        });
        
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Code blocks (```code```)
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Inline code (`code`)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Bold (**text** or __text__)
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Italic (*text* or _text_) - must come after bold
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
        
        // Horizontal rules (---)
        html = html.replace(/^---+$/gm, '<hr>');
        
        // Blockquotes (> text)
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
        
        // Headers (must check from most specific to least)
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Ordered lists (1. item, 2. item, etc)
        html = html.replace(/^\d+\. (.+)$/gm, '<li class="ol-item">$1</li>');
        
        // Unordered lists (- item or * item)
        html = html.replace(/^[*-] (.+)$/gm, '<li class="ul-item">$1</li>');
        
        // Wrap ordered list items in <ol>
        html = html.replace(/((?:<li class="ol-item">.*?<\/li>\s*)+)/gs, '<ol>$1</ol>');
        html = html.replace(/class="ol-item"/g, '');
        
        // Wrap unordered list items in <ul>
        html = html.replace(/((?:<li class="ul-item">.*?<\/li>\s*)+)/gs, '<ul>$1</ul>');
        html = html.replace(/class="ul-item"/g, '');
        
        // Restore table placeholders BEFORE paragraph processing
        tables.forEach((table, index) => {
            html = html.replace(`&lt;!---TABLE-PLACEHOLDER-${index}---&gt;`, `\n\n###TABLE${index}###\n\n`);
        });
        
        // Paragraphs (split by double line breaks)
        html = html.replace(/\n\n+/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');
        
        // Wrap in paragraphs
        html = '<p>' + html + '</p>';
        
        // Clean up paragraphs around tables and block elements
        html = html.replace(/<p>###TABLE(\d+)###<\/p>/g, '###TABLE$1###');
        html = html.replace(/<p>(<h[123]>)/g, '$1');
        html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
        html = html.replace(/<p>(<blockquote>)/g, '$1');
        html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ol>)/g, '$1');
        html = html.replace(/(<\/ol>)<\/p>/g, '$1');
        html = html.replace(/<p>(<pre>)/g, '$1');
        html = html.replace(/(<\/pre>)<\/p>/g, '$1');
        
        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<p><br><\/p>/g, '');
        
        // Restore tables as final step
        tables.forEach((table, index) => {
            html = html.replace(`###TABLE${index}###`, table);
        });
        
        return html;
    } catch (error) {
        console.error('Error in parseMarkdown:', error);
        // Return the original text wrapped in a paragraph if parsing fails
        return '<p>' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
    }
}

/**
 * Parse markdown tables to HTML
 * @param {string} text - Text that may contain markdown tables
 * @returns {string} - HTML with tables rendered
 */
function parseTable(text) {
    try {
        // Split text into lines for easier processing
        const lines = text.split('\n');
        let result = [];
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Check if this line looks like a table row (contains pipes)
            if (line.includes('|')) {
                // Try to find a complete table starting here
                let tableLines = [];
                let j = i;
                
                // Collect consecutive lines with pipes
                while (j < lines.length && lines[j].trim().includes('|')) {
                    tableLines.push(lines[j].trim());
                    j++;
                }
                
                // Check if we have at least 3 lines (header, separator, data)
                // and the second line is a separator (contains dashes)
                if (tableLines.length >= 3 && /^[\s\|:\-]+$/.test(tableLines[1])) {
                    // This is a valid table
                    let html = '<table class="chat-table">';
                    
                    // Process header row
                    const headerCells = tableLines[0]
                        .split('|')
                        .map(cell => cell.trim())
                        .filter(cell => cell !== '');
                    
                    html += '<thead><tr>';
                    headerCells.forEach(cell => {
                        html += `<th>${cell}</th>`;
                    });
                    html += '</tr></thead>';
                    
                    // Process data rows (skip separator at index 1)
                    html += '<tbody>';
                    for (let k = 2; k < tableLines.length; k++) {
                        const cells = tableLines[k]
                            .split('|')
                            .map(cell => cell.trim())
                            .filter(cell => cell !== '');
                        
                        if (cells.length > 0) {
                            html += '<tr>';
                            cells.forEach(cell => {
                                html += `<td>${cell}</td>`;
                            });
                            html += '</tr>';
                        }
                    }
                    html += '</tbody></table>';
                    
                    result.push(html);
                    i = j; // Skip past the table
                } else {
                    // Not a valid table, just add the line
                    result.push(lines[i]);
                    i++;
                }
            } else {
                // Regular line, not part of a table
                result.push(lines[i]);
                i++;
            }
        }
        
        return result.join('\n');
    } catch (error) {
        console.error('Error in parseTable:', error);
        return text; // Return original text if table parsing fails
    }
}

/**
 * Add a message to the chat window
 * @param {string} message - The message text
 * @param {string} sender - Either 'user' or 'ai'
 */
function addChatMessage(message, sender) {
    const chatWindow = document.getElementById('chatWindow');
    
    // Create message container
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', `${sender}-message`);
    
    // Create avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('message-avatar');
    avatarDiv.textContent = sender === 'ai' ? '🤖' : '👤';
    
    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    // For AI messages, parse markdown. For user messages, keep as plain text
    if (sender === 'ai') {
        const formattedHTML = parseMarkdown(message);
        contentDiv.innerHTML = `<div class="message-text">${formattedHTML}</div>`;
    } else {
        const messagePara = document.createElement('p');
        messagePara.textContent = message;
        contentDiv.appendChild(messagePara);
    }
    
    // Assemble message
    if (sender === 'ai') {
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
    } else {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
    }
    
    // Add to chat window with animation
    chatWindow.appendChild(messageDiv);
    
    // Scroll to bottom
    setTimeout(() => {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 100);
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
    }
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

/**
 * Handle sending a chat message
 */
async function handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendMessageBtn');
    const message = chatInput.value.trim();
    
    // Check if message is not empty
    if (message === '') {
        return;
    }
    
    // Add user message to chat
    addChatMessage(message, 'user');
    
    // Clear input field
    chatInput.value = '';
    
    // Disable input while processing
    chatInput.disabled = true;
    sendButton.disabled = true;
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send message to AI and get response
    const aiResponse = await sendMessageToAI(message);
    
    // Hide typing indicator
    hideTypingIndicator();
    
    // Add AI response to chat
    addChatMessage(aiResponse, 'ai');
    
    // Re-enable input
    chatInput.disabled = false;
    sendButton.disabled = false;
    chatInput.focus();
}

/**
 * Initialize chat functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendMessageBtn');
    
    // Send message on button click
    if (sendButton) {
        sendButton.addEventListener('click', handleSendMessage);
    }
    
    // Send message on Enter key
    if (chatInput) {
        chatInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                handleSendMessage();
            }
        });
        
        // Focus on input when page loads
        chatInput.focus();
    }
});
