/* JavaScript Component */
/* Event listeners */
document.getElementById('inspect_btn').addEventListener('click', inspectPage);
document.getElementById('copy_btn').addEventListener('click', copiedPage);

/* Inspects the page and gives the template */
function inspectPage() {
    const template = document.getElementById('template');
    template.innerHTML = "Page inspected!";
}

/* Copies the content from the template onto clipboard */
function copiedPage() {
    const copy = document.getElementById('copy_btn');

    // Change text to "Copied!"
    copy.textContent = "Copied!";

    // Disable button temporarily
    copy.disabled = true;

    // Changes back after 2 seconds
    setTimeout(() => {
    copy.textContent = "Copy";
    copy.disabled = false;
    }, 2000);
}