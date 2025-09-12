// Content script for Smart Search
let searchInterface = null;
let isProcessing = false;
let pdfTextContent = '';
let aiResults = null;

// Check if we're on a PDF page
function isPDFPage() {
  return document.location.pathname.toLowerCase().endsWith('.pdf') || 
         document.contentType === 'application/pdf' ||
         document.querySelector('embed[type="application/pdf"]') ||
         window.location.href.includes('.pdf');
}

// Extract text content from current page
function extractPageContent() {
  if (isPDFPage()) {
    // For PDFs, try to get text from text layers
    const textElements = document.querySelectorAll('div[role="textbox"], .textLayer div, .textLayer span');
    if (textElements.length > 0) {
      pdfTextContent = Array.from(textElements).map(el => el.textContent).join(' ');
      return;
    }
  }
  
  // For regular pages, get visible text
  const bodyText = document.body.innerText || document.body.textContent || '';
  pdfTextContent = bodyText;
}

// Find and scroll to text in page
function findAndScrollToText(searchTerm) {
  if (!searchTerm) return false;
  
  const firstWord = searchTerm.split(' ')[0].toLowerCase();
  
  if (isPDFPage()) {
    // For PDFs, try to find in text elements
    const textElements = document.querySelectorAll('div[role="textbox"], .textLayer div, .textLayer span');
    for (let element of textElements) {
      if (element.textContent.toLowerCase().includes(firstWord)) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the found text
        highlightText(element, firstWord);
        return true;
      }
    }
  } else {
    // For regular pages, use browser's find functionality
    if (window.find && window.find(firstWord)) {
      return true;
    }
    
    // Fallback: manual search and scroll
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.toLowerCase().includes(firstWord)) {
        const element = node.parentElement;
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightText(element, firstWord);
        return true;
      }
    }
  }
  
  return false;
}

// Highlight found text
function highlightText(element, searchTerm) {
  const originalText = element.textContent;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const highlightedText = originalText.replace(regex, '<mark style="background-color: yellow; padding: 2px;">$1</mark>');
  
  if (element.innerHTML !== originalText) return; // Avoid double highlighting
  element.innerHTML = highlightedText;
  
  // Remove highlight after 3 seconds
  setTimeout(() => {
    element.innerHTML = originalText;
  }, 3000);
}

// Create the search interface
function createSearchInterface() {
  if (searchInterface) return;

  // Create search bar (like browser address bar)
  searchInterface = document.createElement('div');
  searchInterface.id = 'genuine-search-bar';
  searchInterface.style.display = 'none';
  searchInterface.innerHTML = `
      <div id="search-field">
        <input type="text" id="search-input" placeholder="Search PDF" autocomplete="off" spellcheck="false">
        <button id="close-search" aria-label="Close">×</button>
      </div>
    <div id="quick-answer" class="hidden"></div>
  `;

  document.body.appendChild(searchInterface);

  // Add event listeners
  const searchInput = document.getElementById('search-input');
  const closeBtn = document.getElementById('close-search');

  searchInput.addEventListener('input', handleSearchInput);
  searchInput.addEventListener('keydown', handleSearchKeydown);
  closeBtn.addEventListener('click', hideSearchInterface);

  // Load CSS
  loadSearchCSS();
}

// Create floating search button
function createFloatingSearchButton() {
  console.log('🔵 Creating floating search button...');
  
  // Check if button already exists
  if (document.getElementById('floating-search-btn')) {
    console.log('❌ Button already exists, skipping creation');
    return;
  }

  const floatingBtn = document.createElement('div');
  floatingBtn.id = 'floating-search-btn';
  floatingBtn.title = 'Search PDF';

  floatingBtn.addEventListener('click', () => {
    console.log('🔵 Floating button clicked!');
    showSearchInterface();
  });

  document.body.appendChild(floatingBtn);
  console.log('✅ Floating search button added to page');
  
  // Add inline styles as fallback
  floatingBtn.style.cssText = `
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    width: 56px !important;
    height: 56px !important;
    background: #007acc !important;
    border-radius: 50% !important;
    cursor: pointer !important;
    z-index: 999998 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 4px 20px rgba(0, 122, 204, 0.3) !important;
    transition: all 0.3s ease !important;
  `;
}

// Handle search input changes
function handleSearchInput(e) {
  const query = e.target.value.trim();
  
  if (query.length === 0) {
    hideQuickAnswer();
    return;
  }

  // Try to find in page content first
  const found = findAndScrollToText(query);
  
  // Perform AI search in background (debounced)
  clearTimeout(window.searchTimeout);
  window.searchTimeout = setTimeout(() => {
    performAISearch(query);
  }, 800);
}

// Handle search keydown events
function handleSearchKeydown(e) {
  if (e.key === 'Escape') {
    hideSearchInterface();
  } else if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (query) {
      // Try page search first, then focus on AI results
      const found = findAndScrollToText(query);
      if (!found) {
        performAISearch(query);
      }
    }
  }
}

// Show search interface
function showSearchInterface() {
  console.log('🔍 showSearchInterface called');
  
  if (!searchInterface) {
    console.log('🔧 Creating search interface...');
    createSearchInterface();
  }
  
  console.log('👁️ Making search interface visible');
  searchInterface.style.display = 'block';
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.focus();
    console.log('✅ Search input focused');
  } else {
    console.log('❌ Search input not found');
  }
  
  // Extract page content for searching
  extractPageContent();
}

// Hide search interface
function hideSearchInterface() {
  if (searchInterface) {
    searchInterface.style.display = 'none';
    document.getElementById('search-input').value = '';
    hideQuickAnswer();
  }
}

// Show quick answer
function showQuickAnswer(text) {
  console.log('showQuickAnswer called with:', text);
  const answerDiv = document.getElementById('quick-answer');
  if (answerDiv) {
    answerDiv.textContent = text;
    answerDiv.classList.remove('hidden');
    console.log('Quick answer displayed successfully');
  } else {
    console.error('quick-answer element not found');
  }
}

// Hide quick answer
function hideQuickAnswer() {
  const answerDiv = document.getElementById('quick-answer');
  answerDiv.classList.add('hidden');
}

// Perform AI search in background
async function performAISearch(query) {
  if (isProcessing) return;
  
  isProcessing = true;
  
  try {
    const response = await queryLMStudio(query);
    displayAIResults(response);
  } catch (error) {
    console.error('AI search error:', error);
    // Silently fail - don't show errors in the search interface
  } finally {
    isProcessing = false;
  }
}

// Display AI results in search interface
function displayAIResults(response) {
  console.log('Raw AI response:', response);
  
  let cleanResponse = response;
  
  // Minimal cleanup - only remove excessive whitespace while preserving the full response
  cleanResponse = cleanResponse
    .replace(/\s+/g, ' ')                                      // Clean excessive whitespace
    .trim();
  
  // Fallback if empty
  if (!cleanResponse || cleanResponse.length < 1) {
    cleanResponse = 'No response available';
  }
  
  console.log('Final biology answer:', cleanResponse);
  showQuickAnswer(cleanResponse);
}

// Query AI API
async function queryLMStudio(query) {
  try {
    // Get saved API URL and model from storage, with fallbacks
    const settings = await new Promise(resolve => {
      chrome.storage.sync.get(['apiUrl', 'selectedModel'], (result) => {
        resolve({
          apiUrl: result.apiUrl || 'http://localhost:1234',
          selectedModel: result.selectedModel || 'openai/gpt-oss-20b'
        });
      });
    });

    const payload = {
      model: settings.selectedModel,
      messages: [
        {
          role: "assistant",
          content: "You have to answer biology question. Be precise answer in less number of words if possible answer in one word if asked if asked like subjective then aswer in about 20 words. Options are given then choose correct option."
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.2,
      stream: false
    };

    console.log('Sending API request:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${settings.apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const message = data.choices[0].message;
      
      // Show content field as response
      let responseText = '';
      
      if (message.content && message.content.trim()) {
        responseText = message.content.trim();
        console.log('Content field response:', responseText);
      } else if (message.reasoning && message.reasoning.trim()) {
        // Fallback: extract from reasoning if content is empty
        const reasoning = message.reasoning.trim();
        const colonMatch = reasoning.match(/:\s*(.+)$/);
        if (colonMatch) {
          responseText = colonMatch[1].trim();
        } else {
          responseText = reasoning;
        }
        console.log('Extracted from reasoning field:', responseText);
      } else {
        responseText = 'No response available';
        console.log('No valid response found');
      }
      
      console.log('Final response to display:', responseText);
      return responseText;
    } else {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Load CSS styles for search interface
function loadSearchCSS() {
  if (document.getElementById('smart-search-styles')) return;

  const style = document.createElement('style');
  style.id = 'smart-search-styles';
  style.textContent = `
    /* Floating Search Button */
    #floating-search-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 999998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      user-select: none;
      opacity: 0.4;
    }

    #floating-search-btn:hover {
      background: rgba(0, 122, 204, 0.6);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(2, 5, 7, 0.2);
      opacity: 0.9;
    }

    #floating-search-btn svg {
      width: 6px;
      height: 6px;
      opacity: 0.9;
    }

    /* Google Chrome Find Bar */
    #genuine-search-bar {
      position: fixed;
      top: 0;
      right: 0;
      width: 280px;
      z-index: 999999;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      font-size: 12px;
    }

    #search-wrapper {
      background: #f9f9fa;
      border: 1px solid #dadce0;
      border-top: none;
      border-radius: 8px;
      box-shadow: none;
      animation: searchBarSlideDown 0.15s ease-out;
    }

    @keyframes searchBarSlideDown {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }


    #search-icon {
      margin-right: 6px;
      flex-shrink: 0;
      opacity: 0.7;
      width: 12px;
      height: 12px;
    }

    #search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 12px;
      color: #3c4043;
      background: white;
      font-family: inherit;
      line-height: 14px;
    }

    #search-input::placeholder {
      color: #80868b;
    }

    #close-search {
      background: none;
      border: none;
      font-size: 12px;
      color: #5f6368;
      cursor: pointer;
      padding: 1px 3px;
      margin-left: 6px;
      border-radius: 1px;
      transition: background-color 0.1s;
      line-height: 1;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #close-search:hover {
      background: #e8eaed;
      color: #202124;
    }

    /* Quick Answer positioned at bottom left */
    #quick-answer {
      position: fixed !important;
      bottom: 20px !important;
      left: 20px !important;
      background: transparent !important;
      color: #000 !important;
      padding: 12px 16px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      max-width: 400px !important;
      max-height: 300px !important;
      overflow-y: auto !important;
      z-index: 999997 !important;
      box-shadow: none !important;
      border: none !important;
      animation: answerSlideIn 0.3s ease-out !important;
      line-height: 1.4 !important;
      word-wrap: break-word !important;
      white-space: pre-wrap !important;
      text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8) !important;
    }

    @keyframes answerSlideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    #quick-answer.hidden {
      display: none !important;
    }

    /* Hide floating button when search is open */
    #genuine-search-bar:not([style*="display: none"]) ~ #floating-search-btn {
      opacity: 0;
      pointer-events: none;
    }

    /* Ensure quick answer stays at bottom left */
    #quick-answer {
      position: fixed !important;
      bottom: 20px !important;
      left: 20px !important;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      #genuine-search-bar {
        width: 240px;
      }
      
      
      #search-input {
        font-size: 12px;
      }

      #floating-search-btn {
        bottom: 15px;
        right: 15px;
        width: 28px;
        height: 28px;
      }

      #floating-search-btn svg {
        width: 14px;
        height: 14px;
      }

      #quick-answer {
        bottom: 15px !important;
        left: 15px !important;
        font-size: 13px !important;
        max-width: 300px !important;
        max-height: 200px !important;
        padding: 8px 12px !important;
      }
    }

    /* Very mobile friendly */
    @media (max-width: 480px) {
      #genuine-search-bar {
        width: 180px;
      }
      
      #search-wrapper {
      background:white;
        border-bottom-left-radius: 2px;
      }
    }

    /* Hide floating button on very small screens */
    @media (max-height: 500px) {
      #floating-search-btn {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
}

// Keyboard shortcut handler
function handleKeyboardShortcuts(e) {
  console.log('Key pressed:', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
  
  // Ctrl+F or Cmd+F to open search (like genuine browser search)
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    console.log('Ctrl+F detected, opening search interface');
    e.preventDefault();
    e.stopPropagation();
    showSearchInterface();
    return false;
  }
  
  // Ctrl+L or Cmd+L to open search (address bar style)
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    console.log('Ctrl+L detected, opening search interface');
    e.preventDefault();
    showSearchInterface();
  }
  
  // Alternative shortcut: Ctrl+Shift+F (less likely to conflict)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
    console.log('Ctrl+Shift+F detected, opening search interface');
    e.preventDefault();
    showSearchInterface();
  }
  
  // Escape to close search
  if (e.key === 'Escape' && searchInterface && searchInterface.style.display !== 'none') {
    hideSearchInterface();
  }
}

// Initialize when page loads
function initialize() {
  console.log('🔍 Smart Search extension initializing...');
  
  // Add keyboard shortcut listeners with high priority
  document.addEventListener('keydown', handleKeyboardShortcuts, true);
  window.addEventListener('keydown', handleKeyboardShortcuts, true);
  console.log('⌨️ Keyboard event listeners added');
  
  // Create the floating search button
  setTimeout(() => {
    createFloatingSearchButton();
    console.log('🔵 Floating search button created');
  }, 500);
  
  // Extract page content on load
  setTimeout(() => {
    extractPageContent();
    console.log('📄 Page content extracted');
  }, 1000);
}

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Listen for navigation changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Re-extract content on page change
    setTimeout(() => {
      extractPageContent();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });