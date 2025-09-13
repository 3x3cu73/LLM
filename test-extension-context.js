// Test script for extension context validation
// Run this in the browser console to test the fixes

console.log('=== Extension Context Test ===');

// Test extension context validation
console.log('Extension context valid:', window.isExtensionContextValid ? window.isExtensionContextValid() : 'Function not available');

// Test storage fallback
try {
  console.log('Testing localStorage fallback...');
  localStorage.setItem('test-searchHistory', JSON.stringify([{query: 'test', response: null, timestamp: Date.now()}]));
  const stored = localStorage.getItem('test-searchHistory');
  console.log('localStorage test successful:', !!stored);
  localStorage.removeItem('test-searchHistory');
} catch (error) {
  console.log('localStorage test failed:', error);
}

// Test chrome storage availability
try {
  console.log('Chrome object available:', !!window.chrome);
  console.log('Chrome.storage available:', !!(window.chrome && window.chrome.storage));
  console.log('Chrome.runtime available:', !!(window.chrome && window.chrome.runtime));
  if (window.chrome && window.chrome.runtime) {
    console.log('Chrome.runtime.id:', window.chrome.runtime.id);
  }
} catch (error) {
  console.log('Chrome API test error:', error);
}

// Test PDF debug function
if (window.debugPdfSearch) {
  console.log('PDF debug function available');
  window.debugPdfSearch();
} else {
  console.log('PDF debug function not available yet');
}

console.log('=== Test Complete ===');
