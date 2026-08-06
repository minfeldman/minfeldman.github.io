/**
 * Soft navigation for shared chrome (profile + nav).
 * Swaps #page-main only so the header never unmounts between about/research/fun.
 * Fruits (Three.js module lifecycle) always does a full navigation.
 */
(function () {
    const MAIN_ID = 'page-main';
    const NAV_SEL = '.nav-bar';

    const ROUTES = [
        { id: 'about', match: (p) => p === '/' || p === '/index.html' || p.endsWith('/minfeldman.github.io/') },
        { id: 'research', match: (p) => p.includes('/research') },
        { id: 'fun', match: (p) => p.includes('/fun') },
        { id: 'fruits', match: (p) => p.includes('/fruits') },
    ];

    function pathOf(url) {
        try {
            return new URL(url, location.href).pathname.replace(/\/+$/, '') || '/';
        } catch {
            return '/';
        }
    }

    function pageIdFromPath(pathname) {
        const p = pathname.replace(/\/+$/, '') || '/';
        // normalize index.html
        const norm = p.endsWith('/index.html') ? p.slice(0, -'/index.html'.length) || '/' : p;
        for (const r of ROUTES) {
            if (r.match(norm) || r.match(pathname)) return r.id;
        }
        return null;
    }

    function isInternalNavLink(anchor) {
        if (!anchor || anchor.tagName !== 'A') return false;
        if (anchor.target && anchor.target !== '_self') return false;
        if (anchor.hasAttribute('download')) return false;
        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return false;
        }
        let url;
        try {
            url = new URL(anchor.href, location.href);
        } catch {
            return false;
        }
        if (url.origin !== location.origin) return false;
        // Leave PDF / assets alone
        if (/\.(pdf|zip|png|jpe?g|gif|webp|ico|css|js|json|glb|gltf)(\?|$)/i.test(url.pathname)) {
            return false;
        }
        return true;
    }

    function isFruitsPath(pathname) {
        return (pathname || '').includes('/fruits');
    }

    function shouldHardNavigate(url) {
        // Three.js module + canvas: full load in both directions keeps lifecycle simple
        if (isFruitsPath(url.pathname) || isFruitsPath(location.pathname)) return true;
        return false;
    }

    function updateNav(pathname) {
        const nav = document.querySelector(NAV_SEL);
        if (!nav) return;
        const active = pageIdFromPath(pathname);

        const hrefFor = {
            about: '/',
            research: '/research/',
            fun: '/fun/',
            fruits: '/fruits/',
        };

        const labels = ['about', 'research', 'fun', 'fruits'];
        nav.innerHTML = '';
        for (const id of labels) {
            if (id === active) {
                const span = document.createElement('span');
                span.className = 'nav-link nav-active';
                span.textContent = id;
                nav.appendChild(span);
            } else {
                const a = document.createElement('a');
                a.className = 'nav-link';
                a.href = hrefFor[id];
                a.textContent = id;
                nav.appendChild(a);
            }
        }
    }

    function runPageHooks(pageId) {
        if (pageId === 'about' && typeof window.initMiffyBook === 'function') {
            try {
                window.initMiffyBook();
            } catch (err) {
                console.error('initMiffyBook failed', err);
            }
        }
    }

    let navigating = false;

    async function softNavigate(url, { push = true } = {}) {
        if (navigating) return;
        if (shouldHardNavigate(url)) {
            location.href = url.href;
            return;
        }

        // Same page
        if (pathOf(url.href) === pathOf(location.href) && url.hash === location.hash) {
            return;
        }

        navigating = true;
        try {
            const res = await fetch(url.href, {
                headers: { Accept: 'text/html' },
                credentials: 'same-origin',
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const nextMain = doc.getElementById(MAIN_ID);
            const curMain = document.getElementById(MAIN_ID);
            if (!nextMain || !curMain) {
                location.href = url.href;
                return;
            }

            const imported = document.importNode(nextMain, true);
            const pageId = imported.dataset.page || pageIdFromPath(url.pathname);

            const swap = () => {
                curMain.replaceWith(imported);
                document.title = doc.title || document.title;
                updateNav(url.pathname);
                // Page changes should land at top (chrome already stable)
                window.scrollTo(0, 0);
                runPageHooks(pageId);
            };

            if (document.startViewTransition) {
                await document.startViewTransition(swap).finished.catch(() => {});
            } else {
                swap();
            }

            if (push) {
                history.pushState({ softNav: true }, '', url.href);
            }
        } catch (err) {
            console.error('soft-nav failed, falling back', err);
            location.href = url.href;
        } finally {
            navigating = false;
        }
    }

    document.addEventListener(
        'click',
        (e) => {
            if (e.defaultPrevented) return;
            if (e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = e.target.closest && e.target.closest('a');
            if (!isInternalNavLink(a)) return;
            const url = new URL(a.href, location.href);
            // Allow in-page hash on same path
            if (pathOf(url.href) === pathOf(location.href) && url.hash) return;
            e.preventDefault();
            softNavigate(url, { push: true });
        },
        true
    );

    window.addEventListener('popstate', () => {
        softNavigate(new URL(location.href), { push: false });
    });

    // Prefetch on hover / focus for snappier swaps
    const prefetched = new Set();
    function prefetch(href) {
        try {
            const url = new URL(href, location.href);
            if (url.origin !== location.origin) return;
            if (shouldHardNavigate(url)) return;
            const key = url.pathname;
            if (prefetched.has(key)) return;
            prefetched.add(key);
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url.href;
            link.as = 'document';
            document.head.appendChild(link);
        } catch {
            /* ignore */
        }
    }

    document.addEventListener(
        'pointerenter',
        (e) => {
            const a = e.target.closest && e.target.closest('a');
            if (isInternalNavLink(a)) prefetch(a.href);
        },
        true
    );

    // Mark history entry so back/forward is consistent
    if (!history.state || !history.state.softNav) {
        history.replaceState({ softNav: true }, '', location.href);
    }

    // Expose for debugging
    window.__softNav = { softNavigate, pageIdFromPath };
})();
