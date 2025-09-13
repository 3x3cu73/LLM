// Test script for PDF highlighting functionality
// Run this in the browser console on a PDF page to test highlighting

console.log('=== PDF HIGHLIGHTING TEST ===');

// Test basic functionality
console.log('1. Testing PDF detection...');
if (typeof window.debugPdfSearch === 'function') {
  window.debugPdfSearch();
} else {
  console.log('debugPdfSearch function not available - extension may not be loaded');
}

// Test highlighting with common words
console.log('\n2. Testing highlighting...');
const testWords = ['the', 'and', 'a', 'is', 'in', 'to', 'of', 'for'];

let testIndex = 0;
function runNextTest() {
  if (testIndex < testWords.length) {
    const word = testWords[testIndex];
    console.log(`\nTesting highlight for word: "${word}"`);
    
    if (typeof window.testHighlight === 'function') {
      const result = window.testHighlight(word);
      console.log(`Result for "${word}": ${result}`);
    } else {
      console.log('testHighlight function not available');
    }
    
    testIndex++;
    setTimeout(runNextTest, 2000); // Wait 2 seconds between tests
  } else {
    console.log('\n=== ALL TESTS COMPLETED ===');
    console.log('Check the PDF page for yellow highlights on found words');
  }
}

// Start testing after a short delay
setTimeout(runNextTest, 1000);

// Manual test function
window.manualHighlightTest = function(word) {
  console.log(`Manual test for word: "${word}"`);
  if (typeof window.testHighlight === 'function') {
    return window.testHighlight(word);
  } else {
    console.log('testHighlight function not available');
    return false;
  }
};

console.log('\nYou can also run manual tests with:');
console.log('manualHighlightTest("your-word-here")');
console.log('For example: manualHighlightTest("biology")');
