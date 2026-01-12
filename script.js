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
    // Prepare payload with user message
    const payload = {
        source: 'mental-wellness-frontend',
        timestamp: new Date().toISOString(),
        message: userMessage,
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
    let html = text;
    
    // Escape HTML tags first (security)
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Code blocks (```code```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold (**text** or __text__)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Headers (### Header)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Unordered lists (- item or * item)
    html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Ordered lists (1. item)
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Parse tables (| header | header | format)
    html = parseTable(html);
    
    return html;
}

/**
 * Parse markdown tables to HTML
 * @param {string} text - Text that may contain markdown tables
 * @returns {string} - HTML with tables rendered
 */
function parseTable(text) {
    // Match markdown table pattern
    const tableRegex = /((?:(?:^|\n)\|.+\|(?:\n|$))+)/g;
    
    return text.replace(tableRegex, (match) => {
        const lines = match.trim().split('\n');
        if (lines.length < 2) return match;
        
        let html = '<table class="chat-table">';
        
        // Process header row
        const headerCells = lines[0].split('|').filter(cell => cell.trim());
        html += '<thead><tr>';
        headerCells.forEach(cell => {
            html += `<th>${cell.trim()}</th>`;
        });
        html += '</tr></thead>';
        
        // Skip separator line (line 1)
        // Process data rows
        html += '<tbody>';
        for (let i = 2; i < lines.length; i++) {
            const cells = lines[i].split('|').filter(cell => cell.trim());
            if (cells.length > 0) {
                html += '<tr>';
                cells.forEach(cell => {
                    html += `<td>${cell.trim()}</td>`;
                });
                html += '</tr>';
            }
        }
        html += '</tbody></table>';
        
        return html;
    });
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
