// Content script for Smart Search
let searchInterface = null;
let isProcessing = false;
let pdfTextContent = '';
let aiResults = null;
let searchHistory = []; // Will store objects with {query, response, timestamp}
let currentHistoryIndex = -1;

// Check if extension context is valid
function isExtensionContextValid() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

// Safe chrome storage wrapper
function safeChromeStorage() {
  return isExtensionContextValid() && chrome.storage;
}

// Check if we're on a PDF page
function isPDFPage() {
  // Check URL pattern
  const urlHasPdf = document.location.pathname.toLowerCase().endsWith('.pdf') || 
                    window.location.href.includes('.pdf');
  
  // Check document content type
  const contentTypePdf = document.contentType === 'application/pdf';
  
  // Check for PDF viewer elements (Chrome's built-in PDF viewer)
  const hasEmbedPdf = document.querySelector('embed[type="application/pdf"]');
  const hasPdfViewer = document.querySelector('#viewer') && document.querySelector('.page');
  const hasPdfPlugin = document.querySelector('object[type="application/pdf"]');
  
  // Check for PDF.js viewer elements
  const hasPdfJs = document.querySelector('#viewerContainer') || 
                   document.querySelector('.pdfViewer') ||
                   document.querySelector('[data-pdf-viewer]');
  
  // Check for Chrome PDF viewer
  const isChromePdfViewer = window.location.protocol === 'chrome-extension:' && 
                           window.location.href.includes('mhjfbmdgcfjbbpaeojofohoefgiehjai');
  
  console.log('PDF Detection:', {
    urlHasPdf,
    contentTypePdf,
    hasEmbedPdf: !!hasEmbedPdf,
    hasPdfViewer: !!hasPdfViewer,
    hasPdfPlugin: !!hasPdfPlugin,
    hasPdfJs: !!hasPdfJs,
    isChromePdfViewer
  });
  
  return urlHasPdf || contentTypePdf || hasEmbedPdf || hasPdfViewer || hasPdfPlugin || hasPdfJs || isChromePdfViewer;
}

// Extract text content from current page
function extractPageContent() {
  if (isPDFPage()) {
    console.log('Extracting PDF content...');
    
    // Try multiple selectors for different PDF viewers
    let textElements = [];
    
    // Chrome's built-in PDF viewer text layers
    textElements = document.querySelectorAll('.textLayer div, .textLayer span');
    console.log('Chrome PDF textLayer elements found:', textElements.length);
    
    // If no text layer elements, try other selectors
    if (textElements.length === 0) {
      // PDF.js viewer
      textElements = document.querySelectorAll('.textLayer div, .textLayer span, [data-pdf-text]');
      console.log('PDF.js elements found:', textElements.length);
    }
    
    // Generic text content selectors
    if (textElements.length === 0) {
      textElements = document.querySelectorAll('div[role="textbox"], div[contenteditable], .pdfText, .pdf-text');
      console.log('Generic PDF text elements found:', textElements.length);
    }
    
    // Try to get text from page divs (Chrome PDF viewer pages)
    if (textElements.length === 0) {
      textElements = document.querySelectorAll('.page div, #viewer div');
      console.log('Page div elements found:', textElements.length);
    }
    
    // Extract text content
    if (textElements.length > 0) {
      pdfTextContent = Array.from(textElements)
        .filter(el => el.textContent && el.textContent.trim().length > 0)
        .map(el => el.textContent.trim())
        .join(' ');
      console.log('PDF text extracted, length:', pdfTextContent.length);
      console.log('PDF text preview:', pdfTextContent.substring(0, 200) + '...');
    } else {
      // Fallback: try to get all text from body
      pdfTextContent = document.body.innerText || document.body.textContent || '';
      console.log('PDF fallback text extraction, length:', pdfTextContent.length);
    }
    
    return;
  }
  
  // For regular pages, get visible text
  const bodyText = document.body.innerText || document.body.textContent || '';
  pdfTextContent = bodyText;
  console.log('Regular page text extracted, length:', pdfTextContent.length);
}

// Find and scroll to text in page
function findAndScrollToText(searchTerm) {
  if (!searchTerm) return false;
  
  const firstWord = searchTerm.split(' ')[0].toLowerCase();
  console.log('Searching for word:', firstWord);
  
  if (isPDFPage()) {
    console.log('Searching in PDF...');
    
    // For PDFs, try multiple approaches to find text
    let textElements = [];
    let found = false;
    
    // Try Chrome PDF viewer text layers first
    textElements = document.querySelectorAll('.textLayer div, .textLayer span');
    console.log('Searching in textLayer elements:', textElements.length);
    
    for (let element of textElements) {
      if (element.textContent && element.textContent.toLowerCase().includes(firstWord)) {
        console.log('Found in textLayer element:', element.textContent.substring(0, 100));
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightText(element, firstWord);
        found = true;
        break; // Stop after finding first match
      }
    }
    
    // Try PDF.js elements if not found
    if (!found) {
      textElements = document.querySelectorAll('.pdfViewer div, [data-pdf-text]');
      console.log('Searching in PDF.js elements:', textElements.length);
      
      for (let element of textElements) {
        if (element.textContent && element.textContent.toLowerCase().includes(firstWord)) {
          console.log('Found in PDF.js element:', element.textContent.substring(0, 100));
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightText(element, firstWord);
          found = true;
          break;
        }
      }
    }
    
    // Try generic PDF text elements if not found
    if (!found) {
      textElements = document.querySelectorAll('div[role="textbox"], .pdf-text, .pdfText');
      console.log('Searching in generic PDF elements:', textElements.length);
      
      for (let element of textElements) {
        if (element.textContent && element.textContent.toLowerCase().includes(firstWord)) {
          console.log('Found in generic PDF element:', element.textContent.substring(0, 100));
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightText(element, firstWord);
          found = true;
          break;
        }
      }
    }
    
    // Try all divs in pages (Chrome PDF viewer) if not found
    if (!found) {
      textElements = document.querySelectorAll('.page div, #viewer div');
      console.log('Searching in page div elements:', textElements.length);
      
      for (let element of textElements) {
        if (element.textContent && element.textContent.toLowerCase().includes(firstWord)) {
          console.log('Found in page div element:', element.textContent.substring(0, 100));
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightText(element, firstWord);
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      console.log('Word not found in PDF text elements');
    }
    
    return found;
    
  } else {
    console.log('Searching in regular page...');
    
    // For regular pages, use browser's find functionality
    if (window.find && window.find(firstWord)) {
      console.log('Found using window.find');
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
        console.log('Found using tree walker');
        return true;
      }
    }
  }
  
  console.log('Word not found:', firstWord);
  return false;
}

// Highlight found text
function highlightText(element, searchTerm) {
  if (!element || !searchTerm) return;
  
  const originalText = element.textContent;
  const originalHTML = element.innerHTML;
  
  // Avoid highlighting if element already contains highlight markup
  if (originalHTML.includes('<mark')) return;
  
  try {
    // For PDF text elements, we need to be more careful with highlighting
    const isPdfElement = element.closest('.textLayer') || 
                        element.closest('.pdfViewer') || 
                        element.closest('.page') ||
                        element.hasAttribute('data-pdf-text');
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const highlightedText = originalText.replace(regex, '<mark style="background-color: yellow; padding: 2px; color: black; border-radius: 2px;">$1</mark>');
    
    // Only apply if highlighting actually occurred
    if (highlightedText !== originalText) {
      if (isPdfElement) {
        // For PDF elements, add additional styling to ensure visibility
        element.innerHTML = highlightedText;
        element.style.position = 'relative';
        element.style.zIndex = '1000';
        console.log('PDF text highlighted:', searchTerm);
        
        // If highlighting doesn't seem to work, try overlay method
        setTimeout(() => {
          if (!element.querySelector('mark')) {
            console.log('Standard highlighting failed, trying overlay method');
            createHighlightOverlay(element, searchTerm);
          }
        }, 100);
        
      } else {
        element.innerHTML = highlightedText;
        console.log('Regular text highlighted:', searchTerm);
      }
      
      // Remove highlight after 8 seconds (longer for PDFs)
      setTimeout(() => {
        try {
          if (element && element.innerHTML.includes('<mark')) {
            element.innerHTML = originalHTML;
            if (isPdfElement) {
              element.style.position = '';
              element.style.zIndex = '';
            }
          }
          // Also remove any overlay highlights
          removeHighlightOverlay(element);
        } catch (e) {
          console.log('Error removing highlight:', e);
        }
      }, 8000);
    }
  } catch (error) {
    console.log('Error highlighting text:', error);
    // Fallback to overlay method for PDFs
    if (isPDFPage()) {
      createHighlightOverlay(element, searchTerm);
    }
  }
}

// Create overlay highlight for stubborn PDF elements
function createHighlightOverlay(element, searchTerm) {
  if (!element || !searchTerm) return;
  
  try {
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.className = 'pdf-highlight-overlay';
    overlay.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: rgba(255, 255, 0, 0.3);
      border: 2px solid yellow;
      border-radius: 3px;
      pointer-events: none;
      z-index: 999999;
      animation: pulse 1s ease-in-out 3;
    `;
    
    document.body.appendChild(overlay);
    console.log('Created overlay highlight for PDF element');
    
    // Remove after 8 seconds
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 8000);
    
  } catch (error) {
    console.log('Error creating overlay highlight:', error);
  }
}

// Remove overlay highlights
function removeHighlightOverlay(element) {
  try {
    const overlays = document.querySelectorAll('.pdf-highlight-overlay');
    overlays.forEach(overlay => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
  } catch (error) {
    console.log('Error removing overlay highlights:', error);
  }
}

// Create the search interface
function createSearchInterface() {
  console.log('Creating search interface...');
  
  if (searchInterface) {
    console.log('Search interface already exists');
    return;
  }

  try {
    // Create search bar (like browser address bar)
    searchInterface = document.createElement('div');
    searchInterface.id = 'genuine-search-bar';
    searchInterface.style.display = 'none';
    searchInterface.innerHTML = `
        <div id="search-field">
          <input type="text" id="search-input" placeholder="Search PDF" autocomplete="off" spellcheck="false">
          <button id="history-up" aria-label="Previous search" title="Previous search">↑</button>
          <button id="history-down" aria-label="Next search" title="Next search">↓</button>
          <button id="close-search" aria-label="Close" title="Close search">✕</button>
        </div>
      <div id="quick-answer" class="hidden"></div>
    `;

    document.body.appendChild(searchInterface);
    console.log('✅ Search interface added to DOM');

    // Add event listeners
    const searchInput = document.getElementById('search-input');
    const closeBtn = document.getElementById('close-search');
    const historyUpBtn = document.getElementById('history-up');
    const historyDownBtn = document.getElementById('history-down');

    if (searchInput) {
      searchInput.addEventListener('input', handleSearchInput);
      searchInput.addEventListener('keydown', handleSearchKeydown);
      console.log('✅ Search input event listeners added');
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', hideSearchInterface);
      console.log('✅ Close button event listener added');
    }
    
    if (historyUpBtn) {
      historyUpBtn.addEventListener('click', navigateHistoryUp);
      console.log('✅ History up button event listener added');
    }
    
    if (historyDownBtn) {
      historyDownBtn.addEventListener('click', navigateHistoryDown);
      console.log('✅ History down button event listener added');
    }

    // Load CSS
    loadSearchCSS();
    console.log('✅ CSS loaded');
    
  } catch (error) {
    console.error('Error creating search interface:', error);
  }
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

  floatingBtn.addEventListener('click', (e) => {
    console.log('🔵 Floating button clicked!', e);
    e.preventDefault();
    e.stopPropagation();
    showSearchInterface();
  });

  // Add a search icon to make it visible
  floatingBtn.innerHTML = '🔍';
  floatingBtn.style.cssText = `
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    width: 50px !important;
    height: 50px !important;
    background: transparent;
    border-radius: 50% !important;
    cursor: pointer !important;
    z-index: 999998 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;;
    transition: all 0.3s ease !important;
    font-size: 20px !important;
    color: white !important;
  `;

  document.body.appendChild(floatingBtn);
  console.log('✅ Floating search button added to page');
  console.log('✅ Floating search button added to page');
  
  // Add inline styles as fallback
  floatingBtn.style.cssText = `
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    width: 56px !important;
    height: 56px !important;
    background: transparent;
    border-radius: 50% !important;
    cursor: pointer !important;
    z-index: 999998 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.3s ease !important;
  `;
}

// Handle search input changes
function handleSearchInput(e) {
  const query = e.target.value.trim();
  
  // Don't trigger search if we're navigating history
  if (e.target.dataset.navigatingHistory === 'true') {
    return;
  }
  
  // Reset history index when user types
  currentHistoryIndex = -1;
  updateHistoryButtons();
  
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
      // If we're currently viewing a history item, still add it fresh to history
      // Reset history index to indicate fresh search
      currentHistoryIndex = -1;
      
      // Add to history (without response initially)
      addToSearchHistory(query);
      
      // Try page search first, then focus on AI results
      const found = findAndScrollToText(query);
      // Always perform AI search on Enter, even if found in page
      performAISearch(query);
    }
  } else if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    navigateHistoryUp();
  } else if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    navigateHistoryDown();
  }
}

// Add query to search history
function addToSearchHistory(query, response = null) {
  if (!query || query.trim() === '') return;
  
  const historyItem = {
    query: query.trim(),
    response: response,
    timestamp: Date.now()
  };
  
  // Remove if already exists to avoid duplicates (check by query)
  const existingIndex = searchHistory.findIndex(item => item.query === query);
  if (existingIndex > -1) {
    searchHistory.splice(existingIndex, 1);
  }
  
  // Add to beginning of history
  searchHistory.unshift(historyItem);
  
  // Limit history to 50 items
  if (searchHistory.length > 50) {
    searchHistory = searchHistory.slice(0, 50);
  }
  
  // Reset history index
  currentHistoryIndex = -1;
  
  // Save to storage for persistence
  try {
    const chromeStorage = safeChromeStorage();
    if (chromeStorage && chromeStorage.local) {
      chromeStorage.local.set({ searchHistory: searchHistory });
    } else {
      console.log('Chrome storage API not available, using localStorage fallback');
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    }
  } catch (error) {
    console.log('Error saving search history:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    } catch (localError) {
      console.log('localStorage fallback also failed:', localError);
    }
  }
}

// Update search history with response
function updateSearchHistoryWithResponse(query, response) {
  if (!query || !response) return;
  
  // Find the most recent entry with this query and update its response
  const recentItem = searchHistory.find(item => item.query === query && !item.response);
  if (recentItem) {
    recentItem.response = response;
    
    // Save updated history to storage
    try {
      const chromeStorage = safeChromeStorage();
      if (chromeStorage && chromeStorage.local) {
        chromeStorage.local.set({ searchHistory: searchHistory });
      } else {
        console.log('Chrome storage API not available, using localStorage fallback');
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
      }
    } catch (error) {
      console.log('Error updating search history:', error);
      // Fallback to localStorage
      try {
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
      } catch (localError) {
        console.log('localStorage fallback also failed:', localError);
      }
    }
  }
}

// Navigate to previous search in history
function navigateHistoryUp() {
  if (searchHistory.length === 0) return;
  
  currentHistoryIndex = Math.min(currentHistoryIndex + 1, searchHistory.length - 1);
  const searchInput = document.getElementById('search-input');
  const historyItem = searchHistory[currentHistoryIndex];
  
  if (searchInput && historyItem) {
    // Set flag to prevent input handler from triggering search
    searchInput.dataset.navigatingHistory = 'true';
    searchInput.value = historyItem.query;
    
    // Show the previous response if it exists
    if (historyItem.response) {
      showQuickAnswer(historyItem.response);
    } else {
      hideQuickAnswer();
    }
    
    updateHistoryButtons();
    
    // Clear the flag after a short delay
    setTimeout(() => {
      delete searchInput.dataset.navigatingHistory;
    }, 100);
  }
}

// Navigate to next search in history
function navigateHistoryDown() {
  if (searchHistory.length === 0) return;
  
  const searchInput = document.getElementById('search-input');
  
  if (currentHistoryIndex <= 0) {
    currentHistoryIndex = -1;
    if (searchInput) {
      searchInput.dataset.navigatingHistory = 'true';
      searchInput.value = '';
      hideQuickAnswer();
      
      setTimeout(() => {
        delete searchInput.dataset.navigatingHistory;
      }, 100);
    }
  } else {
    currentHistoryIndex = Math.max(currentHistoryIndex - 1, 0);
    const historyItem = searchHistory[currentHistoryIndex];
    
    if (searchInput && historyItem) {
      searchInput.dataset.navigatingHistory = 'true';
      searchInput.value = historyItem.query;
      
      // Show the previous response if it exists
      if (historyItem.response) {
        showQuickAnswer(historyItem.response);
      } else {
        hideQuickAnswer();
      }
      
      setTimeout(() => {
        delete searchInput.dataset.navigatingHistory;
      }, 100);
    }
  }
  updateHistoryButtons();
}

// Update history button states
function updateHistoryButtons() {
  const upBtn = document.getElementById('history-up');
  const downBtn = document.getElementById('history-down');
  
  if (upBtn && downBtn) {
    upBtn.disabled = searchHistory.length === 0 || currentHistoryIndex >= searchHistory.length - 1;
    downBtn.disabled = searchHistory.length === 0 || currentHistoryIndex <= -1;
    
    // Update button opacity based on state
    upBtn.style.opacity = upBtn.disabled ? '0.3' : '0.7';
    downBtn.style.opacity = downBtn.disabled ? '0.3' : '0.7';
  }
}

// Clear search input
function clearSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
    hideQuickAnswer();
    currentHistoryIndex = -1;
    updateHistoryButtons();
  }
}

// Load search history from storage
function loadSearchHistory() {
  try {
    const chromeStorage = safeChromeStorage();
    if (chromeStorage && chromeStorage.local) {
      chromeStorage.local.get(['searchHistory'], (result) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.log('Error loading search history:', chrome.runtime.lastError);
          loadFromLocalStorage();
          return;
        }
        if (result.searchHistory && Array.isArray(result.searchHistory)) {
          processSearchHistory(result.searchHistory);
        } else {
          loadFromLocalStorage();
        }
      });
    } else {
      loadFromLocalStorage();
    }
  } catch (error) {
    console.log('Error accessing chrome storage:', error);
    loadFromLocalStorage();
  }
}

// Fallback to localStorage
function loadFromLocalStorage() {
  try {
    const stored = localStorage.getItem('searchHistory');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        processSearchHistory(parsed);
      }
    }
  } catch (error) {
    console.log('Error loading from localStorage:', error);
  }
}

// Process loaded search history
function processSearchHistory(historyData) {
  // Handle both old format (strings) and new format (objects)
  searchHistory = historyData.map(item => {
    if (typeof item === 'string') {
      // Convert old format to new format
      return {
        query: item,
        response: null,
        timestamp: Date.now()
      };
    }
    return item; // Already in new format
  });
  updateHistoryButtons();
}

// Show search interface
function showSearchInterface() {
  console.log('🔍 showSearchInterface called');
  
  try {
    if (!searchInterface) {
      console.log('🔧 Creating search interface...');
      createSearchInterface();
    }
    
    if (!searchInterface) {
      console.error('❌ Failed to create search interface');
      return;
    }
    
    // Load search history
    loadSearchHistory();
    
    console.log('👁️ Making search interface visible');
    searchInterface.style.display = 'block';
    console.log('Current display style:', searchInterface.style.display);
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
      console.log('✅ Search input focused');
    } else {
      console.log('❌ Search input not found');
    }
    
    // Update history button states
    updateHistoryButtons();
    
    // Extract page content for searching
    extractPageContent();
  } catch (error) {
    console.error('Error in showSearchInterface:', error);
  }
}

// Hide search interface
function hideSearchInterface() {
  if (searchInterface) {
    searchInterface.style.display = 'none';
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    hideQuickAnswer();
    currentHistoryIndex = -1;
    updateHistoryButtons();
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
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      console.log('Extension context invalidated, skipping AI search');
      isProcessing = false;
      return;
    }
    
    const response = await queryLMStudio(query);
    displayAIResults(response);
    
    // Update search history with the response
    updateSearchHistoryWithResponse(query, response);
  } catch (error) {
    console.error('AI search error:', error);
    // Show a user-friendly fallback message
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.log('Extension was reloaded, search functionality temporarily unavailable');
    }
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
      try {
        const chromeStorage = safeChromeStorage();
        if (chromeStorage && chromeStorage.sync) {
          chromeStorage.sync.get(['apiUrl', 'selectedModel'], (result) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              console.log('Chrome storage error, using defaults:', chrome.runtime.lastError);
              resolve({
                apiUrl: 'http://localhost:1234',
                selectedModel: 'openai/gpt-oss-20b'
              });
              return;
            }
            resolve({
              apiUrl: result.apiUrl || 'http://localhost:1234',
              selectedModel: result.selectedModel || 'openai/gpt-oss-20b'
            });
          });
        } else {
          console.log('Chrome storage API not available, using defaults');
          resolve({
            apiUrl: 'http://localhost:1234',
            selectedModel: 'openai/gpt-oss-20b'
          });
        }
      } catch (error) {
        console.log('Error accessing chrome storage, using defaults:', error);
        resolve({
          apiUrl: 'http://localhost:1234',
          selectedModel: 'openai/gpt-oss-20b'
        });
      }
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
      background: transparent;
      border: transparent;
      border-top: none;
      border-radius: 8px;
      box-shadow: none;
      animation: searchBarSlideDown 0.15s ease-out;
    }

    @keyframes searchBarSlideDown {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    #search-field {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      background: white;
      border: 1px solid #dadce0;
      border-radius: 4px;
      gap: 4px;
    }


    #search-field {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      background: white;
      border: 1px solid #dadce0;
      border-radius: 4px;
      gap: 4px;
    }

    #search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 12px;
      color: #3c4043;
      background: transparent;
      font-family: inherit;
      line-height: 14px;
    }

    #search-input::placeholder {
      color: #80868b;
    }

    #history-up, #history-down, #close-search {
      background: none;
      border: none;
      font-size: 11px;
      color: #5f6368;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 2px;
      transition: all 0.1s;
      line-height: 1;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    #history-up:hover, #history-down:hover, #close-search:hover {
      background: #e8eaed;
      color: #202124;
    }

    #history-up:disabled, #history-down:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }

    #history-up:disabled:hover, #history-down:disabled:hover {
      background: none;
      color: #5f6368;
    }

    #close-search {
      font-size: 14px;
      font-weight: bold;
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

    @keyframes pulse {
      0% { opacity: 0.3; }
      50% { opacity: 0.7; }
      100% { opacity: 0.3; }
    }

    .pdf-highlight-overlay {
      animation: pulse 1s ease-in-out 3 !important;
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
        width: 260px;
      }
      
      #search-field {
        gap: 2px;
        padding: 4px 6px;
      }
      
      #search-input {
        font-size: 12px;
      }

      #history-up, #history-down, #close-search {
        width: 14px;
        height: 14px;
        font-size: 10px;
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
        width: 200px;
      }
      
      #search-field {
        gap: 1px;
        padding: 3px 4px;
      }

      #history-up, #history-down, #close-search {
        width: 12px;
        height: 12px;
        font-size: 9px;
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

// Debug function to check PDF structure
function debugPdfStructure() {
  console.log('=== PDF DEBUG INFO ===');
  console.log('URL:', window.location.href);
  console.log('Content Type:', document.contentType);
  console.log('Is PDF Page:', isPDFPage());
  console.log('Extension Context Valid:', isExtensionContextValid());
  
  // Check various selectors
  const selectors = [
    '.textLayer div',
    '.textLayer span', 
    'div[role="textbox"]',
    '.pdfViewer div',
    '.page div',
    '#viewer div',
    '[data-pdf-text]',
    'embed[type="application/pdf"]',
    'object[type="application/pdf"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`${selector}: ${elements.length} elements`);
    if (elements.length > 0 && elements.length < 10) {
      elements.forEach((el, i) => {
        console.log(`  ${i}: "${el.textContent?.substring(0, 50)}..."`);
        // Check if element can be highlighted
        const rect = el.getBoundingClientRect();
        console.log(`    Rect: ${rect.width}x${rect.height} at (${rect.left}, ${rect.top})`);
      });
    }
  });
  
  console.log('PDF Text Content Length:', pdfTextContent.length);
  console.log('PDF Text Preview:', pdfTextContent.substring(0, 200));
  
  // Test highlighting functionality
  const testElements = document.querySelectorAll('.textLayer div, .textLayer span');
  if (testElements.length > 0) {
    console.log('Testing highlight on first text element...');
    const testElement = testElements[0];
    console.log('Test element text:', testElement.textContent);
    console.log('Test element can be modified:', testElement.innerHTML !== undefined);
  }
  
  console.log('=== END DEBUG INFO ===');
}

// Test highlighting function (for debugging)
function testHighlight(word = 'the') {
  console.log('Testing highlight for word:', word);
  const found = findAndScrollToText(word);
  console.log('Highlight test result:', found);
  return found;
}

// Make debug functions available globally
window.debugPdfSearch = debugPdfStructure;
window.testHighlight = testHighlight;

// Initialize when page loads
function initialize() {
  console.log('🔍 Smart Search extension initializing...');
  console.log('Current URL:', window.location.href);
  console.log('Is PDF page?', isPDFPage());
  
  // Add keyboard shortcut listeners with high priority
  document.addEventListener('keydown', handleKeyboardShortcuts, true);
  window.addEventListener('keydown', handleKeyboardShortcuts, true);
  console.log('⌨️ Keyboard event listeners added');
  
  // Create the floating search button
  setTimeout(() => {
    createFloatingSearchButton();
    console.log('🔵 Floating search button created');
  }, 500);
  
  // Extract page content on load with retry for PDFs
  if (isPDFPage()) {
    console.log('📄 PDF detected, setting up content extraction with retries...');
    // Try multiple times for PDFs as content loads asynchronously
    let retryCount = 0;
    const maxRetries = 10;
    
    const tryExtractPdfContent = () => {
      extractPageContent();
      console.log(`📄 PDF content extraction attempt ${retryCount + 1}/${maxRetries}`);
      
      retryCount++;
      if (pdfTextContent.length < 100 && retryCount < maxRetries) {
        setTimeout(tryExtractPdfContent, 1000);
      } else {
        console.log('📄 PDF content extraction completed. Text length:', pdfTextContent.length);
      }
    };
    
    setTimeout(tryExtractPdfContent, 1000);
    
    // Also try again after longer delays
    setTimeout(() => extractPageContent(), 3000);
    setTimeout(() => extractPageContent(), 5000);
  } else {
    setTimeout(() => {
      extractPageContent();
      console.log('📄 Regular page content extracted');
    }, 1000);
  }
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