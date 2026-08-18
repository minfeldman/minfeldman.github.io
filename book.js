const MIFFY_BOOK_TITLE = "The Houseguest";
const API_BASE = "https://api.albertastrom.com";
const CACHE_KEY = "miffy-book-v1";

function readCache() {
    try {
        return JSON.parse(localStorage.getItem(CACHE_KEY));
    } catch {
        return null;
    }
}

function writeCache(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

// Open Library stores many titles in sentence case. Title-case for display only.
function toTitleCase(title) {
    const small = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to", "vs", "via"]);
    return String(title).split(/\s+/).map((word, i) => {
        const lower = word.toLowerCase();
        if (i !== 0 && small.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join(" ");
}

function applyMiffy(data) {
    const miffyImg = document.getElementById("miffy-img");
    const readingEl = document.getElementById("miffy-reading");
    if (!miffyImg || !readingEl) return;
    miffyImg.src = `data:image/png;base64,${data.image}`;
    readingEl.textContent = "";
    readingEl.appendChild(document.createTextNode("currently reading "));
    const titleEl = document.createElement("cite");
    titleEl.textContent = toTitleCase(data.title);
    readingEl.appendChild(titleEl);
    readingEl.appendChild(document.createTextNode(" by "));
    readingEl.appendChild(document.createTextNode(data.author));
}

function applyFallback() {
    const miffyImg = document.getElementById("miffy-img");
    if (!miffyImg) return;
    miffyImg.src = "/public/miffy.png";
    miffyImg.style.width = "150px";
    const wrap = document.querySelector(".miffy-sticker-wrap");
    if (wrap) wrap.style.left = "calc(50vw + 410px)";
    document.getElementById("miffy-reading")?.remove();
    document.getElementById("miffy-reading-br")?.remove();
}

/** Safe to call after soft-nav lands on about (or on first load). */
function initMiffyBook() {
    if (!document.getElementById("miffy-img") || !document.getElementById("miffy-reading")) {
        return;
    }

    const cached = readCache();
    if (cached?.image) applyMiffy(cached);

    fetch(`${API_BASE}/miffy-books/generate?title=${encodeURIComponent(MIFFY_BOOK_TITLE)}`)
        .then((res) => {
            if (!res.ok) throw new Error(res.statusText);
            return res.json();
        })
        .then((data) => {
            // DOM may have navigated away mid-fetch
            if (!document.getElementById("miffy-img")) return;
            if (!cached || cached.image !== data.image || cached.title !== data.title) {
                applyMiffy(data);
                writeCache({ image: data.image, title: data.title, author: data.author });
            }
        })
        .catch((e) => {
            console.error("Miffy API error:", e);
            if (!cached?.image) applyFallback();
        });
}

window.initMiffyBook = initMiffyBook;
initMiffyBook();
