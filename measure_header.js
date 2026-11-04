(() => {
  const out = {dpr: window.devicePixelRatio, htmlClass: document.documentElement.className, vw: innerWidth, vh: innerHeight};
  const link = document.querySelector('header a[aria-label="HakimeRAD — home"]');
  if (!link) return {__result: {error: 'no header link'}};
  const all = Array.from(link.querySelectorAll('*'));
  const pick = (t) => all.filter(el => el.textContent.trim() === t);
  const info = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      cls: el.className && el.className.toString().slice(0, 120),
      width: +r.width.toFixed(2),
      left: +r.left.toFixed(2),
      right: +r.right.toFixed(2),
      fontSize: cs.fontSize,
      letterSpacing: cs.letterSpacing,
      fontFamily: cs.fontFamily,
      textContent: el.textContent
    };
  };
  out.wordmarkCandidates = pick('HakimeRAD').map(info);
  out.taglineCandidates = pick('Your Reliable Partner!').map(info);
  out.linkRect = (() => { const r = link.getBoundingClientRect(); return {width: +r.width.toFixed(2), left: +r.left.toFixed(2), right: +r.right.toFixed(2)}; })();
  out.linkHTML = link.outerHTML.slice(0, 1200);
  return out;
})()
