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

            const getListText = (els) => {
            if (!els || els.length === 0) return 'N/A';
            return Array.from(els).map(el => el.textContent.trim()).join(' • ');
            };

            // --- Title ---
            const title = getText('h1') || getText('.title_wrapper h1');

            // --- Genres ---
            // Only pick genre chips inside the genre container
            // --- Genres ---
            let genreEls = [];
            // try multiple possible selectors
            const genreContainer = document.querySelector('[data-testid="genres"]');
            if (genreContainer) {
            genreEls = Array.from(genreContainer.querySelectorAll('a, span'))
                .filter(el => el.textContent.trim() && !el.textContent.includes('Back to top'));
            }
            const genre = genreEls.length > 0 ? genreEls.map(el => el.textContent.trim()).join(' • ') : 'N/A';

            // --- Cast ---
            // Pick cast specifically, ignoring writers
            // IMDb main cast is inside ul with data-testid="title-cast"
            const castContainer = document.querySelector('[data-testid="title-cast"]');
            const castEls = castContainer 
            ? Array.from(castContainer.querySelectorAll('a[data-testid="title-cast-item__actor"]'))
            : [];
            const cast = getListText(castEls.slice(0, 5)); // top 5 cast members

            // --- Year & rating/type ---
            const ulElements = document.querySelectorAll('ul.ipc-inline-list--show-dividers.sc-16bda17f-3 li');
            let year = 'N/A';
            let ratingOrType = 'N/A';
            if (ulElements && ulElements.length > 0) {
            ulElements.forEach(el => {
                const text = el.textContent.trim();
                if (/^\d{4}$/.test(text)) year = text; // year
                else if (text.includes('TV') || text.includes('Mini')) ratingOrType = text; // TV series type
                else if (/^[A-Z0-9]+$/.test(text) || text.match(/PG|R|G/)) ratingOrType = text; // rating
            });
            }

            // --- Duration ---
            const durationEl = document.querySelector('[data-testid="title-techspec_runtime"]');
            let duration = 'N/A';
            if (durationEl) {
            const durText = durationEl.querySelector('.ipc-metadata-list-item__content-container')?.textContent.trim() || 'N/A';
            duration = durText.split('(')[0].trim();
            }

            // --- IMDb rating ---
            const rating = getText('[data-testid="hero-rating-bar__aggregate-rating__score"] span') || 'N/A';

            return { title, genre, cast, duration, rating, year, ratingOrType };
        }
        });

        // Display the result in your popup
        const template = document.getElementById('template');
        template.innerHTML = `
        <div class="template-content">
        <strong style="color: white;">Page inspected!</strong><br>
        <p>Here is the template for this page:</p>
        <pre><code>## [${movieData.title}]()
### ${movieData.ratingOrType}   |   ${movieData.year}
**Cast:**   ${movieData.cast}  
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