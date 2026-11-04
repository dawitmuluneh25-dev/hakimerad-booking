(() => {
  const out = {dpr: window.devicePixelRatio, htmlClass: document.documentElement.className, vw: innerWidth, vh: innerHeight, scrollY: Math.round(window.scrollY)};
  const measure = (link, scope) => {
    if (!link) return {error: 'link not found in ' + scope};
    const all = Array.from(link.querySelectorAll('*'));
    const pick = (t) => all.find(el => el.textContent.trim() === t);
    const info = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.toString()) || '',
        width: +r.width.toFixed(2),
        left: +r.left.toFixed(2),
        right: +r.right.toFixed(2),
        fontSize: cs.fontSize,
        letterSpacing: cs.letterSpacing,
        fontFamily: cs.fontFamily,
        textTransform: cs.textTransform
      };
    };
    const lr = link.getBoundingClientRect();
    return {
      linkWidth: +lr.width.toFixed(2), linkLeft: +lr.left.toFixed(2), linkRight: +lr.right.toFixed(2),
      wordmark: info(pick('HakimeRAD')),
      tagline: info(pick('Your Reliable Partner!')),
      footerHTML: scope === 'footer' ? link.outerHTML.slice(0, 900) : undefined
    };
  };
  out.header = measure(document.querySelector('header a[aria-label="HakimeRAD — home"]'), 'header');
  const foot = document.querySelector('footer');
  out.footerFound = !!foot;
  out.footer = measure(foot ? foot.querySelector('a[aria-label="HakimeRAD — home"]') : null, 'footer');
  return out;
})()
