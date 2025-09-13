// Popup script for PDF Search Extension

document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const searchQuery = document.getElementById('searchQuery');
    const searchButton = document.getElementById('searchButton');
    const hiddenZero = document.getElementById('hiddenZero');
    const searchResults = document.getElementById('searchResults');
    const resultsList = document.getElementById('resultsList');
    
    // Triple-click counter for hidden settings access
    let clickCount = 0;
    let clickTimer = null;
    
    // Check if we're on a PDF page
    checkPDFPage();
    
    // Event listeners
    searchButton.addEventListener('click', performSearch);
    hiddenZero.addEventListener('click', handleHiddenClick);
    searchQuery.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Handle hidden button clicks for settings access
    function handleHiddenClick() {
        clickCount++;
        
        // Clear previous timer
        if (clickTimer) {
            clearTimeout(clickTimer);
        }
        
        // Set timer to reset click count after 2 seconds
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 2000);
        
        // Open settings if clicked 3 times
        if (clickCount >= 3) {
            clickCount = 0;
            if (clickTimer) {
                clearTimeout(clickTimer);
            }
            openSettings();
        }
    }
    
    // Check if current page is a PDF
    function checkPDFPage() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            const url = currentTab.url;
            
            if (url.includes('.pdf') || url.includes('application/pdf')) {
                showStatus('PDF document detected', 'connected');
                searchQuery.disabled = false;
                searchButton.disabled = false;
            } else {
                showStatus('Navigate to a PDF document to search', 'disconnected');
                searchQuery.disabled = true;
                searchButton.disabled = true;
            }
        });
    }
    
    // Perform search in the PDF
    async function performSearch() {
        const query = searchQuery.value.trim();
        if (!query) {
            showStatus('Please enter a search term', 'disconnected');
            return;
        }
        
        showStatus('Searching document...', 'connected');
        
        try {
            // Get current settings
            const settings = await new Promise(resolve => {
                chrome.storage.sync.get(['apiUrl', 'selectedModel'], resolve);
            });
            
            if (!settings.apiUrl || !settings.selectedModel) {
                showStatus('Please configure settings first', 'disconnected');
                return;
            }
            
            // Send search request to content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'searchPDF',
                    query: query,
                    settings: settings
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        showStatus('Failed to search document', 'disconnected');
                        return;
                    }
                    
                    if (response && response.success) {
                        displaySearchResults(response.results);
                        showStatus(`Found ${response.results.length} result(s)`, 'connected');
                    } else {
                        showStatus('No results found', 'disconnected');
                        hideSearchResults();
                    }
                });
            });
            
        } catch (error) {
            console.error('Search failed:', error);
            showStatus('Search failed', 'disconnected');
        }
    }
    
    // Open settings page
    function openSettings() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('settings.html')
        });
    }
    
    // Display search results
    function displaySearchResults(results) {
        resultsList.innerHTML = '';
        
        if (results.length === 0) {
            hideSearchResults();
            return;
        }
        
        results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.textContent = `${index + 1}. ${result.text.substring(0, 100)}...`;
            resultItem.addEventListener('click', () => {
                // Send message to content script to highlight result
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'highlightResult',
                        index: index
                    });
                });
            });
            resultsList.appendChild(resultItem);
        });
        
        searchResults.style.display = 'block';
    }
    
    // Hide search results
    function hideSearchResults() {
        searchResults.style.display = 'none';
        resultsList.innerHTML = '';
    }
    
    // Show status message
    function showStatus(message, type) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }
});