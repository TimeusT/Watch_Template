/* JavaScript Component */
/* Event listeners */
document.getElementById('inspect_btn').addEventListener('click', inspectPage);
document.getElementById('copy_btn').addEventListener('click', copiedPage);

/* Inspects the page and gives the template */
async function inspectPage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we're on an IMDb page
        if (!tab.url.includes('imdb.com/title/')) {
            document.getElementById('template').innerHTML = 
                '<p style="color: red;">Please navigate to an IMDb movie page first!</p>';
            return;
        }

        // Get movie info from IMDb page
        const [{ result: movieData }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const getText = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : 'N/A';
                };

                // Updated selectors for IMDb
                const title = getText('h1') || getText('.title_wrapper h1');
                
                // Get genres - updated selector
                const genreEls = document.querySelectorAll('[data-testid="genres"] a');
                const genre = genreEls.length > 0 
                    ? Array.from(genreEls).map(el => el.textContent.trim()).join(' • ')
                    : 'N/A';

                // Get duration - updated selector
                const durationEl = document.querySelector('[data-testid="title-techspec_runtime"]');
                const duration = durationEl ? durationEl.querySelector('.ipc-metadata-list-item__content-container').textContent.trim() : 'N/A';
                
                // Get rating - updated selector
                const rating = getText('[data-testid="hero-rating-bar__aggregate-rating__score"] span') || 'N/A';

                return { title, genre, duration, rating };
            }
        });

        // Display the result in your popup
        const template = document.getElementById('template');
        template.innerHTML = `
        <div class="template-content">
            <strong style="color: white;">Page inspected!</strong><br>
            <p>Here is the template for this page:</p>
            <pre><code>## [${movieData.title}]()
###    |   
**Cast:**   •  
**Genre:**   ${movieData.genre}  
**Duration:** \`${movieData.duration}\`
**IMDb Rating:**  :star: ${movieData.rating} 
&gt;
    </code></pre>
        </div>
        `;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('template').innerHTML = 
            '<p style="color: red;">Error inspecting page. Make sure you\'re on a valid IMDb movie page.</p>';
    }
}

/* Copies the content from the template onto clipboard */
function copiedPage() {
    const template = document.getElementById('template');
    const copyBtn = document.getElementById('copy_btn');

    // Get the text content from the code block
    const codeElement = template.querySelector('code');
    const textToCopy = codeElement ? codeElement.textContent : template.textContent;

    // Copy text to clipboard
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Change text to "Copied!"
        copyBtn.textContent = "Copied!";
        copyBtn.disabled = true;

        // Reset after 2 seconds
        setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.disabled = false;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        copyBtn.textContent = "Failed!";
        setTimeout(() => {
            copyBtn.textContent = "Copy";
        }, 2000);
    });
}