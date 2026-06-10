const MIFFY_BOOK_TITLE = "Say Nothing";
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

function applyMiffy(data) {
    document.getElementById("miffy-img").src = `data:image/png;base64,${data.image}`;
    const readingEl = document.getElementById("miffy-reading");
    readingEl.textContent = "";
    readingEl.appendChild(document.createTextNode("currently reading "));
    const titleEl = document.createElement("cite");
    titleEl.textContent = data.title;
    readingEl.appendChild(titleEl);
    readingEl.appendChild(document.createTextNode(" by "));
    readingEl.appendChild(document.createTextNode(data.author));
}

function applyFallback() {
    const miffyImg = document.getElementById("miffy-img");
    miffyImg.src = "public/miffy.png";
    miffyImg.style.width = "150px";
    document.querySelector(".miffy-sticker-wrap").style.left = "calc(50vw + 410px)";
    document.getElementById("miffy-reading").remove();
    document.getElementById("miffy-reading-br").remove();
}

const cached = readCache();
if (cached?.image) applyMiffy(cached);

fetch(`${API_BASE}/miffy-books/generate?title=${encodeURIComponent(MIFFY_BOOK_TITLE)}`)
    .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
    })
    .then((data) => {
        if (!cached || cached.image !== data.image || cached.title !== data.title) {
            applyMiffy(data);
            writeCache({ image: data.image, title: data.title, author: data.author });
        }
    })
    .catch((e) => {
        console.error("Miffy API error:", e);
        if (!cached?.image) applyFallback();
    });
