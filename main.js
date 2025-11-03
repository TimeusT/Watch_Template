/* JavaScript Component */
/* Event listeners */
document.getElementById('inspect_btn').addEventListener('click', inspectPage);
document.getElementById('copy_btn').addEventListener('click', copiedPage);

/* Inspects the page and gives the template */
async function inspectPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Ensure we’re on an IMDb movie/series page
    if (!tab.url.includes("imdb.com/title/")) {
      document.getElementById("template").innerHTML =
        '<p style="color: red;">Please navigate to an IMDb title page first!</p>';
      return;
    }

    // Execute script inside IMDb tab
    const [{ result: movieData }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : "N/A";
        };

        // --- Title ---
        const title = getText("h1");

        // --- Genres ---
        const genreEls = document.querySelectorAll('.ipc-chip__text'); // All genre spans
        const genre = genreEls.length > 0 ? Array.from(genreEls).map(el => el.textContent.trim()).join(' • ') : 'N/A';

        // --- Duration ---
        const durationEl = document.querySelector('[data-testid="title-techspec_runtime"]');
        let duration = 'N/A';
        if (durationEl) {
        const durText = durationEl.querySelector('.ipc-metadata-list-item__content-container')?.textContent.trim() || 'N/A';
        duration = durText.split('(')[0].trim();
        }

        // --- IMDb Rating ---
        const imdbRating =
          getText("[data-testid='hero-rating-bar__aggregate-rating__score'] span") || "N/A";

        // --- Cast (main actors only) ---
        const castEls = document.querySelectorAll('[data-testid="title-cast-item__actor"] a');
        const cast =
          Array.from(castEls)
            .map((el) => el.textContent.trim())
            .filter((name) => name)
            .slice(0, 5)
            .join(" • ") || "N/A";

        // --- Year + Age Rating (without grabbing Dolby/Audio Info) ---
        const metaEls = document.querySelectorAll(
          ".sc-16bda17f-3.hWEpYq li, .ipc-inline-list--show-dividers li"
        );
        let year = "N/A";
        let ageRating = "N/A";
        metaEls.forEach((el) => {
          const text = el.textContent.trim();
          if (/^\d{4}$/.test(text)) year = text;
          else if (/TV|PG|R|U|G|MA|12|15|18|NR|Not Rated/i.test(text)) ageRating = text;
        });

        // --- Description (storyline or plot) ---
        let description = "";
        const fullDesc = document.querySelector(".ipc-html-content-inner-div");
        const shortDesc = document.querySelector('[data-testid="plot-l"]');
        if (fullDesc) {
          description = fullDesc.textContent
            .replace(/\s+—.*/s, "") // remove author credits
            .trim();
        } else if (shortDesc) {
          description = shortDesc.textContent.trim();
        } else {
          description = "No description available.";
        }

        return { title, genre, duration, imdbRating, cast, year, ageRating, description };
      },
    });

    // Display the result in your popup
    const template = document.getElementById("template");
    template.innerHTML = `
      <div class="template-content">
        <strong style="color: white;">Page inspected!</strong><br>
        <p>Here is the template for this page:</p>
        <pre><code>## [${movieData.title}]()
### ${movieData.ageRating}   |   ${movieData.year}
**Cast:**   ${movieData.cast}  
**Genre:**   ${movieData.genre}  
**Duration:** \`${movieData.duration}\`
**IMDb Rating:**  :star: ${movieData.imdbRating} 
&gt; ${movieData.description}
        </code></pre>
      </div>
    `;
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("template").innerHTML =
      '<p style="color: red;">Error inspecting page. Make sure you’re on a valid IMDb movie page.</p>';
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