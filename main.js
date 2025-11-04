/* JavaScript Component */

/* Event listeners for buttons */
document.getElementById('inspect_btn').addEventListener('click', inspectPage);
document.getElementById('copy_btn').addEventListener('click', copiedPage);

/* Hide copy button initially */
document.getElementById('copy_btn').style.display = 'none';

/* Utility to set background with opacity */
function setBackground(image, opacity = 0.3) {
    const bg = document.body.querySelector('.bg-overlay');
    if (bg) {
        bg.style.backgroundImage = `url('${image}')`;
        bg.style.opacity = opacity;
    }
}

/* Initialize background */
if (!document.body.querySelector('.bg-overlay')) {
    const overlay = document.createElement('div');
    overlay.classList.add('bg-overlay');
    Object.assign(overlay.style, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.3
    });
    document.body.prepend(overlay);
    setBackground('Images/icon.png');
}

async function inspectPage() {
    const inspectBtn = document.getElementById('inspect_btn');
    const copyBtn = document.getElementById('copy_btn');
    const template = document.getElementById('template');
    const posterColumn = document.querySelector('.poster-column');

    // Clear previous poster/template
    template.innerHTML = '';
    posterColumn.innerHTML = '';

    // Set loading GIF background
    setBackground('Images/icon.gif');

    // Show loading state
    inspectBtn.innerHTML = 'Inspecting<span class="dots"><span>.</span><span>.</span><span>.</span></span>';
    inspectBtn.disabled = true;
    copyBtn.style.display = 'none';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Validate IMDb title page
        if (!tab.url.includes("imdb.com/title/")) {
            template.innerHTML = '<p style="color: red;">Please navigate to an IMDb title page first!</p>';
            inspectBtn.textContent = 'Inspect';
            inspectBtn.disabled = false;
            setBackground('Images/icon.png');
            return;
        }

        // Execute script inside IMDb tab
        const [{ result: movieData }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async () => {
                const getText = selector => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : "N/A";
                };

                /* Title */
                const title = getText("h1");

                /* Genres */
                let genre = 'N/A';
                const genreContainers = document.querySelectorAll('.ipc-chip-list__scroller');
                if (genreContainers.length > 0) {
                    const genreEls = genreContainers[0].querySelectorAll('.ipc-chip__text');
                    genre = genreEls.length > 0
                        ? Array.from(genreEls)
                            .map(el => el.textContent.trim())
                            .filter(text => text.toLowerCase() !== 'back to top')
                            .join('  •  ')
                        : 'N/A';
                }

                /* Duration */
                let duration = 'N/A';
                const durationEl = document.querySelector('[data-testid="title-techspec_runtime"]');
                if (durationEl) {
                    duration = durationEl.querySelector('.ipc-metadata-list-item__content-container')?.textContent.split('(')[0].trim() || 'N/A';
                }

                /* IMDb Rating */
                const imdbRating = getText("[data-testid='hero-rating-bar__aggregate-rating__score'] span") || "N/A";

                /* Cast */
                const castEls = document.querySelectorAll('[data-testid="title-cast-item__actor"]');
                const cast = castEls.length > 0
                    ? Array.from(castEls)
                        .map(el => el.textContent.trim())
                        .filter(name => name)
                        .slice(0, 5)
                        .join('  •  ')
                    : 'N/A';

                /* Year + Age Rating */
                let year = "N/A", ageRating = "N/A", isTVSeries = false;
                document.querySelectorAll('.ipc-inline-list--show-dividers li a, .ipc-inline-list--show-dividers li')
                    .forEach(el => {
                        const text = el.textContent.trim();
                        if (/^(TV Series|TV Mini Series|Mini Series)$/i.test(text)) { ageRating = text; isTVSeries = true; }
                        else if (/^\d{4}(–\d{4})?$/.test(text) || /^\d{4}–$/.test(text)) year = text;
                        else if (!isTVSeries && /^(TV-MA|TV-14|TV-PG|TV-Y|TV-Y7|PG-13|PG|R|G|NC-17|NR|Not Rated|Unrated|U|12A?|15|18|MA|M)$/i.test(text)) ageRating = text;
                    });

                /* Storyline with short summary preference */
                let description = "No available storyline :(";
                const loadDescription = async () => {
                    window.scrollTo(0, document.body.scrollHeight);
                    await new Promise(r => setTimeout(r,1500));

                    const selectors = [
                        '[data-testid="storyline-plot-summary"] .ipc-html-content-inner-div', // preferred
                        '[data-testid="Storyline"] .ipc-html-content-inner-div',
                        '[data-testid="plot-l"]',
                        '[data-testid="plot-xl"]'
                    ];

                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el?.textContent?.trim()) {
                            description = el.textContent
                                .replace(/—.*$/s, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                            break;
                        }
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
                await loadDescription();

                /* Poster image */
                let posterUrl = null;
                const posterImg = document.querySelector('[data-testid="hero-media__poster"] img');
                if (posterImg) posterUrl = posterImg.src;

                return { title, genre, duration, imdbRating, cast, year, ageRating, description, posterUrl };
            }
        });

        // Inject poster into popup DOM
        posterColumn.innerHTML = movieData.posterUrl ? `
        <div class="poster-container">
            <img src="${movieData.posterUrl}" alt="${movieData.title} Poster" class="poster-img">
            <div class="poster-overlay"></div>
        </div>
        ` : '';

        // Copy poster image to clipboard on overlay click
        const overlay = posterColumn.querySelector('.poster-overlay');
        if (overlay && movieData.posterUrl) {
            overlay.addEventListener('click', async () => {
                try {
                    // Show loading state on overlay
                    overlay.style.cursor = 'wait';
                    overlay.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-weight: bold; font-size: 14px;">Copying...</div>';
                    
                    console.log('Attempting to copy image from:', movieData.posterUrl);
                    
                    // Ask background.js to fetch the image (bypasses CORS)
                    const response = await chrome.runtime.sendMessage({
                        action: "fetchImage",
                        url: movieData.posterUrl
                    });

                    console.log('Response from background:', response);

                    if (!response || !response.success) {
                        throw new Error(response ? response.error : "No response from background");
                    }

                    // Create blob from array buffer
                    const blob = new Blob([new Uint8Array(response.buffer)], { type: response.type });
                    console.log('Created blob:', blob.type, blob.size, 'bytes');

                    // Load image into an Image element
                    const img = new Image();
                    const imageUrl = URL.createObjectURL(blob);
                    
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = imageUrl;
                    });

                    console.log('Image loaded, dimensions:', img.width, 'x', img.height);

                    // Draw image to canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // Convert canvas to blob
                    const canvasBlob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/png');
                    });

                    console.log('Canvas blob created:', canvasBlob.size, 'bytes');

                    // Clean up
                    URL.revokeObjectURL(imageUrl);

                    // Copy to clipboard using ClipboardItem
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': canvasBlob
                        })
                    ]);

                    console.log('Successfully copied to clipboard!');

                    // Visual feedback - image copied successfully
                    overlay.style.cursor = 'pointer';
                    overlay.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #4CAF50; font-weight: bold; font-size: 18px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">✓ Copied!</div>';
                    
                    setTimeout(() => {
                        overlay.innerHTML = '';
                    }, 1500);

                } catch (err) {
                    console.error("Detailed error copying image:", err);
                    console.error("Error name:", err.name);
                    console.error("Error message:", err.message);
                    overlay.style.cursor = 'pointer';

                    // Show specific error message
                    const errorMsg = err.message || 'Unknown error';
                    overlay.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #f44336; font-weight: bold; font-size: 11px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); padding: 5px; text-align: center;">Failed!<br>${errorMsg.substring(0, 25)}</div>`;
                    
                    setTimeout(() => {
                        overlay.innerHTML = '';
                    }, 3000);
                }
            });
        }

        // Extract clean URL (keep only /title/ttXXXXXXX)
        const cleanUrl = tab.url.match(/https:\/\/www\.imdb\.com\/title\/tt\d+/)[0];
        
        // Display template
        template.innerHTML = `
        <div class="template-content">
            <strong style="color: white;">Page inspected!</strong><br>
            <p>Here is the template for this page :D</p>
            <pre class="code-block"><code>## [${movieData.title}](${cleanUrl})
### ${movieData.ageRating}   |   ${movieData.year}
**Cast:**  ${movieData.cast}
**Genre:**  ${movieData.genre}
**Duration:**  \`${movieData.duration}\`
**IMDb Rating:**  :star: ${movieData.imdbRating}
&gt; ${movieData.description}
            </code></pre>
        </div>`;

        copyBtn.style.display = 'inline-block';

    } catch (error) {
        console.error("Error:", error);
        template.innerHTML = "<p style='color: red;'>Error inspecting page. Make sure you're on a valid IMDb movie page.</p>";
    }

    // Reset button & background
    inspectBtn.textContent = 'Inspect';
    inspectBtn.disabled = false;
    setBackground('Images/icon.png');
}

/* Copies template content to clipboard */
function copiedPage() {
    const template = document.getElementById('template');
    const copyBtn = document.getElementById('copy_btn');
    const codeElement = template.querySelector('code');
    const textToCopy = codeElement ? codeElement.textContent : template.textContent;

    navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.textContent = "Copied!";
        copyBtn.disabled = true;
        setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.disabled = false;
            setBackground('Images/icon.png');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        copyBtn.textContent = "Failed!";
        setTimeout(() => { copyBtn.textContent = "Copy"; setBackground('Images/icon.png'); }, 2000);
    });
}