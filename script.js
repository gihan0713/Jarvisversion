/**
 * JARVIS AI Chat - Powered by Google Gemini API
 * Users enter their own API key
 */

// ===== Configuration =====
const CONFIG = {
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    MAX_HISTORY: 50,
    TYPING_SPEED: 12,
    STORAGE_KEY: 'jarvis_api_key',
    STORAGE_HISTORY: 'jarvis_chat_history',
    STORAGE_THEME: 'jarvis_theme',
};

// ===== State Management =====
const state = {
    apiKey: null,
    chatHistory: [],
    isGenerating: false,
    isVoiceMode: false,
    currentController: null,
    typingInterval: null,
    theme: localStorage.getItem(CONFIG.STORAGE_THEME) || 'dark',
    fileAttachment: null,
};

// ===== DOM Elements =====
const elements = {
    // Modal
    apiModal: document.getElementById('api-modal'),
    apiKeyInput: document.getElementById('api-key-input'),
    toggleApiVisibility: document.getElementById('toggle-api-visibility'),
    saveApiKey: document.getElementById('save-api-key'),
    connectBtn: document.getElementById('connect-btn'),
    apiError: document.getElementById('api-error'),
    
    // App
    appContainer: document.getElementById('app-container'),
    chatForm: document.getElementById('chat-form'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    stopBtn: document.getElementById('stop-btn'),
    messagesArea: document.getElementById('messages-area'),
    welcomeScreen: document.getElementById('welcome-screen'),
    chatContainer: document.getElementById('chat-container'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    newChatBtn: document.getElementById('new-chat-btn'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    changeApiBtn: document.getElementById('change-api-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    voiceToggle: document.getElementById('voice-toggle'),
    voiceOverlay: document.getElementById('voice-overlay'),
    fileInput: document.getElementById('file-input'),
    attachBtn: document.getElementById('attach-btn'),
    filePreview: document.getElementById('file-preview'),
    removeFile: document.getElementById('remove-file'),
    exportBtn: document.getElementById('export-btn'),
    historyList: document.getElementById('history-list'),
    loadingOverlay: document.getElementById('loading-overlay'),
    toastContainer: document.getElementById('toast-container'),
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check for saved API key
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    
    if (savedKey) {
        // Validate and use saved key
        validateAndConnect(savedKey, false);
    } else {
        // Show API key modal
        showApiModal();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Auto-resize textarea
    setupAutoResize();
    
    // Apply theme
    applyTheme(state.theme);
}

// ===== API Key Management =====
function showApiModal() {
    elements.apiModal.classList.remove('hidden');
    elements.appContainer.classList.add('hidden');
    elements.apiKeyInput.value = '';
    elements.apiError.textContent = '';
}

function hideApiModal() {
    elements.apiModal.classList.add('hidden');
    elements.appContainer.classList.remove('hidden');
}

async function validateAndConnect(apiKey, saveToStorage = true) {
    elements.connectBtn.disabled = true;
    elements.connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
    elements.apiError.textContent = '';
    
    try {
        // Test the API key with a simple request
        const testResponse = await fetch(`${CONFIG.API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hello' }] }]
            })
        });
        
        if (!testResponse.ok) {
            const errorData = await testResponse.json();
            throw new Error(errorData.error?.message || 'Invalid API key');
        }
        
        // API key is valid
        state.apiKey = apiKey;
        
        // Save to localStorage if requested
        if (saveToStorage) {
            localStorage.setItem(CONFIG.STORAGE_KEY, apiKey);
        }
        
        hideApiModal();
        showToast('JARVIS connected successfully!', 'success');
        
        // Load chat history
        loadChatHistory();
        
        // Initialize voices for TTS
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
        
    } catch (error) {
        elements.apiError.textContent = `Error: ${error.message}`;
        elements.connectBtn.disabled = false;
        elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect to JARVIS';
        return false;
    }
    
    elements.connectBtn.disabled = false;
    elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect to JARVIS';
    return true;
}

function disconnectApi() {
    state.apiKey = null;
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    state.chatHistory = [];
    localStorage.removeItem(CONFIG.STORAGE_HISTORY);
    showApiModal();
    showToast('API key removed', 'info');
}

// ===== Event Listeners =====
function setupEventListeners() {
    // API Modal
    elements.connectBtn.addEventListener('click', async () => {
        const key = elements.apiKeyInput.value.trim();
        if (!key) {
            elements.apiError.textContent = 'Please enter an API key';
            return;
        }
        if (!key.startsWith('AIza')) {
            elements.apiError.textContent = 'Invalid API key format. Should start with "AIza"';
            return;
        }
        await validateAndConnect(key, elements.saveApiKey.checked);
    });
    
    elements.toggleApiVisibility.addEventListener('click', () => {
        const type = elements.apiKeyInput.type === 'password' ? 'text' : 'password';
        elements.apiKeyInput.type = type;
        elements.toggleApiVisibility.innerHTML = type === 'password' 
            ? '<i class="fas fa-eye"></i>' 
            : '<i class="fas fa-eye-slash"></i>';
    });
    
    elements.apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.connectBtn.click();
        }
    });
    
    // Change API key
    elements.changeApiBtn.addEventListener('click', disconnectApi);
    
    // Form submission
    elements.chatForm.addEventListener('submit', handleSubmit);
    
    // Sidebar
    elements.sidebarToggle.addEventListener('click', toggleSidebar);
    
    // New chat
    elements.newChatBtn.addEventListener('click', startNewChat);
    
    // Clear history
    elements.clearHistoryBtn.addEventListener('click', clearAllHistory);
    
    // Theme
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Voice
    elements.voiceToggle.addEventListener('click', toggleVoiceMode);
    
    // File
    elements.attachBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.removeFile.addEventListener('click', removeFileAttachment);
    
    // Export
    elements.exportBtn.addEventListener('click', exportChat);
    
    // Stop
    elements.stopBtn.addEventListener('click', stopGeneration);
    
    // Suggestions
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.dataset.prompt;
            elements.userInput.value = prompt;
            elements.userInput.style.height = 'auto';
            elements.userInput.style.height = Math.min(elements.userInput.scrollHeight, 150) + 'px';
            elements.chatForm.dispatchEvent(new Event('submit'));
        });
    });
    
    // Keyboard
    document.addEventListener('keydown', handleKeyboard);
    
    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            elements.sidebar.classList.contains('open') &&
            !elements.sidebar.contains(e.target) &&
            !elements.sidebarToggle.contains(e.target)) {
            elements.sidebar.classList.remove('open');
        }
    });
}

// ===== Auto-resize Textarea =====
function setupAutoResize() {
    elements.userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });
}

// ===== Handle Submit =====
async function handleSubmit(e) {
    e.preventDefault();
    
    const message = elements.userInput.value.trim();
    if (!message || state.isGenerating) return;
    
    // Hide welcome, show messages
    elements.welcomeScreen.classList.add('hidden');
    elements.messagesArea.classList.remove('hidden');
    
    // Add user message
    addMessage('user', message);
    
    // Clear input
    elements.userInput.value = '';
    elements.userInput.style.height = 'auto';
    
    // Remove file
    if (state.fileAttachment) {
        removeFileAttachment();
    }
    
    // Show loading
    const loadingId = addLoadingMessage();
    
    // Generate
    await generateResponse(message, loadingId);
}

// ===== Generate Response =====
async function generateResponse(userMessage, loadingId) {
    state.isGenerating = true;
    updateUIState();
    
    state.currentController = new AbortController();
    
    try {
        const requestBody = {
            contents: [{
                role: 'user',
                parts: [{ text: userMessage }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                topP: 0.9,
                topK: 40,
            }
        };
        
        // Add file
        if (state.fileAttachment) {
            requestBody.contents[0].parts.push({
                inline_data: {
                    mime_type: state.fileAttachment.mimeType,
                    data: state.fileAttachment.data
                }
            });
        }
        
        // Add history for context
        if (state.chatHistory.length > 0) {
            const historyParts = state.chatHistory.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));
            requestBody.contents = [...historyParts, ...requestBody.contents];
        }
        
        const response = await fetch(`${CONFIG.API_URL}?key=${state.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: state.currentController.signal,
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                           "I apologize, sir. I couldn't process that request.";
        
        // Remove loading
        removeLoadingMessage(loadingId);
        
        // Add bot message with typing
        await addBotMessageWithTyping(botResponse);
        
        // Save history
        saveToHistory(userMessage, botResponse);
        
        // Speak if voice mode
        if (state.isVoiceMode) {
            speakText(botResponse);
        }
        
    } catch (error) {
        console.error('API Error:', error);
        removeLoadingMessage(loadingId);
        
        const errorMsg = error.name === 'AbortError' 
            ? 'Response generation cancelled.' 
            : `Error: ${error.message}`;
        
        addMessage('bot', errorMsg, true);
    } finally {
        state.isGenerating = false;
        state.currentController = null;
        updateUIState();
    }
}

// ===== Add Message =====
function addMessage(role, content, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' 
        ? '<i class="fas fa-user"></i>' 
        : '<i class="fas fa-robot"></i>';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isError) {
        contentDiv.style.color = 'var(--error-color)';
    }
    
    contentDiv.innerHTML = formatMessage(content);
    wrapper.appendChild(contentDiv);
    
    // Actions for bot
    if (role === 'bot' && !isError) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        actionsDiv.innerHTML = `
            <button class="message-action-btn" onclick="copyMessage(this)" title="Copy">
                <i class="fas fa-copy"></i> Copy
            </button>
            <button class="message-action-btn" onclick="speakMessage(this)" title="Speak">
                <i class="fas fa-volume-up"></i> Speak
            </button>
            <button class="message-action-btn" onclick="regenerateResponse(this)" title="Retry">
                <i class="fas fa-redo"></i> Retry
            </button>
        `;
        wrapper.appendChild(actionsDiv);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(wrapper);
    elements.messagesArea.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

// ===== Loading Message =====
function addLoadingMessage() {
    const id = 'loading-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = id;
    messageDiv.className = 'message bot-message loading';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-wrapper">
            <div class="message-content">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    
    elements.messagesArea.appendChild(messageDiv);
    scrollToBottom();
    return id;
}

function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ===== Typing Effect =====
function addBotMessageWithTyping(text) {
    return new Promise((resolve) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = '';
        
        wrapper.appendChild(contentDiv);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(wrapper);
        elements.messagesArea.appendChild(messageDiv);
        
        let index = 0;
        const chars = text.split('');
        
        state.typingInterval = setInterval(() => {
            if (index < chars.length) {
                contentDiv.textContent += chars[index];
                index++;
                scrollToBottom();
            } else {
                clearInterval(state.typingInterval);
                contentDiv.innerHTML = formatMessage(text);
                
                // Add actions
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-actions';
                actionsDiv.innerHTML = `
                    <button class="message-action-btn" onclick="copyMessage(this)" title="Copy">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    <button class="message-action-btn" onclick="speakMessage(this)" title="Speak">
                        <i class="fas fa-volume-up"></i> Speak
                    </button>
                `;
                wrapper.appendChild(actionsDiv);
                
                resolve(messageDiv);
            }
        }, CONFIG.TYPING_SPEED);
    });
}

// ===== Format Message =====
function formatMessage(text) {
    let formatted = escapeHtml(text);
    
    // Code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Links
    formatted = formatted.replace(
        /(https?:\/\/[^\s<]+)/g, 
        '<a href="$1" target="_blank" style="color: var(--accent-color);">$1</a>'
    );
    
    return formatted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Scroll =====
function scrollToBottom() {
    elements.chatContainer.scrollTo({
        top: elements.chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// ===== UI State =====
function updateUIState() {
    elements.sendBtn.disabled = state.isGenerating;
    elements.stopBtn.classList.toggle('hidden', !state.isGenerating);
    elements.attachBtn.disabled = state.isGenerating;
}

// ===== Stop Generation =====
function stopGeneration() {
    if (state.currentController) {
        state.currentController.abort();
    }
    if (state.typingInterval) {
        clearInterval(state.typingInterval);
    }
    state.isGenerating = false;
    updateUIState();
}

// ===== Voice Mode =====
function toggleVoiceMode() {
    state.isVoiceMode = !state.isVoiceMode;
    elements.voiceToggle.classList.toggle('active', state.isVoiceMode);
    
    if (state.isVoiceMode) {
        startVoiceRecognition();
    }
}

function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        showToast('Speech recognition not supported', 'error');
        state.isVoiceMode = false;
        elements.voiceToggle.classList.remove('active');
        return;
    }
    
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        elements.voiceOverlay.classList.remove('hidden');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        elements.userInput.value = transcript;
        elements.userInput.style.height = 'auto';
        elements.userInput.style.height = Math.min(elements.userInput.scrollHeight, 150) + 'px';
        elements.chatForm.dispatchEvent(new Event('submit'));
    };
    
    recognition.onerror = (event) => {
        console.error('Voice error:', event.error);
        elements.voiceOverlay.classList.add('hidden');
        showToast('Voice recognition error: ' + event.error, 'error');
    };
    
    recognition.onend = () => {
        elements.voiceOverlay.classList.add('hidden');
    };
    
    recognition.start();
}

// ===== Text-to-Speech =====
function speakText(text) {
    if (!window.speechSynthesis) {
        showToast('Text-to-speech not supported', 'warning');
        return;
    }
    
    window.speechSynthesis.cancel();
    
    const cleanText = text
        .replace(/```[\s\S]*?```/g, ' Code block omitted. ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/https?:\/\/[^\s]+/g, ' link ');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    utterance.volume = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
        v.name.includes('Google US English') || 
        v.name.includes('Samantha') ||
        v.name.includes('Daniel') ||
        v.name.includes('Microsoft David')
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
}

function speakMessage(btn) {
    const messageDiv = btn.closest('.message');
    const text = messageDiv.querySelector('.message-content').textContent;
    speakText(text);
}

// ===== File Handling =====
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
        showToast('File too large (max 20MB)', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target.result.split(',')[1];
        state.fileAttachment = {
            data: base64,
            mimeType: file.type,
            name: file.name
        };
        
        elements.filePreview.querySelector('.file-name').textContent = file.name;
        elements.filePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeFileAttachment() {
    state.fileAttachment = null;
    elements.filePreview.classList.add('hidden');
    elements.fileInput.value = '';
}

// ===== Theme =====
function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    localStorage.setItem(CONFIG.STORAGE_THEME, state.theme);
}

function applyTheme(theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
    const icon = elements.themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// ===== Sidebar =====
function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
}

// ===== Chat History =====
function saveToHistory(userMsg, botMsg) {
    state.chatHistory.push(
        { role: 'user', content: userMsg, timestamp: Date.now() },
        { role: 'bot', content: botMsg, timestamp: Date.now() }
    );
    
    if (state.chatHistory.length > CONFIG.MAX_HISTORY * 2) {
        state.chatHistory = state.chatHistory.slice(-CONFIG.MAX_HISTORY * 2);
    }
    
    localStorage.setItem(CONFIG.STORAGE_HISTORY, JSON.stringify(state.chatHistory));
    updateHistorySidebar();
}

function loadChatHistory() {
    const saved = localStorage.getItem(CONFIG.STORAGE_HISTORY);
    if (saved) {
        state.chatHistory = JSON.parse(saved);
        
        // Display last conversation
        if (state.chatHistory.length > 0) {
            elements.welcomeScreen.classList.add('hidden');
            elements.messagesArea.classList.remove('hidden');
            
            state.chatHistory.forEach(msg => {
                const isError = msg.content.startsWith('Error:');
                addMessage(msg.role, msg.content, isError);
            });
        }
        
        updateHistorySidebar();
    }
}

function updateHistorySidebar() {
    elements.historyList.innerHTML = '';
    
    if (state.chatHistory.length === 0) {
        elements.historyList.innerHTML = '<li class="empty-history">No conversations yet</li>';
        return;
    }
    
    // Get unique conversations (every 2 messages)
    const conversations = [];
    for (let i = 0; i < state.chatHistory.length; i += 2) {
        if (state.chatHistory[i]) {
            conversations.push({
                text: state.chatHistory[i].content,
                timestamp: state.chatHistory[i].timestamp,
                index: i
            });
        }
    }
    
    // Show last 10
    conversations.slice(-10).reverse().forEach(conv => {
        const li = document.createElement('li');
        li.textContent = conv.text.substring(0, 35) + (conv.text.length > 35 ? '...' : '');
        li.title = new Date(conv.timestamp).toLocaleString();
        li.addEventListener('click', () => loadChatSession(conv.index));
        elements.historyList.appendChild(li);
    });
}

function loadChatSession(startIndex) {
    elements.messagesArea.innerHTML = '';
    elements.welcomeScreen.classList.add('hidden');
    elements.messagesArea.classList.remove('hidden');
    
    for (let i = startIndex; i < startIndex + 20 && i < state.chatHistory.length; i++) {
        const msg = state.chatHistory[i];
        const isError = msg.content.startsWith('Error:');
        addMessage(msg.role, msg.content, isError);
    }
}

function startNewChat() {
    elements.messagesArea.innerHTML = '';
    elements.messagesArea.classList.add('hidden');
    elements.welcomeScreen.classList.remove('hidden');
    state.chatHistory = [];
    localStorage.removeItem(CONFIG.STORAGE_HISTORY);
    updateHistorySidebar();
    showToast('New chat started', 'info');
}

function clearAllHistory() {
    if (confirm('Clear all chat history? This cannot be undone.')) {
        startNewChat();
        showToast('History cleared', 'success');
    }
}

// ===== Export =====
function exportChat() {
    if (state.chatHistory.length === 0) {
        showToast('No chat to export', 'warning');
        return;
    }
    
    const chatText = state.chatHistory.map(msg => {
        const role = msg.role === 'user' ? 'YOU' : 'JARVIS';
        const time = new Date(msg.timestamp).toLocaleString();
        return `[${time}] ${role}:\n${msg.content}\n`;
    }).join('\n---\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Chat exported!', 'success');
}

// ===== Copy Message =====
function copyMessage(btn) {
    const messageDiv = btn.closest('.message');
    const text = messageDiv.querySelector('.message-content').textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        showToast('Message copied to clipboard', 'success');
        setTimeout(() => btn.innerHTML = original, 2000);
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// ===== Regenerate Response =====
function regenerateResponse(btn) {
    const messageDiv = btn.closest('.message');
    const prevMessage = messageDiv.previousElementSibling;
    
    if (prevMessage && prevMessage.classList.contains('user-message')) {
        const userText = prevMessage.querySelector('.message-content').textContent;
        messageDiv.remove();
        const loadingId = addLoadingMessage();
        generateResponse(userText, loadingId);
    }
}

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
        toast.remove();
    }, 3400);
}

// ===== Keyboard Shortcuts =====
function handleKeyboard(e) {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        elements.chatForm.dispatchEvent(new Event('submit'));
    }
    
    // Escape to stop generation
    if (e.key === 'Escape' && state.isGenerating) {
        stopGeneration();
    }
    
    // Ctrl/Cmd + Shift + N for new chat
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        startNewChat();
    }
    
    // Ctrl/Cmd + / to focus input
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        elements.userInput.focus();
    }
}

// ===== Expose functions to global scope =====
window.copyMessage = copyMessage;
window.speakMessage = speakMessage;
window.regenerateResponse = regenerateResponse;

