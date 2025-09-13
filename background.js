// Background script for Document Search Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Document Search Extension installed');
});

// Listen for keyboard commands
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  // Get the active tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      // Send message to content script to open search
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'openAISearch',
        command: command
      }).catch((error) => {
        console.log('Could not send message to content script:', error);
      });
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPDFText') {
    // Future enhancement: could handle PDF text extraction here
    // using a PDF parsing library
    sendResponse({success: true, text: ''});
    return; // Synchronous response, no need to keep channel open
  }
  
  if (request.action === 'savePDFContext') {
    // Save PDF context to storage for future reference
    chrome.storage.local.set({
      [`pdf_${sender.tab.id}`]: {
        url: sender.tab.url,
        text: request.text,
        timestamp: Date.now()
      }
    }, () => {
      sendResponse({success: true});
    });
    return true; // Keep message channel open for async response
  }
});

// Clean up stored PDF data when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`pdf_${tabId}`);
});

// Handle tab updates (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if it's a PDF URL
    if (tab.url.toLowerCase().includes('.pdf') || tab.url.includes('application/pdf')) {
      // Inject content script if needed
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }).catch((err) => {
        // Log error for debugging
        console.warn('Script injection failed:', err);
      });
    }
  }
});