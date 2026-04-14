const MIFFY_BOOK_TITLE = "Norwegian Wood";
const API_BASE = "https://api.albertastrom.com";

(async () => {
    try {
        const res = await fetch(`${API_BASE}/generate?title=${encodeURIComponent(MIFFY_BOOK_TITLE)}`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        document.getElementById("miffy-img").src = `data:image/png;base64,${data.image}`;
        const readingEl = document.getElementById("miffy-reading");
        readingEl.textContent = "";
        readingEl.appendChild(document.createTextNode("currently reading "));
        const titleEl = document.createElement("cite");
        titleEl.textContent = data.title;
        readingEl.appendChild(titleEl);
        readingEl.appendChild(document.createTextNode(" by "));
        readingEl.appendChild(document.createTextNode(data.author));
    } catch (e) {
        console.error("Miffy API error:", e);
        const miffyImg = document.getElementById("miffy-img");
        miffyImg.src = "public/miffy.png";
        miffyImg.style.width = "150px";
        document.querySelector(".miffy-sticker-wrap").style.left = "calc(50vw + 410px)";
        document.getElementById("miffy-reading").remove();
        document.getElementById("miffy-reading-br").remove();
    }
})();
