/* JavaScript Component */
/* Event listeners */
document.getElementById('inspect_btn').addEventListener('click', inspectPage);
document.getElementById('copy_btn').addEventListener('click', copiedPage);

/* Inspects the page and gives the template */
function inspectPage() {
    const template = document.getElementById('template');
    template.innerHTML = `
        <div class="template-content">
        <strong>Page inspected!</strong><br>
        <p>Here is the template for this page:</p>
        <pre><code>## []()
###    |   
**Cast:**   •  
**Genre:**   •  
**Duration:** \`h m\`
**IMDb Rating:**  :star:  
> 
    `;
}

/* Copies the content from the template onto clipboard */
function copiedPage() {
  const copy = document.getElementById('copy_btn');
  const template = document.getElementById('template');

  // Copy text to clipboard
  navigator.clipboard.writeText(template.textContent);

  // Change text to "Copied!"
  copy.textContent = "Copied!";
  copy.disabled = true;

  // Reset after 2 seconds
  setTimeout(() => {
    copy.textContent = "Copy";
    copy.disabled = false;
  }, 2000);
}