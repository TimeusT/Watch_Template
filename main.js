/* JavaScript Component */

/** Event listeners for buttons */
document.getElementById('inspect_btn').addEventListener('click', inspectPage);
document.getElementById('copy_btn').addEventListener('click', copiedPage);

/** Hide copy button initially */
document.getElementById('copy_btn').style.display = 'none';

/** 
 * Inspects the IMDb page and generates the template with info.
 * Extracts: title, genres, duration, rating, cast, year, age rating, storyline, poster.
 */
async function inspectPage() {
  const inspectBtn = document.getElementById('inspect_btn');
  const copyBtn = document.getElementById('copy_btn');
  const template = document.getElementById('template');

  // Show loading state
  inspectBtn.textContent = 'Inspecting...';
  inspectBtn.disabled = true;
  copyBtn.style.display = 'none';
  template.innerHTML = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Validate IMDb title page
    if (!tab.url.includes("imdb.com/title/")) {
      template.innerHTML = '<p style="color: red;">Please navigate to an IMDb title page first!</p>';
      inspectBtn.textContent = 'Inspect';
      inspectBtn.disabled = false;
      return;
    }

/** Execute script inside IMDb tab */
const [{ result: movieData }] = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: async () => {

    /** Wait for DOM content and dynamic content */
    await new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      } else resolve();
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    const getText = selector => {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : "N/A";
    };

    /** --- Title --- */
    const title = getText("h1");

    /** --- Genres --- */
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

    /** --- Duration --- */
    let duration = 'N/A';
    const durationEl = document.querySelector('[data-testid="title-techspec_runtime"]');
    if (durationEl) {
      duration = durationEl.querySelector('.ipc-metadata-list-item__content-container')?.textContent.split('(')[0].trim() || 'N/A';
    }

    /** --- IMDb Rating --- */
    const imdbRating = getText("[data-testid='hero-rating-bar__aggregate-rating__score'] span") || "N/A";

    /** --- Cast (top 5 actors) --- */
    const castEls = document.querySelectorAll('[data-testid="title-cast-item__actor"]');
    const cast = castEls.length > 0
      ? Array.from(castEls)
          .map(el => el.textContent.trim())
          .filter(name => name)
          .slice(0, 5)
          .join('  •  ')
      : 'N/A';

    /** --- Year + Age Rating --- */
    let year = "N/A", ageRating = "N/A", isTVSeries = false;
    document.querySelectorAll('.ipc-inline-list--show-dividers li a, .ipc-inline-list--show-dividers li')
      .forEach(el => {
        const text = el.textContent.trim();
        if (/^(TV Series|TV Mini Series|Mini Series)$/i.test(text)) { ageRating = text; isTVSeries = true; }
        else if (/^\d{4}(–\d{4})?$/.test(text) || /^\d{4}–$/.test(text)) year = text;
        else if (!isTVSeries && /^(TV-MA|TV-14|TV-PG|TV-Y|TV-Y7|PG-13|PG|R|G|NC-17|NR|Not Rated|Unrated|U|12A?|15|18|MA|M)$/i.test(text)) ageRating = text;
      });

    /** --- STORYLINE --- */
    let description = "There is no available storyline :(";
    const loadStoryline = async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 1500));

      let storylineDiv =
        document.querySelector('[data-testid="Storyline"] .ipc-html-content-inner-div') ||
        document.querySelector('[data-testid="storyline-plot-summary"] .ipc-html-content-inner-div');

      if (!storylineDiv) {
        const headings = document.querySelectorAll('h3');
        for (const heading of headings) {
          if (heading.textContent.trim() === 'Storyline') {
            const section = heading.closest('section');
            if (section) storylineDiv = section.querySelector('.ipc-html-content-inner-div');
            break;
          }
        }
      }

      if (storylineDiv?.textContent.trim()) {
        description = storylineDiv.textContent.replace(/—.*$/s, "").trim();
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    await loadStoryline();

    /** --- POSTER IMAGE --- */
    let posterUrl = null;
    const posterImg = document.querySelector('[data-testid="hero-media__poster"] img');
    if (posterImg) posterUrl = posterImg.src;

    return { title, genre, duration, imdbRating, cast, year, ageRating, description, posterUrl };
  }
});

// Inject poster in popup DOM
const posterColumn = document.querySelector('.poster-column');
posterColumn.innerHTML = movieData.posterUrl
  ? `<img src="${movieData.posterUrl}" alt="${movieData.title} Poster" class="poster-img">`
  : '';

// Display the rest of the template
template.innerHTML = `
  <div class="template-content">
    <strong style="color: white;">Page inspected!</strong><br>
    <p>Here is the template for this page:</p>
    <pre class="code-block"><code>## [${movieData.title}](${tab.url})
### ${movieData.ageRating}   |   ${movieData.year}
**Cast:**   ${movieData.cast}  
**Genre:**   ${movieData.genre}  
**Duration:**  \`${movieData.duration}\`
**IMDb Rating:**  :star: ${movieData.imdbRating} 
&gt; ${movieData.description}
    </code></pre>
  </div>
`;

  copyBtn.style.display = 'inline-block';
  } catch (error) {
    console.error("Error:", error);
    template.innerHTML =
      "<p style='color: red;'>Error inspecting page. Make sure you're on a valid IMDb movie page.</p>";
  }

  inspectBtn.textContent = 'Inspect';
  inspectBtn.disabled = false;
}

/** Copies template content to clipboard */
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
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
    copyBtn.textContent = "Failed!";
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
  });
}
