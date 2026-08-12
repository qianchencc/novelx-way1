(() => {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sharedBrand = document.getElementById("shared-brand");
  const logoTarget = document.querySelector(".library-logo-target");
  const libraryStage = document.querySelector(".library-stage");
  const orbitStage = document.getElementById("orbit-stage");
  const orbitCurrent = document.getElementById("orbit-current");
  const orbitHudLine = document.querySelector(".orbit-hud-line");
  const flightBirdBody = document.getElementById("flight-bird-body");
  const flightBirdWing = document.getElementById("flight-bird-wing");

  const artItems = [
    { title: "冰壁巨柱", image: "./assets/redesign-v2-art/01-ice-wall-pillars.webp", meta: "2026-06-01 / 1hz脉冲 / WeChat Official Account" },
    { title: "雾塔阵列", image: "./assets/redesign-v2-art/02-mist-tower-array.webp", meta: "2026-06-01 / 1hz脉冲 / WeChat Official Account" },
    { title: "高墙天际", image: "./assets/redesign-v2-art/03-high-wall-skyline.webp", meta: "2026-06-01 / 1hz脉冲 / WeChat Official Account" },
    { title: "我想体验我喜欢的短剧。", image: "./assets/redesign-v2-art/04-question-short-drama.png", meta: "点击开始", action: "#next-experience" },
    { title: "我想续写我喜欢的小说。", image: "./assets/redesign-v2-art/05-question-novel.png", meta: "点击开始", action: "#next-experience" },
    { title: "我想为我的OC打造完整的世界。", image: "./assets/redesign-v2-art/06-question-oc-world.png", meta: "点击开始", action: "#next-experience" },
  ];

  const modulo = (value, length) => ((value % length) + length) % length;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = (edge0, edge1, value) => {
    const amount = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return amount * amount * (3 - 2 * amount);
  };

  async function buildFlightBird() {
    if (!sharedBrand || !flightBirdBody || !flightBirdWing) return;
    try {
      const response = await fetch("./assets/redesign-v2-art/novelx-bird-wing.svg", { cache: "force-cache" });
      if (!response.ok) throw new Error(`Bird SVG request failed: ${response.status}`);
      const source = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
      if (source.querySelector("parsererror")) throw new Error("Bird SVG could not be parsed");
      const makeLayer = (pathIds) => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 1252 1252");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        pathIds.forEach((pathId) => {
          const path = source.getElementById(pathId)?.cloneNode(true);
          if (!path) return;
          path.removeAttribute("id");
          svg.append(path);
        });
        return svg;
      };
      flightBirdBody.replaceChildren(makeLayer(["path-0002", "path-0003", "path-0007"]));
      flightBirdWing.replaceChildren(makeLayer(["path-0001", "path-0004", "path-0005", "path-0006", "path-0008"]));
      sharedBrand.classList.add("is-layered");
    } catch {
      sharedBrand.classList.remove("is-layered");
    }
  }

  function initOcAnimation() {
    const heroOc = document.querySelector(".hero-oc");
    const ocDefault = heroOc?.querySelector(".oc-default");
    const ocExpanded = heroOc?.querySelector(".oc-expanded");
    const ocRollTrack = heroOc?.querySelector(".oc-roll-track");
    const ocWorld = ocRollTrack?.lastElementChild;
    const ocGlitchLayers = Array.from(heroOc?.querySelectorAll(".oc-glitch") || []);
    if (!heroOc || !ocDefault || !ocExpanded || !ocRollTrack || !ocWorld || !ocGlitchLayers.length) return;

    const ocTargets = [heroOc, ocDefault, ocExpanded, ocRollTrack, ocWorld, ...ocGlitchLayers];
    const ocCooldownMs = 650;
    const ocLeaveGraceMs = 180;
    const ocDefaultHoldMs = 4000;
    const ocWorldHoldSeconds = 1.2;
    let ocExpandedState = false;
    let ocAutoCycleInProgress = false;
    let ocInteractionTimeline = null;
    let ocIntentTimer = null;
    let ocAutoTimer = null;
    let ocCooldownUntil = 0;
    let ocPointerInside = false;
    let ocKeyboardFocus = false;

    const setGlitchText = (text) => {
      const isExpandedCopy = text !== "OC";
      ocGlitchLayers.forEach((layer) => {
        layer.textContent = text;
        layer.classList.toggle("is-expanded-copy", isExpandedCopy);
      });
    };
    const getOcExpandedWidth = () => Math.ceil(ocExpanded.getBoundingClientRect().width);
    const resetOc = (expanded) => {
      setGlitchText(expanded ? "原创世界" : "OC");
      gsap.set(heroOc, { width: expanded ? getOcExpandedWidth() : "1.36em" });
      gsap.set(ocDefault, { autoAlpha: expanded ? 0 : 1 });
      gsap.set(ocExpanded, { autoAlpha: expanded ? 1 : 0 });
      gsap.set(ocWorld, {
        backgroundPosition: expanded ? "0% 0%" : "100% 0%",
        filter: expanded ? "drop-shadow(0 0.035em 0.055em rgba(137, 88, 18, 0.26))" : "drop-shadow(0 0 0 rgba(137, 88, 18, 0))",
      });
      gsap.set(ocRollTrack, { yPercent: expanded ? -50 : 0, y: expanded ? "-0.02em" : 0 });
      gsap.set(ocGlitchLayers, { x: 0, autoAlpha: 0, clipPath: "inset(0% 0 0% 0)" });
    };

    const showExpandedOc = (autoRestore = false) => {
      if (ocExpandedState) return;
      ocExpandedState = true;
      ocInteractionTimeline?.kill();
      gsap.killTweensOf(ocTargets);
      if (reduceMotion.matches) { resetOc(true); return; }
      setGlitchText("OC");
      gsap.set(ocRollTrack, { yPercent: 0, y: 0 });
      gsap.set(ocExpanded, { autoAlpha: 0 });
      gsap.set(ocWorld, { backgroundPosition: "100% 0%", filter: "drop-shadow(0 0 0 rgba(137, 88, 18, 0))" });
      ocInteractionTimeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          gsap.set(ocGlitchLayers, { x: 0, autoAlpha: 0, clipPath: "inset(0% 0 0% 0)" });
          if (autoRestore && !ocPointerInside && !ocKeyboardFocus) restoreDefaultOc();
        },
      });
      ocInteractionTimeline
        .addLabel("glitchIn", 0)
        .set(ocGlitchLayers, { autoAlpha: 1 }, "glitchIn")
        .fromTo(ocGlitchLayers[0], { x: -3, clipPath: "inset(8% 0 58% 0)" }, { x: 5, duration: 0.09, ease: "power1.inOut" }, "glitchIn")
        .fromTo(ocGlitchLayers[1], { x: 3, clipPath: "inset(62% 0 7% 0)" }, { x: -5, duration: 0.09, ease: "power1.inOut" }, "glitchIn")
        .add(() => setGlitchText("原创角色"), "glitchIn+=0.08")
        .to(ocDefault, { autoAlpha: 0, duration: 0.08 }, "glitchIn+=0.07")
        .to(heroOc, { width: getOcExpandedWidth, duration: 0.38, ease: "power3.out" }, "glitchIn+=0.08")
        .to(ocExpanded, { autoAlpha: 1, duration: 0.2, ease: "power2.out" }, "glitchIn+=0.17")
        .to(ocGlitchLayers[0], { x: -2, duration: 0.07, ease: "none" }, "glitchIn+=0.1")
        .to(ocGlitchLayers[1], { x: 3, duration: 0.07, ease: "none" }, "glitchIn+=0.1")
        .to(ocGlitchLayers, { x: 0, autoAlpha: 0, duration: 0.13, ease: "power1.out" }, "glitchIn+=0.19")
        .addLabel("wordRoll", "glitchIn+=1.72")
        .to(ocRollTrack, { yPercent: -50, y: "-0.02em", duration: 0.56, ease: "power3.inOut" }, "wordRoll")
        .fromTo(ocWorld, { backgroundPosition: "100% 0%", filter: "drop-shadow(0 0 0 rgba(137, 88, 18, 0))" }, { backgroundPosition: "0% 0%", filter: "drop-shadow(0 0.035em 0.055em rgba(137, 88, 18, 0.26))", duration: 0.62, ease: "power2.out" }, "wordRoll+=0.12")
        .to({}, { duration: ocWorldHoldSeconds });
    };

    const restoreDefaultOc = () => {
      if (!ocExpandedState) return;
      ocExpandedState = false;
      ocInteractionTimeline?.kill();
      gsap.killTweensOf(ocTargets);
      if (reduceMotion.matches) { resetOc(false); return; }
      setGlitchText("原创世界");
      ocInteractionTimeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          resetOc(false);
          if (ocAutoCycleInProgress) { ocAutoCycleInProgress = false; scheduleAutomaticOcCycle(); }
        },
      });
      ocInteractionTimeline
        .addLabel("glitchOut", 0)
        .set(ocGlitchLayers, { autoAlpha: 1 }, "glitchOut")
        .fromTo(ocGlitchLayers[0], { x: 4, clipPath: "inset(12% 0 54% 0)" }, { x: -4, duration: 0.1, ease: "power1.inOut" }, "glitchOut")
        .fromTo(ocGlitchLayers[1], { x: -3, clipPath: "inset(61% 0 8% 0)" }, { x: 5, duration: 0.1, ease: "power1.inOut" }, "glitchOut")
        .to(ocExpanded, { autoAlpha: 0, duration: 0.12 }, "glitchOut+=0.07")
        .add(() => setGlitchText("OC"), "glitchOut+=0.11")
        .to(heroOc, { width: "1.36em", duration: 0.31, ease: "power3.inOut" }, "glitchOut+=0.08")
        .to(ocDefault, { autoAlpha: 1, duration: 0.15 }, "glitchOut+=0.17")
        .to(ocGlitchLayers[0], { x: 3, duration: 0.07, ease: "none" }, "glitchOut+=0.12")
        .to(ocGlitchLayers[1], { x: -3, duration: 0.07, ease: "none" }, "glitchOut+=0.12")
        .to(ocGlitchLayers, { x: 0, autoAlpha: 0, duration: 0.12, ease: "power1.out" }, "glitchOut+=0.23")
        .set(ocRollTrack, { yPercent: 0, y: 0 }, ">");
    };

    const clearOcIntent = () => {
      if (ocIntentTimer === null) return;
      window.clearTimeout(ocIntentTimer);
      ocIntentTimer = null;
    };
    const scheduleOcState = (expanded, graceMs = 0) => {
      clearOcIntent();
      const wait = Math.max(graceMs, Math.max(0, ocCooldownUntil - performance.now()));
      ocIntentTimer = window.setTimeout(() => {
        ocIntentTimer = null;
        const interactionActive = ocPointerInside || ocKeyboardFocus;
        if (expanded !== interactionActive || expanded === ocExpandedState) return;
        ocCooldownUntil = performance.now() + ocCooldownMs;
        if (expanded) showExpandedOc(); else restoreDefaultOc();
      }, wait);
    };
    const playAutomaticOcCycle = () => {
      ocAutoTimer = null;
      const rect = heroOc.closest(".opening")?.getBoundingClientRect();
      const openingVisible = rect && rect.bottom > 0 && rect.top < window.innerHeight;
      if (document.visibilityState !== "visible" || !openingVisible || ocPointerInside || ocKeyboardFocus || ocExpandedState || ocInteractionTimeline?.isActive() || reduceMotion.matches) {
        scheduleAutomaticOcCycle();
        return;
      }
      ocAutoCycleInProgress = true;
      showExpandedOc(true);
    };
    function scheduleAutomaticOcCycle() {
      if (ocAutoTimer !== null) window.clearTimeout(ocAutoTimer);
      ocAutoTimer = window.setTimeout(playAutomaticOcCycle, ocDefaultHoldMs);
    }
    scheduleAutomaticOcCycle();
    heroOc.addEventListener("pointerenter", () => { ocPointerInside = true; scheduleOcState(true); });
    heroOc.addEventListener("pointerleave", () => { ocPointerInside = false; scheduleOcState(false, ocLeaveGraceMs); });
    heroOc.addEventListener("focus", () => { ocKeyboardFocus = heroOc.matches(":focus-visible"); if (ocKeyboardFocus) scheduleOcState(true); });
    heroOc.addEventListener("blur", () => { ocKeyboardFocus = false; if (!ocPointerInside) scheduleOcState(false, ocLeaveGraceMs); });
  }

  function initOrbit() {
    const slots = [...document.querySelectorAll("[data-orbit-slot]")];
    if (!orbitStage || !slots.length) return null;

    const records = slots.map((element) => ({
      element,
      image: element.querySelector("img"),
      number: element.querySelector("figcaption b"),
      title: element.querySelector("figcaption strong"),
      meta: element.querySelector("figcaption small"),
      itemIndex: -1,
      offset: 0,
      ratio: 0.72,
    }));
    const offsets = [-2, -1, 0, 1, 2];
    const desktopRecords = records.slice(0, offsets.length);
    let currentPosition = 0;
    let targetPosition = 0;
    let introProgress = 0;
    let frame = 0;
    let reconciledBase = Number.NaN;
    let dragging = false;
    let pointerStartY = 0;
    let pointerStartPosition = 0;

    const bindRecord = (record, itemIndex) => {
      if (itemIndex < 0 || itemIndex >= artItems.length) {
        record.itemIndex = -1;
        record.element.classList.add("is-empty");
        record.element.classList.remove("is-action", "is-active", "is-caption-visible");
        record.element.dataset.action = "";
        record.element.tabIndex = -1;
        record.element.setAttribute("role", "presentation");
        record.element.setAttribute("aria-hidden", "true");
        record.image.removeAttribute("src");
        record.image.alt = "";
        record.number.textContent = "";
        record.title.textContent = "";
        record.meta.textContent = "";
        return;
      }
      const item = artItems[itemIndex];
      if (record.itemIndex === itemIndex) return;
      record.itemIndex = itemIndex;
      record.element.classList.remove("is-empty");
      record.image.src = item.image;
      record.image.alt = item.title;
      record.number.textContent = String(itemIndex + 1).padStart(2, "0");
      record.title.textContent = item.title;
      record.meta.textContent = item.meta;
      record.element.classList.toggle("is-action", Boolean(item.action));
      record.element.dataset.action = item.action || "";
      record.element.tabIndex = item.action ? 0 : -1;
      record.element.setAttribute("role", item.action ? "link" : "group");
      record.image.onload = () => {
        record.ratio = record.image.naturalWidth / Math.max(1, record.image.naturalHeight);
        requestTick();
      };
    };

    const reconcile = (baseIndex) => {
      offsets.forEach((offset, index) => {
        const record = desktopRecords[index];
        record.offset = offset;
        bindRecord(record, baseIndex + offset);
      });
      records.slice(offsets.length).forEach((record) => bindRecord(record, -1));
      reconciledBase = baseIndex;
    };

    const render = () => {
      if (window.innerWidth <= 860) {
        records.forEach((record, index) => bindRecord(record, index));
        return;
      }

      const rect = orbitStage.getBoundingClientRect();
      const baseIndex = Math.round(currentPosition);
      const fraction = currentPosition - baseIndex;
      if (baseIndex !== reconciledBase) reconcile(baseIndex);

      const metrics = desktopRecords.filter((record) => record.itemIndex >= 0).map((record) => {
        const distance = record.offset - fraction;
        const scale = 0.42 + 0.58 * Math.exp(-0.52 * distance * distance);
        const focusHeight = rect.height * 0.46;
        const focusWidth = clamp(record.ratio * focusHeight, rect.width * 0.11, rect.width * 0.3);
        const width = focusWidth * scale;
        return { record, distance, width, height: width / record.ratio, y: rect.height * 0.5 };
      });

      const anchor = metrics.find((metric) => metric.record.offset === 0);
      let previous = anchor;
      metrics.filter((metric) => metric.record.offset > 0).forEach((metric) => {
        const overlap = clamp(Math.min(previous.height, metric.height) * 0.25, 34, 82);
        metric.y = previous.y + (previous.height + metric.height) * 0.5 - overlap;
        previous = metric;
      });
      previous = anchor;
      metrics.filter((metric) => metric.record.offset < 0).sort((a, b) => b.record.offset - a.record.offset).forEach((metric) => {
        const overlap = clamp(Math.min(previous.height, metric.height) * 0.25, 34, 82);
        metric.y = previous.y - (previous.height + metric.height) * 0.5 + overlap;
        previous = metric;
      });

      const next = metrics.find((metric) => metric.record.offset === (fraction >= 0 ? 1 : -1));
      if (next && fraction !== 0) {
        const shift = -fraction * Math.abs(next.y - rect.height * 0.5);
        metrics.forEach((metric) => { metric.y += shift; });
      }

      const baseX = rect.width * 0.28;
      const radiusX = rect.width * 0.43;
      const radiusY = rect.height * 0.54;
      metrics.forEach((metric) => {
        const { record, distance, width, height } = metric;
        const order = offsets.indexOf(record.offset);
        const localIntro = smoothstep(0, 1, (introProgress * 1.6 - order * 0.11));
        const displayY = rect.height + height * 0.65 + (metric.y - rect.height - height * 0.65) * localIntro;
        const normalizedY = clamp((displayY - rect.height * 0.5) / radiusY, -1, 1);
        const x = baseX + radiusX * Math.max(0, 1 - normalizedY * normalizedY);
        const visibleTop = Math.max(0, displayY - height * 0.5);
        const visibleBottom = Math.min(rect.height, displayY + height * 0.5);
        const visibleFraction = Math.max(0, visibleBottom - visibleTop) / Math.max(1, height);
        const opacity = localIntro * clamp(1 - Math.abs(distance) * 0.1, 0.45, 1) * smoothstep(0.02, 0.3, visibleFraction);

        record.element.style.width = `${width.toFixed(2)}px`;
        record.element.style.opacity = opacity.toFixed(3);
        record.element.style.zIndex = String(1000 + Math.round(displayY));
        record.element.style.pointerEvents = opacity > 0.25 ? "auto" : "none";
        record.element.style.transform = `translate3d(${x.toFixed(2)}px,${displayY.toFixed(2)}px,0) translate(-50%,-50%)`;
        record.element.setAttribute("aria-hidden", opacity > 0.2 ? "false" : "true");
        record.element.classList.toggle("is-active", Math.abs(distance) < 0.5);
        record.element.classList.toggle("is-caption-visible", opacity > 0.34 && width > 112 && Math.abs(distance) < 2.25);
      });

      const active = clamp(baseIndex, 0, artItems.length - 1);
      orbitCurrent.textContent = String(active + 1).padStart(2, "0");
      orbitHudLine.style.setProperty("--orbit-progress", `${(active / (artItems.length - 1)) * 100}%`);
    };

    const tick = () => {
      frame = 0;
      const distance = targetPosition - currentPosition;
      if (reduceMotion.matches || Math.abs(distance) < 0.0005) {
        currentPosition = targetPosition;
        render();
        return;
      }
      currentPosition += distance * 0.22;
      render();
      frame = window.requestAnimationFrame(tick);
    };

    const requestTick = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    const setPosition = (value) => {
      targetPosition = clamp(value, 0, artItems.length - 1);
      requestTick();
    };

    const setProgress = (value) => {
      introProgress = clamp(value, 0, 1);
      render();
    };

    orbitStage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || window.innerWidth <= 860) return;
      dragging = true;
      pointerStartY = event.clientY;
      pointerStartPosition = targetPosition;
      orbitStage.classList.add("is-dragging");
      orbitStage.setPointerCapture(event.pointerId);
    });
    orbitStage.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      setPosition(pointerStartPosition + (event.clientY - pointerStartY) * 0.011);
    });
    const stopDragging = (event) => {
      if (!dragging) return;
      dragging = false;
      orbitStage.classList.remove("is-dragging");
      if (orbitStage.hasPointerCapture(event.pointerId)) orbitStage.releasePointerCapture(event.pointerId);
      setPosition(Math.round(targetPosition));
    };
    orbitStage.addEventListener("pointerup", stopDragging);
    orbitStage.addEventListener("pointercancel", stopDragging);
    orbitStage.addEventListener("keydown", (event) => {
      const actionPiece = event.target.closest(".orbit-piece.is-action");
      if (actionPiece && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        actionPiece.click();
        return;
      }
      if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
      event.preventDefault();
      setPosition(Math.round(targetPosition) + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1));
    });
    orbitStage.addEventListener("click", (event) => {
      const piece = event.target.closest(".orbit-piece.is-action");
      const destination = piece?.dataset.action && document.querySelector(piece.dataset.action);
      if (!destination) return;
      destination.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    });
    window.addEventListener("resize", render);

    reconcile(Math.round(currentPosition));
    render();
    return { setPosition, setProgress, render };
  }

  function initScrollStory(orbit) {
    const titleElements = [".library-eyebrow", ".library-intro h2", ".library-intro blockquote", ".library-intro cite", ".collection-summary"];
    const galleryElements = [".orbit-stage", ".library-switch", ".orbit-hud"];
    gsap.set(".product-sidebar", { xPercent: -102 });
    gsap.set(".product-sidebar > *", { autoAlpha: 0, x: -14 });
    gsap.set(titleElements, { autoAlpha: 0, y: 16 });
    gsap.set(galleryElements, { autoAlpha: 0 });
    gsap.set([".library-switch", ".orbit-hud"], { y: 16 });

    if (!reduceMotion.matches) {
      gsap.from([flightBirdBody, flightBirdWing, ".flight-bird-fallback"], { autoAlpha: 0, y: 14, duration: 0.7, ease: "power3.out" });
    }

    gsap.to(".page-progress span", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: document.documentElement, start: "top top", end: "max", scrub: 0.2 },
    });

    const mm = gsap.matchMedia();
    mm.add({ desktop: "(min-width: 861px)", mobile: "(max-width: 860px)", reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
      const { desktop, reduce } = context.conditions;
      if (reduce) {
        gsap.set(".product-sidebar", { xPercent: 0 });
        gsap.set(".product-sidebar > *", { autoAlpha: 1, x: 0 });
        gsap.set(titleElements, { autoAlpha: 1, y: 0 });
        gsap.set(galleryElements, { autoAlpha: 1 });
        gsap.set([".library-switch", ".orbit-hud"], { y: 0 });
        orbit?.setProgress(1);
        return;
      }

      const flightState = { progress: 0 };
      const originRect = sharedBrand.getBoundingClientRect();
      const dockThreshold = 0.84;
      let birdDocked = false;

      const dockBird = () => {
        if (birdDocked) return;
        birdDocked = true;
        logoTarget.appendChild(sharedBrand);
        sharedBrand.classList.add("is-docked");
      };

      const undockBird = () => {
        if (!birdDocked) return;
        birdDocked = false;
        document.body.appendChild(sharedBrand);
        sharedBrand.classList.remove("is-docked");
      };

      const getFlightGeometry = () => {
        const targetRect = logoTarget.getBoundingClientRect();
        const stageRect = libraryStage.getBoundingClientRect();
        const start = {
          x: originRect.left + originRect.width / 2,
          y: originRect.top + originRect.height / 2,
        };
        const end = {
          x: targetRect.left - stageRect.left + targetRect.width / 2,
          y: targetRect.top - stageRect.top + targetRect.height / 2,
        };
        const horizontal = end.x - start.x;
        return {
          start,
          end,
          control1: { x: start.x + horizontal * (desktop ? 0.32 : 0.25), y: start.y + (desktop ? 120 : 88) },
          control2: { x: end.x - horizontal * (desktop ? 0.2 : 0.16), y: end.y - (desktop ? 150 : 92) },
          scale: targetRect.width * 1.68 / Math.max(1, originRect.width),
        };
      };
      let flightGeometry = getFlightGeometry();

      const bezierPoint = (geometry, progress) => {
        const inverse = 1 - progress;
        const { start, control1, control2, end } = geometry;
        return {
          x: inverse ** 3 * start.x + 3 * inverse ** 2 * progress * control1.x + 3 * inverse * progress ** 2 * control2.x + progress ** 3 * end.x,
          y: inverse ** 3 * start.y + 3 * inverse ** 2 * progress * control1.y + 3 * inverse * progress ** 2 * control2.y + progress ** 3 * end.y,
        };
      };

      const renderFlight = () => {
        const geometry = flightGeometry;
        const progress = flightState.progress;
        const point = bezierPoint(geometry, progress);
        const nextPoint = bezierPoint(geometry, Math.min(1, progress + 0.002));
        const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI;
        const scale = 1 + (geometry.scale - 1) * smoothstep(0.58, 1, progress);
        const landingEase = 1 - smoothstep(0.78, 1, progress);
        const rotation = angle * 0.16 * landingEase;
        if (progress >= dockThreshold) {
          dockBird();
          const targetRect = logoTarget.getBoundingClientRect();
          const targetCenterX = targetRect.left + targetRect.width / 2;
          const targetCenterY = targetRect.top + targetRect.height / 2;
          const dockedScale = (originRect.width * scale) / Math.max(1, targetRect.width);
          sharedBrand.style.transform = `translate3d(${(point.x - targetCenterX).toFixed(2)}px,${(point.y - targetCenterY).toFixed(2)}px,0) rotate(${rotation.toFixed(2)}deg) scale(${dockedScale.toFixed(4)})`;
        } else {
          undockBird();
          sharedBrand.style.transform = `translate3d(${(point.x - geometry.start.x).toFixed(2)}px,${(point.y - geometry.start.y).toFixed(2)}px,0) rotate(${rotation.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        }
        sharedBrand.style.visibility = "visible";
        const flap = Math.sin(progress * Math.PI * (desktop ? 10 : 8)) * landingEase;
        const wingRotation = (-12 * landingEase) + flap * 38;
        const wingScale = 1 - Math.abs(flap) * 0.1;
        if (flightBirdWing) flightBirdWing.style.transform = `rotate(${wingRotation.toFixed(2)}deg) scaleY(${wingScale.toFixed(3)})`;
      };

      renderFlight();

      const transition = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".library-sequence",
          start: "top bottom",
          end: "top top",
          scrub: 0.55,
          invalidateOnRefresh: true,
          onRefreshInit: () => {
            if (flightState.progress > 0.001) return;
            undockBird();
            flightGeometry = getFlightGeometry();
          },
          onUpdate: renderFlight,
          onLeaveBack: () => {
            flightState.progress = 0;
            undockBird();
            gsap.set(sharedBrand, { clearProps: "transform" });
            sharedBrand.style.visibility = "visible";
            if (flightBirdWing) flightBirdWing.style.removeProperty("transform");
            renderFlight();
          },
        },
      });

      transition
        .to(".opening-image", { scale: desktop ? 1.065 : 1.035, duration: 1 }, 0)
        .to(".opening-copy", { autoAlpha: 0, y: desktop ? -72 : -36, duration: 0.72 }, 0.05)
        .to(".hero-orbit", { autoAlpha: 0, scale: 1.025, duration: 0.78 }, 0.06)
        .to(".journey-cue", { autoAlpha: 0, y: 16, duration: 0.24 }, 0)
        .to(".opening-project-logo", { autoAlpha: 0, y: -10, duration: 0.3 }, 0.08)
        .to(".opening-shade", { autoAlpha: 0, duration: 0.62 }, 0.18)
        .to(flightState, { progress: 1, duration: 0.92, onUpdate: renderFlight }, 0.04)
        .to(titleElements, { autoAlpha: 1, y: 0, stagger: 0.025, duration: 0.22, ease: "power2.out" }, 0.76);

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".library-sequence",
          start: () => `top top-=${Math.round(window.innerHeight * 0.12)}px`,
          end: "bottom bottom",
          scrub: 0.7,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .to(".product-sidebar", { xPercent: 0, duration: 0.34, ease: "power3.out" }, 0.04)
        .to(".product-sidebar > *", { autoAlpha: 1, x: 0, stagger: 0.025, duration: 0.3, ease: "power2.out" }, 0.1)
        .to(".orbit-stage", { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, 0.14)
        .to([".library-switch", ".orbit-hud"], { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.24, ease: "power2.out" }, 0.2)
        .to({}, {
          duration: 0.64,
          onUpdate() {
            orbit?.setProgress(this.progress());
          },
        }, 0.14)
        .to({}, {
          duration: 1.8,
          onUpdate() {
            orbit?.setPosition(this.progress() * (artItems.length - 1));
          },
        }, 0.58);
    });
  }

  function initOpeningMotion() {
    const journeyCue = document.querySelector(".journey-cue");
    const journeyLine = document.querySelector(".journey-line");
    const journeyDrop = document.querySelector(".journey-drop");
    const journeyChevron = document.querySelector(".journey-chevron");
    const journeyOrnaments = [...document.querySelectorAll(".journey-ornament")];
    const orbitReveal = document.querySelector(".orbit-reveal");

    journeyCue?.addEventListener("click", (event) => {
      const destination = document.querySelector(journeyCue.getAttribute("href"));
      if (!destination) return;
      event.preventDefault();
      destination.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    });

    if (orbitReveal) {
      const length = orbitReveal.getTotalLength();
      gsap.set(orbitReveal, { strokeDasharray: length, strokeDashoffset: length });
    }
    gsap.set(".orbit-decor > *", { autoAlpha: 0, scale: 0, transformOrigin: "center" });
    gsap.set(".orbit-brush", { autoAlpha: 0.62 });
    gsap.set(".hero-oc", { textShadow: "0 0 0 rgba(179, 134, 61, 0)" });
    gsap.set(journeyCue, { autoAlpha: 0, y: 12 });
    gsap.set(journeyLine, { autoAlpha: 0.34, scaleY: 0, transformOrigin: "center top" });
    gsap.set([journeyDrop, journeyChevron], { autoAlpha: 0 });
    gsap.set(journeyOrnaments, { autoAlpha: 0, scale: 0.45, transformOrigin: "center" });

    const journeyLoop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.52 })
      .set(journeyLine, { autoAlpha: 0.18, scaleY: 0, transformOrigin: "center top" })
      .set(journeyDrop, { autoAlpha: 0, y: 0 })
      .set(journeyChevron, { autoAlpha: 0, y: 0 })
      .set(journeyOrnaments, { autoAlpha: 0, scale: 0.45, rotation: -8 })
      .to(journeyLine, { autoAlpha: 1, scaleY: 1, duration: 0.88, ease: "power2.inOut" }, 0)
      .to(journeyDrop, { autoAlpha: 0.92, duration: 0.18, ease: "power1.out" }, 0.1)
      .to(journeyOrnaments, { autoAlpha: 0.82, scale: 1, rotation: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, 0.16)
      .to(journeyDrop, { y: 47, duration: 1.02, ease: "power2.in" }, 0.12)
      .to(journeyChevron, { autoAlpha: 1, y: 4, duration: 0.34, ease: "power2.out" }, 0.72)
      .to([journeyDrop, journeyChevron, journeyOrnaments], { autoAlpha: 0, duration: 0.34 }, 1.16)
      .to(journeyLine, { autoAlpha: 0.18, scaleY: 0, transformOrigin: "center bottom", duration: 0.46 }, 1.1);

    if (reduceMotion.matches) {
      gsap.set([journeyCue, ".opening .title-line", ".opening-note", ".opening-index", ".orbit-decor > *"], { autoAlpha: 1, y: 0, scale: 1 });
      gsap.set(orbitReveal, { strokeDashoffset: 0 });
      return;
    }

    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".opening .title-line", { autoAlpha: 0, y: 48, duration: 0.98, stagger: 0.12 }, 0.12)
      .to(".hero-oc", { textShadow: "0 0 9px rgba(204, 164, 91, 0.32), 0 0 26px rgba(179, 134, 61, 0.18)", duration: 0.7 }, 0.44)
      .to(orbitReveal, { strokeDashoffset: 0, duration: 1.9, ease: "power2.inOut" }, 0.5)
      .to(".orbit-decor > *", { autoAlpha: 0.72, scale: 1, duration: 0.7, stagger: 0.13, ease: "power2.out" }, 1.2)
      .from(".opening-note", { autoAlpha: 0, y: 14, duration: 0.62 }, 0.62)
      .from(".opening-index", { autoAlpha: 0, duration: 0.6 }, 0.76)
      .to(journeyCue, { autoAlpha: 1, y: 0, duration: 0.68, ease: "power2.out" }, 2.02)
      .add(() => journeyLoop.play(0), 2.18);
  }

  buildFlightBird();
  initOpeningMotion();
  initOcAnimation();
  const orbit = initOrbit();
  initScrollStory(orbit);
  window.addEventListener("load", () => {
    orbit?.render();
    ScrollTrigger.refresh();
  }, { once: true });
})();
