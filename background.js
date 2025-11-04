/*  Backgronud.js Component
*    I don't know what this is for but 
*    apparently it's needed to work with
*    chrome extensions if I want to get
*    access to contents from another webpage
*/

// Background script for Watch Template Generator
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetchImage") {
    console.log('Background: Received fetch request for:', message.url);
    
    fetch(message.url)
      .then(response => {
        console.log('Background: Fetch response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        console.log('Background: Got blob, type:', blob.type, 'size:', blob.size);
        return blob.arrayBuffer();
      })
      .then(arrayBuffer => {
        console.log('Background: Converted to arrayBuffer, size:', arrayBuffer.byteLength);
        sendResponse({
          success: true,
          buffer: Array.from(new Uint8Array(arrayBuffer)),
          type: 'image/jpeg' // Try forcing JPEG type
        });
      })
      .catch(error => {
        console.error("Background: Image fetch failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // keeps channel open for async response
  }
});