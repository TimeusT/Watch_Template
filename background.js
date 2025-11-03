/*  Backgronud.js Component
*    I don't know what this is for but 
*    apparently it's needed to work with
*    chrome extensions if I want to get
*    access to contents from another webpage
*/

// Background script for Watch Template Generator
chrome.runtime.onInstalled.addListener(() => {
  console.log('Watch Template Generator installed');
});