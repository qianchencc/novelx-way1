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
    { title: "我想体验我喜欢的短剧....", image: "./assets/redesign-v2-art/04-question-short-drama.png", meta: "点击选择", action: "growth", label: "短剧体验" },
    { title: "我想续写我喜欢的小说....", image: "./assets/redesign-v2-art/05-question-novel.png", meta: "点击选择", action: "growth", label: "小说续写" },
    { title: "我想为我的OC打造完整的世界....", image: "./assets/redesign-v2-art/06-question-oc-world.png", meta: "点击选择", action: "growth", label: "OC 世界" },
  ];

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
    let currentPosition = 0;
    let targetPosition = 0;
    let introProgress = 0;
    let exitProgress = 0;
    let frame = 0;
    let positionTween = null;
    const positionMotion = { value: 0 };
    let dragging = false;
    let pointerPending = false;
    let dragPointerId = null;
    let suppressClick = false;
    let pointerStartY = 0;
    let pointerStartPosition = 0;
    let selectedItemIndex = null;
    let selectionCallback = null;
    let selectionLocked = false;

    const bindRecord = (record, itemIndex) => {
      if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= artItems.length) return;
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
      record.element.dataset.itemIndex = String(itemIndex);
      record.element.tabIndex = item.action ? 0 : -1;
      record.element.setAttribute("role", item.action ? "button" : "group");
      record.element.setAttribute("aria-label", item.action ? `选择：${item.title}` : item.title);
      record.element.setAttribute("aria-pressed", item.action ? String(itemIndex === selectedItemIndex) : "false");
      record.image.onload = () => {
        record.ratio = record.image.naturalWidth / Math.max(1, record.image.naturalHeight);
        requestTick();
      };
    };

    const render = () => {
      if (window.innerWidth <= 860) {
        records.forEach((record, index) => {
          bindRecord(record, index);
          record.element.classList.toggle("is-selected", index === selectedItemIndex);
          if (record.element.classList.contains("is-action")) record.element.setAttribute("aria-pressed", String(index === selectedItemIndex));
        });
        return;
      }

      const rect = orbitStage.getBoundingClientRect();
      const baseIndex = Math.round(currentPosition);

      const metrics = records.map((record) => {
        const distance = record.itemIndex - currentPosition;
        const scale = 0.42 + 0.58 * Math.exp(-0.52 * distance * distance);
        const focusHeight = rect.height * 0.46;
        const focusWidth = clamp(record.ratio * focusHeight, rect.width * 0.11, rect.width * 0.3);
        const width = focusWidth * scale;
        return { record, distance, width, height: width / record.ratio, y: rect.height * 0.5 };
      });

      const anchor = metrics.find((metric) => metric.record.itemIndex === baseIndex);
      let previous = anchor;
      metrics.filter((metric) => metric.record.itemIndex > baseIndex).forEach((metric) => {
        const overlap = clamp(Math.min(previous.height, metric.height) * 0.25, 34, 82);
        metric.y = previous.y + (previous.height + metric.height) * 0.5 - overlap;
        previous = metric;
      });
      previous = anchor;
      metrics.filter((metric) => metric.record.itemIndex < baseIndex).sort((a, b) => b.record.itemIndex - a.record.itemIndex).forEach((metric) => {
        const overlap = clamp(Math.min(previous.height, metric.height) * 0.25, 34, 82);
        metric.y = previous.y - (previous.height + metric.height) * 0.5 + overlap;
        previous = metric;
      });

      const fraction = currentPosition - baseIndex;
      const next = metrics.find((metric) => metric.record.itemIndex === baseIndex + (fraction >= 0 ? 1 : -1));
      if (next && fraction !== 0) {
        const shift = -fraction * Math.abs(next.y - rect.height * 0.5);
        metrics.forEach((metric) => { metric.y += shift; });
      }

      const baseX = rect.width * 0.28;
      const radiusX = rect.width * 0.43;
      const radiusY = rect.height * 0.54;
      metrics.forEach((metric) => {
        const { record, distance, width, height } = metric;
        const order = record.itemIndex;
        const localIntro = smoothstep(0, 1, (introProgress * 1.65 - Math.min(order, 4) * 0.11));
        const exitShift = exitProgress * (rect.height * 1.16 + order * rect.height * 0.035);
        const displayY = rect.height + height * 0.65 + (metric.y - rect.height - height * 0.65) * localIntro - exitShift;
        const normalizedY = clamp((displayY - rect.height * 0.5) / radiusY, -1, 1);
        const x = baseX + radiusX * Math.max(0, 1 - normalizedY * normalizedY);
        const visibleTop = Math.max(0, displayY - height * 0.5);
        const visibleBottom = Math.min(rect.height, displayY + height * 0.5);
        const visibleFraction = Math.max(0, visibleBottom - visibleTop) / Math.max(1, height);
        const exitOpacity = 1 - smoothstep(0.42 + order * 0.035, 0.78 + order * 0.035, exitProgress);
        const opacity = localIntro * exitOpacity * clamp(1 - Math.abs(distance) * 0.1, 0.45, 1) * smoothstep(0.02, 0.3, visibleFraction);

        record.element.style.width = `${width.toFixed(2)}px`;
        record.element.style.opacity = opacity.toFixed(3);
        record.element.style.zIndex = String(1000 + Math.round(displayY));
        record.element.style.pointerEvents = opacity > 0.25 ? "auto" : "none";
        record.element.style.transform = `translate3d(${x.toFixed(2)}px,${displayY.toFixed(2)}px,0) translate(-50%,-50%)`;
        record.element.setAttribute("aria-hidden", opacity > 0.2 ? "false" : "true");
        record.element.classList.toggle("is-active", Math.abs(distance) < 0.5);
        record.element.classList.toggle("is-selected", record.itemIndex === selectedItemIndex);
        if (record.element.classList.contains("is-action")) record.element.setAttribute("aria-pressed", String(record.itemIndex === selectedItemIndex));
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
      if (!frame && !positionTween) frame = window.requestAnimationFrame(tick);
    };

    const setPosition = (value) => {
      positionTween?.kill();
      positionTween = null;
      targetPosition = clamp(value, 0, artItems.length - 1);
      requestTick();
    };

    const animatePosition = (value) => {
      const destination = clamp(value, 0, artItems.length - 1);
      const distance = Math.abs(destination - currentPosition);
      targetPosition = destination;
      positionTween?.kill();
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      if (reduceMotion.matches || distance < 0.001) {
        currentPosition = destination;
        positionMotion.value = destination;
        positionTween = null;
        render();
        return;
      }
      positionMotion.value = currentPosition;
      positionTween = gsap.to(positionMotion, {
        value: destination,
        duration: clamp(0.92 + distance * 0.28, 1.05, 1.65),
        ease: "power2.inOut",
        overwrite: true,
        onUpdate() {
          currentPosition = positionMotion.value;
          render();
        },
        onComplete() {
          currentPosition = destination;
          positionMotion.value = destination;
          positionTween = null;
          render();
        },
      });
    };

    const animateToItem = (itemIndex) => {
      animatePosition(itemIndex);
    };

    const setScrollPosition = (value) => {
      if (selectionLocked) return;
      setPosition(value);
    };

    const setProgress = (value) => {
      introProgress = clamp(value, 0, 1);
      render();
    };

    const setExitProgress = (value) => {
      exitProgress = clamp(value, 0, 1);
      render();
    };

    orbitStage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || window.innerWidth <= 860) return;
      pointerPending = true;
      dragging = false;
      dragPointerId = event.pointerId;
      pointerStartY = event.clientY;
      pointerStartPosition = targetPosition;
    });
    orbitStage.addEventListener("pointermove", (event) => {
      if (!pointerPending || event.pointerId !== dragPointerId) return;
      if (!dragging && Math.abs(event.clientY - pointerStartY) < 5) return;
      if (!dragging) {
        dragging = true;
        suppressClick = true;
        orbitStage.classList.add("is-dragging");
        orbitStage.setPointerCapture(event.pointerId);
      }
      setPosition(pointerStartPosition + (event.clientY - pointerStartY) * 0.011);
    });
    const stopDragging = (event) => {
      if (!pointerPending || event.pointerId !== dragPointerId) return;
      pointerPending = false;
      dragPointerId = null;
      if (!dragging) return;
      dragging = false;
      orbitStage.classList.remove("is-dragging");
      if (orbitStage.hasPointerCapture(event.pointerId)) orbitStage.releasePointerCapture(event.pointerId);
      setPosition(Math.round(targetPosition));
      window.setTimeout(() => { suppressClick = false; }, 0);
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
      animatePosition(Math.round(targetPosition) + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1));
    });
    orbitStage.addEventListener("click", (event) => {
      if (suppressClick) return;
      const piece = event.target.closest(".orbit-piece.is-action");
      const record = records.find((candidate) => candidate.element === piece);
      const itemIndex = record?.itemIndex;
      if (!piece || !Number.isInteger(itemIndex) || itemIndex < 3) return;
      selectedItemIndex = itemIndex;
      selectionLocked = true;
      animateToItem(itemIndex);
      if (window.innerWidth <= 860) {
        orbitStage.scrollTo({
          left: piece.offsetLeft - (orbitStage.clientWidth - piece.offsetWidth) / 2,
          behavior: reduceMotion.matches ? "auto" : "smooth",
        });
      }
      selectionCallback?.(artItems[itemIndex], itemIndex, piece);
      render();
    });
    window.addEventListener("resize", render);

    records.forEach((record, index) => bindRecord(record, index));
    render();
    return {
      setPosition,
      setScrollPosition,
      setProgress,
      setExitProgress,
      render,
      getSelectedItem: () => {
        const index = selectedItemIndex ?? 5;
        return { item: artItems[index], index };
      },
      getSelectedElement: () => records.find((record) => record.itemIndex === selectedItemIndex)?.element || null,
      onSelect(callback) { selectionCallback = callback; },
    };
  }

  function initScrollStory(orbit) {
    const titleElements = [".library-eyebrow", ".library-intro h2", ".library-intro blockquote", ".library-intro cite", ".collection-summary"];
    const galleryElements = [".orbit-stage", ".orbit-hud"];
    gsap.set(".product-sidebar", { xPercent: -102 });
    gsap.set(".product-sidebar > *", { autoAlpha: 0, x: -14 });
    gsap.set(titleElements, { autoAlpha: 0, y: 16 });
    gsap.set(galleryElements, { autoAlpha: 0 });
    gsap.set(".orbit-hud", { y: 16 });

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
        gsap.set(".orbit-hud", { y: 0 });
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
          onUpdate(self) {
            const time = self.animation?.time() || 0;
            orbit?.setProgress(clamp((time - 0.14) / 0.64, 0, 1));
            orbit?.setScrollPosition(clamp((time - 0.58) / 1.8, 0, 1) * (artItems.length - 1));
          },
        },
      });

      timeline
        .to(".product-sidebar", { xPercent: 0, duration: 0.34, ease: "power3.out" }, 0.04)
        .to(".product-sidebar > *", { autoAlpha: 1, x: 0, stagger: 0.025, duration: 0.3, ease: "power2.out" }, 0.1)
        .to(".orbit-stage", { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, 0.14)
        .to(".orbit-hud", { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out" }, 0.2)
        .to({}, { duration: 0.64 }, 0.14)
        .to({}, { duration: 1.8 }, 0.58);
    });
  }

  function initGrowthHandoff(orbit) {
    const librarySequence = document.querySelector(".library-sequence");
    const libraryStageElement = document.querySelector(".library-stage");
    const growthChapter = document.querySelector(".growth-chapter");
    const growthCopy = document.getElementById("growth-copy");
    const growthCommand = document.querySelector(".growth-command");
    if (!orbit || !librarySequence || !libraryStageElement || !growthChapter || !growthCopy || !growthCommand) return;

    let selected = orbit.getSelectedItem();
    growthCopy.replaceChildren();
    const commandPhrases = Array.from({ length: 4 }, (_, phraseIndex) => {
      const span = document.createElement("span");
      span.className = "command-phrase";
      if (phraseIndex < 2) growthCopy.append(span);
      return span;
    });
    const commandEnding = document.createElement("span");
    commandEnding.className = "command-ending";
    commandEnding.append(commandPhrases[2], commandPhrases[3]);
    growthCopy.append(commandEnding);

    const growthPrelude = document.createElement("div");
    growthPrelude.className = "growth-prelude";
    growthPrelude.setAttribute("aria-hidden", "true");
    const preludeCommand = growthCommand.cloneNode(true);
    preludeCommand.removeAttribute("id");
    preludeCommand.querySelector("#growth-copy")?.removeAttribute("id");
    growthPrelude.append(preludeCommand);
    document.body.append(growthPrelude);
    const preludePhrases = [...preludeCommand.querySelectorAll(".command-phrase")];
    const preludeName = preludeCommand.querySelector(".command-name");
    const preludeCaret = preludeCommand.querySelector(".command-caret");
    let pianoProgress = 0;

    const fillCharacters = (phraseElement, text) => {
      phraseElement.replaceChildren(...Array.from(text, (character) => {
        const span = document.createElement("span");
        span.className = "command-char";
        span.textContent = character;
        return span;
      }));
    };

    const getPreludeCharacters = () => [...preludeCommand.querySelectorAll(".command-char")];
    const renderPiano = () => {
      const characters = getPreludeCharacters();
      const count = Math.max(1, characters.length);
      const overlap = 0.46;
      const keyLength = 1 / (1 + (count - 1) * overlap);
      const keyOffset = keyLength * overlap;
      const pianoEase = gsap.parseEase("back.out(1.7)");

      characters.forEach((character, characterIndex) => {
        const localProgress = clamp((pianoProgress - characterIndex * keyOffset) / keyLength, 0, 1);
        gsap.set(character, {
          autoAlpha: localProgress,
          scale: 0.7 + pianoEase(localProgress) * 0.3,
          transformOrigin: "center bottom",
        });
      });
      gsap.set(preludeCaret, { autoAlpha: pianoProgress > 0.965 ? 1 : 0 });
    };

    const rebuildCommand = (item, index) => {
      selected = { item, index };
      const phraseSets = {
        3: ["我想", "体验", "我喜欢的短剧", "...."],
        4: ["我想", "续写", "我喜欢的小说", "...."],
        5: ["我想", "为我的OC", "打造完整的世界", "...."],
      };
      const phrases = phraseSets[index] || [item.title, "", "", "...."];
      phrases.forEach((phrase, phraseIndex) => {
        fillCharacters(commandPhrases[phraseIndex], phrase);
        fillCharacters(preludePhrases[phraseIndex], phrase);
      });
      growthChapter.dataset.selection = String(index);
      renderPiano();
    };

    rebuildCommand(selected.item, selected.index);
    orbit.onSelect((item, index, piece) => {
      rebuildCommand(item, index);
      document.querySelectorAll(".orbit-piece.is-selected").forEach((element) => element.classList.toggle("is-selected", Number(element.dataset.itemIndex) === index));
      gsap.fromTo(piece, { filter: "brightness(1.18)" }, { filter: "brightness(1)", duration: 0.7, ease: "power2.out", overwrite: true });
    });

    const mm = gsap.matchMedia();
    mm.add({ desktop: "(min-width: 861px)", mobile: "(max-width: 860px)", reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
      const { desktop, reduce } = context.conditions;
      if (reduce) {
        gsap.set([".growth-command", ".growth-aura"], { autoAlpha: 1, clearProps: "transform" });
        gsap.set([".command-name", ".command-char", ".command-caret"], { autoAlpha: 1, y: 0, scale: 1 });
        gsap.set(growthPrelude, { autoAlpha: 0 });
        orbit.setExitProgress(0);
        return;
      }

      const exitTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: librarySequence,
          start: () => `bottom bottom+=${Math.round(window.innerHeight * 0.92)}`,
          end: "bottom bottom",
          scrub: 0.62,
          invalidateOnRefresh: true,
          onUpdate(self) {
            orbit.setExitProgress(self.progress);
          },
        },
      });
      exitTimeline
        .fromTo(".product-sidebar", { xPercent: 0 }, { xPercent: -102, duration: 0.62, ease: "power3.in", immediateRender: false }, 0)
        .fromTo(".library-intro", { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: desktop ? -130 : -72, duration: 0.54, ease: "power2.in", immediateRender: false }, 0.04)
        .fromTo([".orbit-hud", ".orbit-guide"], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -36, duration: 0.34, immediateRender: false }, 0.08)
        .fromTo(".page-progress", { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.3, immediateRender: false }, 0.48)
        .fromTo(libraryStageElement, { backgroundColor: "#f7f4ec" }, { backgroundColor: "#171511", duration: 0.72, immediateRender: false }, 0.28);

      gsap.set(growthCommand, { autoAlpha: 0 });
      gsap.set(preludeName, { autoAlpha: 1, y: 0 });
      gsap.set(getPreludeCharacters(), { autoAlpha: 0, y: 0, scale: 0.7, transformOrigin: "center bottom" });
      gsap.set(preludeCaret, { autoAlpha: 0 });
      gsap.set(".growth-aura", { autoAlpha: 0, scaleX: 0.3 });
      const pianoState = { progress: 0 };

      const growthTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: growthChapter,
          start: "top bottom",
          end: "top top",
          scrub: 0.38,
          invalidateOnRefresh: true,
          onEnter() {
            document.documentElement.classList.add("is-growth-prelude");
            gsap.set(growthPrelude, { autoAlpha: 1 });
            gsap.set(growthCommand, { autoAlpha: 0 });
          },
          onLeave() {
            document.documentElement.classList.remove("is-growth-prelude");
            pianoProgress = 1;
            gsap.set(growthCommand.querySelectorAll(".command-char"), { autoAlpha: 1, scale: 1 });
            gsap.set(growthCommand, { autoAlpha: 1 });
            gsap.set(growthPrelude, { autoAlpha: 0 });
          },
          onEnterBack() {
            document.documentElement.classList.add("is-growth-prelude");
            gsap.set(growthCommand, { autoAlpha: 0 });
            gsap.set(growthPrelude, { autoAlpha: 1 });
          },
          onLeaveBack() {
            document.documentElement.classList.remove("is-growth-prelude");
            gsap.set(growthPrelude, { autoAlpha: 0 });
          },
        },
      });
      growthTimeline
        .addLabel("invoke", 0)
        .to(pianoState, {
          progress: 1,
          duration: 1,
          onUpdate() {
            pianoProgress = pianoState.progress;
            renderPiano();
          },
        }, "invoke")
        .to({}, { duration: 0.08 });
    });
  }

  function initAgentGrowthTransition() {
    const growthChapter = document.querySelector(".growth-chapter");
    const transitionSection = document.querySelector(".agent-growth-transition");
    const transitionStage = document.querySelector(".agent-growth-stage");
    const sourceFrame = document.querySelector(".agent-growth-source-frame");
    const blueprint = document.querySelector(".agent-growth-blueprint");
    const veil = document.querySelector(".agent-growth-veil");
    const destination = document.querySelector(".agent-growth-destination");
    const productWindow = document.querySelector(".growth-product-window");
    const windowSource = document.querySelector(".growth-window-source");
    const windowFinal = document.querySelector(".growth-window-final");
    const windowFront = document.querySelector(".growth-window-front");
    const windowAtlasPage = document.querySelector(".growth-window-atlas-page");
    const productMap = document.querySelector(".atlas-product-map");
    const pageShadow = document.querySelector(".growth-page-shadow");
    const atlas = document.querySelector(".growth-continuum-atlas");
    const atlasHeading = document.querySelector(".continuum-atlas-heading");
    const atlasMapShell = document.querySelector(".continuum-atlas-map-shell");
    const atlasCopy = document.querySelector(".continuum-atlas-copy");
    const destinationCopy = [...document.querySelectorAll(".growth-world-copy, .growth-world-arc")];
    const heading = document.querySelector(".agent-growth-heading");
    const progressCard = document.querySelector(".growth-progress-card");
    const progressName = progressCard?.querySelector(".growth-progress-name");
    const progressPrefix = progressCard?.querySelector(".growth-progress-prefix");
    const progressValue = document.getElementById("agent-growth-value");
    const commandName = growthChapter.querySelector(".command-name");
    const commandSlash = growthChapter.querySelector(".command-slash");
    const commandGrowthWord = growthChapter.querySelector(".command-growth-word");
    const commandCopy = growthChapter.querySelector(".command-copy");
    const commandCaret = growthChapter.querySelector(".command-caret");
    const growthAura = growthChapter.querySelector(".growth-aura");
    const fixedCommandSlash = document.querySelector(".growth-prelude .command-slash");
    const fixedCommandGrowthWord = document.querySelector(".growth-prelude .command-growth-word");
    const fixedCommandCopy = document.querySelector(".growth-prelude .command-copy");
    const fixedCommandCaret = document.querySelector(".growth-prelude .command-caret");
    const orbitDecoration = document.querySelector(".growth-progress-orbit");
    const traces = [...document.querySelectorAll(".growth-progress-traces i")];
    const startrails = document.querySelector(".growth-startrails");
    const index = document.querySelector(".agent-growth-index");
    if (!growthChapter || !transitionSection || !transitionStage || !sourceFrame || !blueprint || !veil || !destination || !productWindow || !windowSource || !windowFinal || !windowFront || !windowAtlasPage || !productMap || !atlas || !atlasMapShell || !heading || !progressCard || !progressName || !progressPrefix || !progressValue || !commandName || !commandGrowthWord) return;

    const sharedName = document.createElement("span");
    sharedName.className = "growth-shared-name";
    sharedName.setAttribute("aria-hidden", "true");
    sharedName.innerHTML = "<b>Growth</b>";
    document.body.append(sharedName);

    const handoffBackdrop = document.createElement("div");
    handoffBackdrop.className = "growth-handoff-backdrop";
    handoffBackdrop.setAttribute("aria-hidden", "true");
    document.body.append(handoffBackdrop);

    document.body.append(progressCard);

    const progressState = { value: 0 };
    const startrailContext = startrails?.getContext("2d", { alpha: true });
    const startrailState = { progress: 0 };
    const starCatalog = Array.from({ length: 96 }, (_, starIndex) => {
      const normalized = (starIndex + .5) / 96;
      const jitter = ((starIndex * 47) % 31) / 31;
      return {
        radius: .055 + normalized * .83 + (jitter - .5) * .016,
        angle: ((starIndex * 137.508 + jitter * 21) * Math.PI) / 180,
        speed: .66 + ((starIndex * 19) % 23) / 42,
        alpha: .17 + ((starIndex * 29) % 17) / 31,
        width: starIndex % 13 === 0 ? 1.4 : starIndex % 5 === 0 ? .9 : .55,
        warm: starIndex % 7 !== 0,
      };
    });
    const ornamentCatalog = [
      { type: "star-ring", radius: .18, angle: -.82, speed: .76, size: 8.2, reveal: .18 },
      { type: "small-star", radius: .29, angle: 2.56, speed: .91, size: 5.2, reveal: .12 },
      { type: "hollow-ring", radius: .37, angle: -.12, speed: .7, size: 6.6, reveal: .2 },
      { type: "diamond", radius: .45, angle: 1.72, speed: .84, size: 5.1, reveal: .24 },
      { type: "double-node", radius: .53, angle: -2.38, speed: .68, size: 4.1, reveal: .08 },
      { type: "tangent-tick", radius: .61, angle: .62, speed: .8, size: 11, reveal: .22 },
      { type: "dust-pair", radius: .69, angle: 2.92, speed: .72, size: 3.8, reveal: .1 },
      { type: "halo-node", radius: .77, angle: -.95, speed: .9, size: 5.4, reveal: .28 },
      { type: "crosshair", radius: .24, angle: -2.82, speed: .73, size: 7.4, reveal: .3 },
      { type: "arc-bracket", radius: .34, angle: .94, speed: .86, size: 8.2, reveal: .34 },
      { type: "triple-dust", radius: .42, angle: -1.68, speed: .78, size: 3.5, reveal: .14 },
      { type: "double-ring", radius: .5, angle: 2.18, speed: .67, size: 5.8, reveal: .38 },
      { type: "comet-node", radius: .58, angle: -.42, speed: .93, size: 5.2, reveal: .16 },
      { type: "small-star", radius: .66, angle: 1.34, speed: .82, size: 4.4, reveal: .26 },
      { type: "diamond", radius: .74, angle: -2.12, speed: .75, size: 4.7, reveal: .32 },
      { type: "hollow-ring", radius: .82, angle: .18, speed: .88, size: 5.2, reveal: .4 },
      { type: "tangent-tick", radius: .27, angle: 2.08, speed: .69, size: 8.6, reveal: .46 },
      { type: "halo-node", radius: .47, angle: -3.02, speed: .92, size: 4.6, reveal: .42 },
      { type: "star-ring", radius: .63, angle: 2.74, speed: .71, size: 6.8, reveal: .48 },
      { type: "arc-bracket", radius: .79, angle: 1.92, speed: .83, size: 7.2, reveal: .5 },
    ];

    const drawStartrailOrnament = (ornament, x, y, tangent, color, alpha, progress) => {
      if (!ornament || progress < ornament.reveal) return;
      const reveal = smoothstep(ornament.reveal, Math.min(1, ornament.reveal + .16), progress);
      const size = ornament.size * (.6 + reveal * .4);
      startrailContext.save();
      startrailContext.translate(x, y);
      startrailContext.rotate(tangent);
      startrailContext.globalAlpha = reveal;
      startrailContext.strokeStyle = `rgba(${color},${Math.min(.78, alpha * 1.5)})`;
      startrailContext.fillStyle = `rgba(${color},${Math.min(.72, alpha * 1.35)})`;
      startrailContext.lineWidth = .8;

      const fourPointStar = (starSize) => {
        startrailContext.beginPath();
        startrailContext.moveTo(0, -starSize);
        startrailContext.lineTo(starSize * .22, -starSize * .22);
        startrailContext.lineTo(starSize, 0);
        startrailContext.lineTo(starSize * .22, starSize * .22);
        startrailContext.lineTo(0, starSize);
        startrailContext.lineTo(-starSize * .22, starSize * .22);
        startrailContext.lineTo(-starSize, 0);
        startrailContext.lineTo(-starSize * .22, -starSize * .22);
        startrailContext.closePath();
      };

      if (ornament.type === "star-ring") {
        fourPointStar(size);
        startrailContext.fill();
        startrailContext.setLineDash([1.4, 3.2]);
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size * 2.15, 0, Math.PI * 2);
        startrailContext.stroke();
      } else if (ornament.type === "small-star") {
        fourPointStar(size);
        startrailContext.fill();
      } else if (ornament.type === "hollow-ring") {
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size, 0, Math.PI * 2);
        startrailContext.fillStyle = `rgba(238,225,201,${alpha * .24})`;
        startrailContext.fill();
        startrailContext.stroke();
      } else if (ornament.type === "diamond") {
        startrailContext.rotate(Math.PI / 4);
        startrailContext.fillRect(-size * .55, -size * .55, size * 1.1, size * 1.1);
      } else if (ornament.type === "double-node") {
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size, 0, Math.PI * 2);
        startrailContext.fill();
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size * 1.8, 0, Math.PI * 2);
        startrailContext.stroke();
      } else if (ornament.type === "tangent-tick") {
        startrailContext.beginPath();
        startrailContext.moveTo(-size, 0);
        startrailContext.lineTo(size, 0);
        startrailContext.stroke();
        startrailContext.beginPath();
        startrailContext.arc(size * .62, 0, 1.2, 0, Math.PI * 2);
        startrailContext.fill();
      } else if (ornament.type === "dust-pair") {
        startrailContext.beginPath();
        startrailContext.arc(-size * 1.4, 0, size * .52, 0, Math.PI * 2);
        startrailContext.arc(size * 1.2, size * .45, size * .3, 0, Math.PI * 2);
        startrailContext.fill();
      } else if (ornament.type === "halo-node") {
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size * .46, 0, Math.PI * 2);
        startrailContext.fill();
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size * 2.25, -.55, 1.05);
        startrailContext.stroke();
      } else if (ornament.type === "crosshair") {
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size * .72, 0, Math.PI * 2);
        startrailContext.stroke();
        startrailContext.beginPath();
        startrailContext.moveTo(-size * 1.35, 0);
        startrailContext.lineTo(-size * .55, 0);
        startrailContext.moveTo(size * .55, 0);
        startrailContext.lineTo(size * 1.35, 0);
        startrailContext.moveTo(0, -size * 1.35);
        startrailContext.lineTo(0, -size * .55);
        startrailContext.moveTo(0, size * .55);
        startrailContext.lineTo(0, size * 1.35);
        startrailContext.stroke();
      } else if (ornament.type === "arc-bracket") {
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size, -.95, .95);
        startrailContext.stroke();
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size * .25, 0, Math.PI * 2);
        startrailContext.fill();
      } else if (ornament.type === "triple-dust") {
        [[-1.5, 0, .42], [0, -.55, .72], [1.35, .28, .3]].forEach(([dx, dy, scale]) => {
          startrailContext.beginPath();
          startrailContext.arc(dx * size, dy * size, size * scale, 0, Math.PI * 2);
          startrailContext.fill();
        });
      } else if (ornament.type === "double-ring") {
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size * .72, 0, Math.PI * 2);
        startrailContext.arc(0, 0, size * 1.42, 0, Math.PI * 2);
        startrailContext.stroke();
      } else if (ornament.type === "comet-node") {
        startrailContext.beginPath();
        startrailContext.arc(0, 0, size * .42, 0, Math.PI * 2);
        startrailContext.fill();
        startrailContext.beginPath();
        startrailContext.moveTo(-size * 2.4, 0);
        startrailContext.lineTo(-size * .7, 0);
        startrailContext.stroke();
      }
      startrailContext.restore();
    };

    function renderStartrails() {
      if (!startrails || !startrailContext) return;
      const { width, height } = startrails;
      startrailContext.clearRect(0, 0, width, height);
      const progress = clamp(startrailState.progress, 0, 1);
      if (progress <= .001) return;
      const centerX = width * (window.innerWidth <= 860 ? .31 : .38);
      const centerY = height * (window.innerWidth <= 860 ? .3 : .42);
      const maxRadius = Math.hypot(Math.max(centerX, width - centerX), Math.max(centerY, height - centerY));
      const arcGrowth = .025 + progress * 1.72;
      startrailContext.lineCap = "round";

      starCatalog.forEach((star, starIndex) => {
        const radius = star.radius * maxRadius;
        const head = star.angle + progress * 1.58 * star.speed;
        const arcLength = arcGrowth * (.72 + star.speed * .36);
        const start = head - arcLength;
        const color = star.warm ? "191,133,40" : "119,132,143";
        const gradient = startrailContext.createLinearGradient(
          centerX + Math.cos(start) * radius,
          centerY + Math.sin(start) * radius,
          centerX + Math.cos(head) * radius,
          centerY + Math.sin(head) * radius,
        );
        gradient.addColorStop(0, `rgba(${color},0)`);
        gradient.addColorStop(.64, `rgba(${color},${star.alpha * .42})`);
        gradient.addColorStop(1, `rgba(${color},${star.alpha})`);
        startrailContext.beginPath();
        startrailContext.arc(centerX, centerY, radius, start, head);
        startrailContext.strokeStyle = gradient;
        startrailContext.lineWidth = star.width;
        startrailContext.stroke();
        const headX = centerX + Math.cos(head) * radius;
        const headY = centerY + Math.sin(head) * radius;
        if (star.width > .8) {
          startrailContext.beginPath();
          startrailContext.arc(headX, headY, star.width * .75, 0, Math.PI * 2);
          startrailContext.fillStyle = `rgba(${color},${Math.min(.72, star.alpha * 1.35)})`;
          startrailContext.fill();
        }
      });

      ornamentCatalog.forEach((ornament, ornamentIndex) => {
        const radius = ornament.radius * maxRadius;
        const head = ornament.angle + progress * 1.58 * ornament.speed;
        const x = centerX + Math.cos(head) * radius;
        const y = centerY + Math.sin(head) * radius;
        const color = ornamentIndex % 6 === 4 ? "119,132,143" : "181,123,31";
        drawStartrailOrnament(ornament, x, y, head + Math.PI / 2, color, .62, progress);
      });
    }

    const resizeStartrails = () => {
      if (!startrails || !startrailContext) return;
      const scale = window.innerWidth <= 860 ? .55 : .65;
      startrails.width = Math.max(1, Math.round(window.innerWidth * scale));
      startrails.height = Math.max(1, Math.round(window.innerHeight * scale));
      renderStartrails();
    };
    window.addEventListener("resize", resizeStartrails, { passive: true });

    const renderProgress = () => {
      const value = clamp(progressState.value, 0, 100);
      const rounded = Math.round(value);
      progressValue.textContent = String(rounded).padStart(2, "0");
      // The track always represents a complete 0-100 scale; this scene stops at 68.
      progressCard.style.setProperty("--growth-progress", `${value}%`);
    };

    const getBlueprintGeometry = () => {
      const windowRect = productWindow.getBoundingClientRect();
      const imageRatio = 1672 / 941;
      const windowRatio = windowRect.width / Math.max(1, windowRect.height);
      const renderedWidth = windowRatio > imageRatio ? windowRect.height * imageRatio : windowRect.width;
      const renderedHeight = windowRatio > imageRatio ? windowRect.height : windowRect.width / imageRatio;
      const imageLeft = windowRect.left + (windowRect.width - renderedWidth) / 2;
      const imageTop = windowRect.top + (windowRect.height - renderedHeight) / 2;
      // Progress panel in storyboard-04-agent-growth.png.
      const target = { x: 500 / 1672, y: 240 / 941, width: 255 / 1672, height: 136 / 941 };
      return {
        x: imageLeft + renderedWidth * (target.x + target.width / 2),
        y: imageTop + renderedHeight * (target.y + target.height / 2),
        width: renderedWidth * target.width,
        height: renderedHeight * target.height,
      };
    };

    const getWindowGeometry = () => {
      const stageRect = transitionStage.getBoundingClientRect();
      const targetRect = productWindow.getBoundingClientRect();
      return {
        left: targetRect.left - stageRect.left,
        top: targetRect.top - stageRect.top,
        width: targetRect.width,
        height: targetRect.height,
      };
    };

    const getAtlasOrigin = () => {
      const source = productMap.getBoundingClientRect();
      const target = atlasMapShell.getBoundingClientRect();
      return {
        x: source.left + source.width / 2 - (target.left + target.width / 2),
        y: source.top + source.height / 2 - (target.top + target.height / 2),
        scaleX: source.width / Math.max(1, target.width),
        scaleY: source.height / Math.max(1, target.height),
      };
    };

    const getSharedNameBaseWidth = () => {
      const currentScale = gsap.getProperty(sharedName, "scale") || 1;
      return sharedName.getBoundingClientRect().width / currentScale;
    };

    const getCommandGeometry = () => {
      const source = fixedCommandGrowthWord || commandGrowthWord;
      const sourceRect = source.getBoundingClientRect();
      return {
        x: sourceRect.left,
        y: sourceRect.top,
        scale: sourceRect.width / Math.max(1, getSharedNameBaseWidth()),
      };
    };

    const getProgressNameGeometry = () => {
      const targetRect = progressName.getBoundingClientRect();
      return {
        x: targetRect.left,
        y: targetRect.top,
        scale: targetRect.width / Math.max(1, getSharedNameBaseWidth()),
      };
    };

    renderProgress();
    const mm = gsap.matchMedia();
    mm.add({ desktop: "(min-width: 861px)", mobile: "(max-width: 860px)", reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
      const { desktop, reduce } = context.conditions;
      if (reduce) {
        progressState.value = 68;
        renderProgress();
        gsap.set(sourceFrame, { autoAlpha: 0 });
        gsap.set(destination, { autoAlpha: 1 });
        gsap.set(windowSource, { autoAlpha: 0 });
        gsap.set(windowFinal, { autoAlpha: 1 });
        gsap.set(windowFront, { autoAlpha: 0 });
        gsap.set(atlas, { autoAlpha: 1, backgroundColor: "#d8cbb7" });
        gsap.set([atlasHeading, atlasCopy], { autoAlpha: 1, y: 0 });
        atlas.classList.add("is-ready");
        gsap.set(veil, { autoAlpha: 0 });
        gsap.set([heading, orbitDecoration, traces, index], { autoAlpha: 0 });
        gsap.set(startrails, { autoAlpha: 0 });
        gsap.set(progressCard, { autoAlpha: 0 });
        gsap.set(sharedName, { autoAlpha: 0 });
        gsap.set(handoffBackdrop, { autoAlpha: 0 });
        return;
      }

      gsap.set(sourceFrame, { inset: 0, autoAlpha: 1, borderRadius: 0, boxShadow: "0 0 0 rgba(62,44,25,0)", filter: "blur(16px) saturate(.72) contrast(.92) brightness(.9)", scale: 1.045 });
      gsap.set(blueprint, { autoAlpha: 1 });
      gsap.set(destination, { autoAlpha: 0 });
      gsap.set(destinationCopy, { autoAlpha: 0, y: 14 });
      gsap.set(windowSource, { autoAlpha: 1, top: 0, left: 0, width: "100%", height: "100%", borderRadius: 0 });
      gsap.set(windowFinal, {
        autoAlpha: 0,
        clipPath: "inset(25.5% 54.8% 60% 29.9% round 5px)",
        scale: 1,
      });
      gsap.set(windowFront, { rotationY: 0, autoAlpha: 1, transformOrigin: "left center" });
      gsap.set(windowAtlasPage, { autoAlpha: 0 });
      gsap.set(pageShadow, { autoAlpha: 0, xPercent: 32 });
      gsap.set(atlas, { autoAlpha: 0, backgroundColor: "rgba(216,203,183,0)" });
      gsap.set([atlasHeading, atlasCopy], { autoAlpha: 0, y: 14 });
      atlas.classList.remove("is-ready");
      gsap.set(veil, { autoAlpha: 1 });
      gsap.set(heading, { autoAlpha: 0, y: 28 });
      gsap.set(progressCard, {
        autoAlpha: 0,
        x: () => -progressCard.offsetWidth / 2,
        y: () => -progressCard.offsetHeight / 2,
        scale: 1,
      });
      gsap.set(handoffBackdrop, { autoAlpha: 0 });
      gsap.set(progressName, { autoAlpha: 0 });
      gsap.set(progressPrefix, { autoAlpha: 0 });
      gsap.set(sharedName, { autoAlpha: 0, color: "#ecd4a3", textShadow: "0 0 16px rgba(236, 212, 163, 0.32), 0 0 48px rgba(201, 165, 106, 0.2)" });
      gsap.set(orbitDecoration, { autoAlpha: 0, scale: 0.72, rotation: -12 });
      gsap.set(traces, { autoAlpha: 0, scaleY: 0 });
      startrailState.progress = 0;
      resizeStartrails();
      gsap.set(startrails, { autoAlpha: 0 });
      gsap.set(index, { autoAlpha: 0, x: 12 });

      const enterTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: transitionSection,
          start: "top bottom",
          end: "top top",
          scrub: 0.65,
          invalidateOnRefresh: true,
          onEnter() {
            document.documentElement.classList.add("is-growth-handoff");
          },
          onEnterBack() {
            document.documentElement.classList.add("is-growth-handoff");
          },
          onLeave() {
            document.documentElement.classList.remove("is-growth-handoff");
          },
          onLeaveBack(self) {
            document.documentElement.classList.remove("is-growth-handoff");
            self.animation.progress(0);
          },
        },
      });
      enterTimeline
        .addLabel("clearCopy", 0)
        .addLabel("captureGrowth", 0)
        .addLabel("handoffGrowth", .36)
        .addLabel("showProgress", .48)
        .set(sharedName, {
          x: () => getCommandGeometry().x,
          y: () => getCommandGeometry().y,
          scale: () => getCommandGeometry().scale,
        }, "captureGrowth")
        .fromTo(sharedName, { autoAlpha: 0 }, { autoAlpha: 1, duration: .001, immediateRender: true }, "captureGrowth")
        .fromTo(
          [commandGrowthWord, fixedCommandGrowthWord].filter(Boolean),
          { autoAlpha: 1 },
          { autoAlpha: 0, duration: .001, immediateRender: false },
          "captureGrowth",
        )
        .fromTo(handoffBackdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: .08, immediateRender: false }, "clearCopy")
        .to([commandSlash, commandCopy, commandCaret, fixedCommandSlash, fixedCommandCopy, fixedCommandCaret].filter(Boolean), { autoAlpha: 0, duration: .3, ease: "power2.in" }, "clearCopy")
        .fromTo(growthAura, { autoAlpha: 1 }, { autoAlpha: 0, duration: .32, immediateRender: false }, "clearCopy")
        .to(sharedName, {
          x: () => getProgressNameGeometry().x,
          y: () => getProgressNameGeometry().y,
          duration: .44,
          ease: "power3.inOut",
        }, "handoffGrowth")
        .to(sharedName, {
          scale: () => getProgressNameGeometry().scale,
          color: "#b57b22",
          textShadow: "0 0 0 rgba(0,0,0,0)",
          duration: .18,
          ease: "power3.inOut",
        }, "handoffGrowth")
        .to(progressCard, { autoAlpha: 1, duration: .34, ease: "power2.out" }, "showProgress")
        .to(progressPrefix, { autoAlpha: 1, duration: .12, ease: "power2.out" }, .68)
        .to(progressName, { autoAlpha: 1, duration: .07 }, .78)
        .to(sharedName, { autoAlpha: 0, duration: .07 }, .78)
        .to({}, { duration: .12 });

      const growthTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: transitionSection,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate(self) {
            renderProgress();
            atlas.classList.toggle("is-ready", self.progress >= .92);
          },
        },
      });

      growthTimeline
        .addLabel("growthComplete", .54)
        .addLabel("shrinkWorkbench", .66)
        .addLabel("landProgress", .80)
        .addLabel("revealGrowth", .93)
        .addLabel("holdWorld", 1.10)
        .addLabel("turnAtlasPage", 1.25)
        .addLabel("holdAtlasPage", 1.57)
        .addLabel("liftAtlas", 1.72)
        .addLabel("atlasReady", 2.12)
        .to(handoffBackdrop, { autoAlpha: 0, duration: .12 }, 0)
        .to(heading, { autoAlpha: 1, y: 0, duration: .08, ease: "power2.out" }, 0)
        .to(orbitDecoration, { autoAlpha: 1, scale: 1, rotation: 0, duration: .1, ease: "power2.out" }, 0)
        .to(traces, { autoAlpha: .7, scaleY: 1, stagger: .012, duration: .08, ease: "power2.out" }, .01)
        .to(index, { autoAlpha: 1, x: 0, duration: .07 }, .02)
        .to(startrails, { autoAlpha: .78, duration: .12, ease: "power2.out" }, 0)
        .to(startrailState, { progress: 1, duration: .54, onUpdate: renderStartrails }, 0)
        .to(progressState, { value: 14, duration: .14, onUpdate: renderProgress }, 0)
        .to(orbitDecoration, { rotation: 54, scale: 1.06, duration: .32 }, 0)
        .to(progressState, { value: 31, duration: .16, onUpdate: renderProgress }, .14)
        .to(traces, { rotation: (traceIndex) => traceIndex % 2 ? -8 : 8, stagger: .025, duration: .16 }, .14)
        .to(progressState, { value: 49, duration: .18, onUpdate: renderProgress }, .3)
        .to(progressCard, { scale: 1.025, duration: .1, ease: "power2.out" }, .31)
        .to(progressCard, { scale: 1, duration: .09, ease: "power2.in" }, .41)
        .to(progressState, { value: 60, duration: .08, onUpdate: renderProgress }, .46)
        .to(progressState, { value: 68, duration: .06, onUpdate: renderProgress }, "growthComplete")
        .to(startrails, { autoAlpha: 0, duration: .14, ease: "power2.in" }, "growthComplete")
        .to(heading, { autoAlpha: 0, y: -48, duration: .14 }, .54)
        .to([orbitDecoration, traces, index], { autoAlpha: 0, duration: .14 }, .54)
        .to(destination, { autoAlpha: 1, duration: .08, ease: "power2.out" }, .62)
        .to(veil, { autoAlpha: 0, duration: .16 }, .62)
        .to(sourceFrame, {
          inset: () => {
            const target = getWindowGeometry();
            return `${target.top}px ${transitionStage.clientWidth - target.left - target.width}px ${transitionStage.clientHeight - target.top - target.height}px ${target.left}px`;
          },
          borderRadius: 4,
          boxShadow: "0 28px 70px rgba(62,44,25,.15)",
          scale: 1,
          duration: .12,
          ease: "power3.inOut",
        }, "shrinkWorkbench")
        .to(destinationCopy, { autoAlpha: 1, y: 0, stagger: .012, duration: .12, ease: "power2.out" }, .66)
        .to(sourceFrame, {
          filter: "blur(0px) saturate(1) contrast(1) brightness(1)",
          duration: .08,
          ease: "power2.out",
        }, "landProgress")
        .to(progressCard, {
          x: () => getBlueprintGeometry().x - window.innerWidth / 2 - progressCard.offsetWidth / 2,
          y: () => getBlueprintGeometry().y - window.innerHeight / 2 - progressCard.offsetHeight / 2,
          scaleX: () => getBlueprintGeometry().width / Math.max(1, progressCard.offsetWidth),
          scaleY: () => getBlueprintGeometry().height / Math.max(1, progressCard.offsetHeight),
          autoAlpha: 1,
          duration: .10,
          ease: "power3.inOut",
        }, "landProgress")
        // The landed source frame and windowSource are the same bitmap. Swap them
        // before revealing the generated work so the two layouts never crossfade.
        .set(sourceFrame, { autoAlpha: 0 }, "revealGrowth")
        .to(windowSource, {
          top: "2.4%",
          left: "16.6%",
          width: "68.8%",
          height: "95.2%",
          borderRadius: 5,
          duration: .122,
          ease: "power3.inOut",
        }, "revealGrowth+=.018")
        .set(windowFinal, { autoAlpha: 1 }, "revealGrowth")
        .to(windowFinal, {
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          duration: .14,
          ease: "power2.inOut",
        }, "revealGrowth")
        .to(progressCard, { autoAlpha: 0, scaleX: "*=.94", scaleY: "*=.94", duration: .07, ease: "power2.in" }, "revealGrowth+=.07")
        .set(windowSource, { autoAlpha: 0 }, "revealGrowth+=.14")
        .to({}, { duration: .15 }, "holdWorld")
        .set(progressCard, { autoAlpha: 0, visibility: "hidden" }, "turnAtlasPage")
        .set(atlas, { autoAlpha: 0, visibility: "hidden", pointerEvents: "none" }, "turnAtlasPage")
        .set(windowAtlasPage, { autoAlpha: 1 }, "turnAtlasPage")
        .to(destinationCopy, { autoAlpha: 0, y: -16, duration: .12, ease: "power2.in" }, "turnAtlasPage")
        .to(windowFront, { rotationY: -176, duration: .30, ease: "power3.inOut" }, "turnAtlasPage")
        .fromTo(pageShadow, { autoAlpha: 0, xPercent: 34 }, { autoAlpha: .62, xPercent: -24, duration: .15, ease: "power2.inOut" }, "turnAtlasPage")
        .to(pageShadow, { autoAlpha: 0, duration: .15, ease: "power2.inOut" }, "turnAtlasPage+=.15")
        .set(windowFront, { autoAlpha: 0 }, "holdAtlasPage")
        .to({}, { duration: .15 }, "holdAtlasPage")
        .set(atlas, { autoAlpha: 1, visibility: "visible" }, "liftAtlas")
        .set(atlasMapShell, {
          x: () => getAtlasOrigin().x,
          y: () => getAtlasOrigin().y,
          scaleX: () => getAtlasOrigin().scaleX,
          scaleY: () => getAtlasOrigin().scaleY,
          transformOrigin: "center",
        }, "liftAtlas")
        .to([document.querySelector(".growth-world-background"), document.querySelector(".growth-world-wash"), document.querySelector(".growth-world-grain")].filter(Boolean), { autoAlpha: 0, duration: .22, ease: "power2.in" }, "liftAtlas+=.04")
        .to(atlas, { backgroundColor: "#d8cbb7", duration: .23, ease: "power2.inOut" }, "liftAtlas+=.04")
        .to(productWindow, { autoAlpha: 0, duration: .10, ease: "power2.in" }, "liftAtlas+=.08")
        .to(atlasMapShell, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .34, ease: "power3.inOut" }, "liftAtlas")
        .to(atlasHeading, { autoAlpha: 1, y: 0, duration: .14, ease: "power2.out" }, "liftAtlas+=.27")
        .to(atlasCopy, { autoAlpha: 1, y: 0, duration: .14, ease: "power2.out" }, "liftAtlas+=.30")
        .to({}, { duration: .22 }, "atlasReady");
    });
  }

  function initAtlasInteraction() {
    const atlas = document.querySelector(".growth-continuum-atlas");
    const map = document.querySelector(".continuum-atlas-map");
    const hotspotSvg = document.querySelector(".continuum-atlas-hotspots");
    const highlights = [...document.querySelectorAll(".continuum-atlas-highlight")];
    const locator = document.querySelector(".continuum-atlas-locator");
    const pin = document.querySelector(".continuum-atlas-pin");
    const regionName = document.querySelector(".continuum-region-name");
    const regionDescription = document.querySelector(".continuum-region-description");
    if (!atlas || !map || !hotspotSvg) return;

    const metadata = {
      "western-bay": ["西南海湾", "海湾、孤岛与通向大陆腹地的水路。"],
      "central-ridge": ["中央山脉", "群峰横贯大陆，河流从山谷向四方延伸。"],
      "northern-forest": ["北部森林", "密林沿河谷生长，连接山地与湖区。"],
      "northern-highlands": ["北境高地", "高原与群峰构成大陆最北端的天然屏障。"],
      "eastern-lakes": ["东北湖区", "湖泊与支流交织，形成独立的水域网络。"],
      "southern-forest": ["东南森林", "南境林海覆盖丘陵，并延伸至海岸。"],
      "southern-coast": ["南部海岸与群岛", "曲折海岸与群岛展开通往远方的航线。"],
    };

    if (window.NOVELX_ATLAS_HOTSPOTS) {
      const namespace = "http://www.w3.org/2000/svg";
      Object.entries(window.NOVELX_ATLAS_HOTSPOTS).forEach(([region, pathData]) => {
        if (!metadata[region] || !pathData) return;
        const path = document.createElementNS(namespace, "path");
        path.classList.add("continuum-atlas-hotspot");
        path.dataset.region = region;
        path.setAttribute("d", pathData);
        path.setAttribute("tabindex", "0");
        path.setAttribute("aria-label", metadata[region][0]);
        hotspotSvg.append(path);
      });
    }

    const hotspots = [...document.querySelectorAll(".continuum-atlas-hotspot")];
    let activeRegion = "";
    let resetCall = null;

    const setRegion = (region = "") => {
      if (region === activeRegion || !regionName || !regionDescription) return;
      resetCall?.kill();
      resetCall = null;
      activeRegion = region;
      const hotspot = hotspots.find((item) => item.dataset.region === region);
      const target = highlights.find((item) => item.dataset.continuumRegion === region);
      gsap.to(highlights.filter((item) => item !== target), { autoAlpha: 0, duration: reduceMotion.matches ? 0 : .18, overwrite: "auto" });
      if (target) gsap.to(target, { autoAlpha: 1, duration: reduceMotion.matches ? 0 : .3, ease: "power2.out", overwrite: "auto" });
      const content = metadata[region] || ["完整大陆", "每一处地理，都能成为故事的起点。"];
      regionName.textContent = content[0];
      regionDescription.textContent = content[1];
      gsap.fromTo([regionName, regionDescription], { autoAlpha: .25, y: 6 }, { autoAlpha: 1, y: 0, duration: reduceMotion.matches ? 0 : .28, stagger: .035, overwrite: "auto" });
      gsap.to(map, { scale: region ? 1.008 : 1, duration: reduceMotion.matches ? 0 : .5, ease: "power2.out", overwrite: "auto" });
      if (pin && hotspot) {
        const bounds = hotspot.getBBox();
        gsap.to(pin, {
          autoAlpha: 1,
          x: ((bounds.x + bounds.width / 2) / 1448) * map.clientWidth,
          y: ((bounds.y + bounds.height / 2) / 1086) * map.clientHeight,
          duration: reduceMotion.matches ? 0 : .28,
          ease: "power3.out",
          overwrite: "auto",
        });
      } else if (pin) {
        gsap.to(pin, { autoAlpha: 0, duration: .16, overwrite: "auto" });
      }
    };

    hotspots.forEach((hotspot) => {
      const activate = () => setRegion(hotspot.dataset.region || "");
      hotspot.addEventListener("pointerenter", activate);
      hotspot.addEventListener("focus", activate);
    });
    map.addEventListener("pointerleave", () => {
      if (!activeRegion) return;
      resetCall?.kill();
      resetCall = gsap.delayedCall(.14, () => setRegion());
      gsap.to(locator, { autoAlpha: 0, duration: .18, overwrite: "auto" });
    });
    map.addEventListener("pointermove", (event) => {
      resetCall?.kill();
      resetCall = null;
      if (!atlas.classList.contains("is-ready") || !locator) return;
      const bounds = map.getBoundingClientRect();
      gsap.set(locator, { autoAlpha: .58, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    });

    gsap.set(highlights, { autoAlpha: 0 });
    gsap.set([locator, pin], { autoAlpha: 0 });
  }

  function initOcShowcase() {
    const sequence = document.querySelector(".oc-showcase-sequence");
    const stage = document.querySelector(".oc-showcase-stage");
    const track = document.querySelector(".oc-showcase-track");
    const intro = document.querySelector(".oc-showcase-intro");
    const connector = document.querySelector(".oc-showcase-connector");
    const connectorPaths = [...document.querySelectorAll(".oc-showcase-connector path")];
    const connectorOrnaments = [...document.querySelectorAll(".oc-showcase-connector > span")];
    const artwork = document.querySelector(".oc-showcase-artwork");
    const imageShell = document.querySelector(".oc-showcase-image-shell");
    const image = imageShell?.querySelector("img");
    const imageScan = document.querySelector(".oc-image-scan");
    const atmosphere = [...document.querySelectorAll(".oc-showcase-atmosphere > span")];
    const atlas = document.querySelector(".growth-continuum-atlas");
    const atlasMapShell = document.querySelector(".continuum-atlas-map-shell");
    const atlasCopy = document.querySelector(".continuum-atlas-copy");
    const atlasHeading = document.querySelector(".continuum-atlas-heading");
    if (!sequence || !stage || !track || !intro || !connector || !artwork || !imageShell || !image) return;

    const mm = gsap.matchMedia();
    mm.add({ motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
      const { reduce } = context.conditions;
      if (reduce) {
        gsap.set([intro, connector, artwork, imageShell], { autoAlpha: 1, x: 0, clipPath: "none" });
        return;
      }

      connectorPaths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      });
      gsap.set(connectorOrnaments, { autoAlpha: 0, scale: .45, transformOrigin: "center" });
      gsap.set(imageShell, { clipPath: "inset(0 100% 0 0)" });
      gsap.set(image, { scale: 1.045, xPercent: -1.4, transformOrigin: "center" });
      gsap.set(imageScan, { autoAlpha: 0, x: 0 });

      if (atlas && atlasMapShell) {
        gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sequence,
            start: "top bottom",
            end: "top top",
            scrub: .6,
            invalidateOnRefresh: true,
          },
        })
          .to(atlasMapShell, { xPercent: -9, scale: .96, autoAlpha: .28, duration: 1 }, 0)
          .to([atlasHeading, atlasCopy].filter(Boolean), { xPercent: -18, autoAlpha: 0, duration: .62 }, 0)
          .fromTo(stage, { autoAlpha: .25 }, { autoAlpha: 1, duration: 1, immediateRender: false }, 0);
      }

      const horizontalDistance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sequence,
          start: "top top",
          end: "bottom bottom",
          scrub: .85,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .addLabel("title", 0)
        .addLabel("trace", .16)
        .addLabel("reveal", .46)
        .to(track, { x: () => -horizontalDistance(), duration: 1 }, 0)
        .fromTo(intro, { autoAlpha: .2, x: 60 }, { autoAlpha: 1, x: 0, duration: .2, ease: "power2.out", immediateRender: false }, "title")
        .to(connectorPaths, { strokeDashoffset: 0, stagger: .045, duration: .34, ease: "power2.inOut" }, "trace")
        .to(connectorOrnaments, { autoAlpha: .86, scale: 1, stagger: .025, duration: .18, ease: "power2.out" }, "trace+=.08")
        .to(atmosphere, { rotation: (index) => index % 2 ? -24 : 18, xPercent: (index) => index % 2 ? -4 : 4, duration: 1 }, 0)
        .to(imageShell, { clipPath: "inset(0 0% 0 0)", duration: .3, ease: "power2.inOut" }, "reveal")
        .to(imageScan, { autoAlpha: .8, x: () => imageShell.clientWidth, duration: .3, ease: "power2.inOut" }, "reveal")
        .to(image, { scale: 1, xPercent: 0, duration: .46, ease: "power2.out" }, "reveal")
        .to(imageScan, { autoAlpha: 0, duration: .08 }, ">-.08")
        .fromTo(artwork.querySelector("figcaption"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .16, ease: "power2.out", immediateRender: false }, "reveal+=.2")
        .to({}, { duration: .12 });
    });
  }

  function initInspirationLibrary() {
    const sequence = document.querySelector(".inspiration-sequence");
    const stage = document.querySelector(".inspiration-stage");
    const heading = document.querySelector(".inspiration-heading");
    const keywords = [...document.querySelectorAll(".inspiration-keyword")];
    const bubbles = [...document.querySelectorAll(".idea-bubble")];
    const debris = [...document.querySelectorAll(".inspiration-debris > span")];
    const impactRings = [...document.querySelectorAll(".inspiration-impact i")];
    const ocArtwork = document.querySelector(".oc-showcase-artwork");
    const ocIndex = document.querySelector(".oc-showcase-index");
    if (!sequence || !stage || !heading || keywords.length !== 2 || !bubbles.length) return;

    keywords.forEach((keyword) => {
      const word = keyword.dataset.word || "";
      const clips = [
        "inset(0 0 82% 0)",
        "inset(17% 0 64% 0)",
        "inset(35% 0 46% 0)",
        "inset(53% 0 29% 0)",
        "inset(70% 0 13% 0)",
        "inset(86% 0 0 0)",
      ];
      clips.forEach((clip, index) => {
        const shard = document.createElement("span");
        shard.className = "keyword-shard";
        shard.textContent = word;
        shard.dataset.shard = String(index);
        shard.style.clipPath = clip;
        keyword.append(shard);
      });
    });

    const cores = [...document.querySelectorAll(".keyword-core")];
    const shards = [...document.querySelectorAll(".keyword-shard")];
    const mm = gsap.matchMedia();
    mm.add({ motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
      const { reduce } = context.conditions;
      if (reduce) {
        gsap.set(cores, { autoAlpha: .08 });
        gsap.set(shards, { autoAlpha: 0 });
        gsap.set(bubbles, { autoAlpha: 1, y: 0, xPercent: -50, yPercent: -50 });
        return;
      }

      const visibleBubbles = bubbles.filter((bubble) => getComputedStyle(bubble).display !== "none");
      gsap.set(stage, { autoAlpha: 1 });
      gsap.set(heading, { autoAlpha: 0, y: 12 });
      gsap.set(cores, { autoAlpha: 1 });
      gsap.set(shards, { autoAlpha: 0, x: 0, y: 0, rotation: 0 });
      gsap.set(impactRings, { autoAlpha: 0, width: 1, height: 1 });
      gsap.set(debris, { autoAlpha: 0, scale: .45 });
      visibleBubbles.forEach((bubble, index) => {
        gsap.set(bubble, {
          autoAlpha: 0,
          xPercent: -50,
          yPercent: -50,
          y: () => window.innerHeight * (.92 + (index % 4) * .15),
          rotation: index % 2 ? 9 : -8,
          scale: .72,
        });
      });

      if (ocArtwork) {
        gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sequence,
            start: "top bottom",
            end: "top top",
            scrub: .65,
            invalidateOnRefresh: true,
          },
        })
          .to(ocArtwork, { yPercent: -18, scale: .95, autoAlpha: .12, duration: 1 }, 0)
          .to(ocIndex, { autoAlpha: 0, duration: .45 }, 0)
          .fromTo(stage, { autoAlpha: .22 }, { autoAlpha: 1, duration: 1, immediateRender: false }, 0);
      }

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sequence,
          start: "top top",
          end: "bottom bottom",
          scrub: .9,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .addLabel("words", 0)
        .addLabel("impact", .18)
        .addLabel("break", .31)
        .addLabel("scatter", .48)
        .addLabel("field", .72)
        .to(heading, { autoAlpha: 1, y: 0, duration: .1, ease: "power2.out" }, "words")
        .fromTo(keywords[0], { xPercent: -5, autoAlpha: .35 }, { xPercent: 0, autoAlpha: 1, duration: .15, ease: "power2.out", immediateRender: false }, "words")
        .fromTo(keywords[1], { xPercent: 5, autoAlpha: .35 }, { xPercent: 0, autoAlpha: 1, duration: .15, ease: "power2.out", immediateRender: false }, "words+=.03")
        .to(visibleBubbles, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotation: (index, bubble) => Number.parseFloat(getComputedStyle(bubble).getPropertyValue("--r")) || 0,
          duration: .34,
          stagger: .018,
          ease: "power3.out",
        }, "impact")
        .to(impactRings, { autoAlpha: .65, width: (index) => 180 + index * 150, height: (index) => 180 + index * 150, stagger: .035, duration: .24, ease: "power2.out" }, "impact+=.07")
        .to(impactRings, { autoAlpha: 0, duration: .16 }, "break")
        .to(cores, { autoAlpha: 0, scaleY: 1.06, duration: .12, ease: "power2.in" }, "break")
        .set(shards, { autoAlpha: 1 }, "break")
        .to(shards, {
          x: (index) => ((index % 6) - 2.5) * (window.innerWidth < 861 ? 12 : 28) + (index < 6 ? -24 : 24),
          y: (index) => ((index % 3) - 1) * (window.innerWidth < 861 ? 34 : 58) + (index % 2 ? -22 : 26),
          rotation: (index) => (index % 2 ? 1 : -1) * (4 + (index % 5) * 2.2),
          autoAlpha: .16,
          duration: .24,
          stagger: .008,
          ease: "power3.out",
        }, "break")
        .to(debris, { autoAlpha: .78, scale: 1, stagger: .018, duration: .2, ease: "power2.out" }, "scatter")
        .to(shards, { y: "-=18", autoAlpha: .09, duration: .34 }, "scatter")
        .to(visibleBubbles, { y: (index) => index % 2 ? -8 : 7, duration: .26, stagger: .008, ease: "power1.inOut" }, "field")
        .to({}, { duration: .2 });
    });
  }

  function initHeritageLoop() {
    const sequence = document.querySelector(".heritage-sequence");
    const stage = document.querySelector(".heritage-stage");
    const paper = document.querySelector(".heritage-paper");
    const intro = document.querySelector(".heritage-intro");
    const product = document.querySelector(".heritage-product");
    const productImage = product?.querySelector("img");
    const cards = [...document.querySelectorAll(".heritage-card")];
    const steps = document.querySelector(".heritage-steps");
    const index = document.querySelector(".heritage-index");
    const sharedPearl = document.querySelector(".heritage-pearl-shared");
    const loop = document.querySelector(".heritage-loop");
    const loopScene = document.querySelector(".heritage-loop-scene");
    const loopShade = document.querySelector(".heritage-loop-shade");
    const loopBird = document.querySelector(".heritage-loop-bird");
    const loopLogo = document.querySelector(".heritage-loop-logo");
    const loopCopy = document.querySelector(".heritage-loop-copy");
    const loopIndex = document.querySelector(".heritage-loop-index");
    const returnControl = document.querySelector(".heritage-return");
    const returnLine = returnControl?.querySelector(".closing-return-line");
    const returnDrop = returnControl?.querySelector(".closing-return-drop");
    const returnChevron = returnControl?.querySelector(".closing-return-chevron");
    const returnOrnaments = [...(returnControl?.querySelectorAll(".closing-return-ornament") || [])];
    const inspirationStage = document.querySelector(".inspiration-stage");
    const inspirationPieces = [...document.querySelectorAll(".idea-bubble, .inspiration-heading, .inspiration-debris > span, .keyword-shard")];
    if (!sequence || !stage || !paper || !intro || !product || !productImage || cards.length !== 3 || !steps || !sharedPearl || !loop || !loopScene) return;

    const mm = gsap.matchMedia();
    mm.add({ motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
      const { reduce } = context.conditions;
      if (reduce) {
        gsap.set(loop, { autoAlpha: 1 });
        gsap.set([loopScene, loopShade, loopBird, loopLogo, loopCopy, loopIndex, returnControl].filter(Boolean), { autoAlpha: 1 });
        return;
      }

      const sharedPearlImage = sharedPearl.querySelector("img");
      const getPearlStart = () => {
        const productWidth = productImage.offsetWidth;
        const productHeight = productImage.offsetHeight;
        return {
          x: product.offsetLeft + productImage.offsetLeft + productWidth * .192,
          y: product.offsetTop + productImage.offsetTop + productHeight * .578,
          width: productWidth * .143,
          height: productHeight * .137,
        };
      };
      const getCardPose = (cardIndex) => {
        const mobile = window.innerWidth < 861;
        const poses = mobile
          ? [
              { x: 0, y: window.innerHeight * .43, rotation: -5.5 },
              { x: window.innerWidth * .19, y: window.innerHeight * .5, rotation: 5 },
              { x: window.innerWidth * .07, y: window.innerHeight * .59, rotation: -1.8 },
            ]
          : [
              { x: 34, y: window.innerHeight * .37, rotation: -6.5 },
              { x: Math.min(window.innerWidth * .13, 190), y: window.innerHeight * .47, rotation: 5.2 },
              { x: Math.min(window.innerWidth * .055, 82), y: window.innerHeight * .57, rotation: -2.4 },
            ];
        return poses[cardIndex];
      };
      let activeCard = null;
      const settleCards = (focusCard = activeCard) => {
        cards.forEach((card, cardIndex) => {
          const pose = getCardPose(cardIndex);
          const focused = card === focusCard;
          const focusIndex = focusCard ? cards.indexOf(focusCard) : -1;
          const spread = focusCard && !focused ? (cardIndex < focusIndex ? -18 : 22) : 0;
          card.classList.toggle("is-active", focused);
          gsap.to(card, {
            x: pose.x + spread,
            y: pose.y + (focused ? -24 : 0),
            rotation: focused ? 0 : pose.rotation,
            rotationX: 0,
            rotationY: 0,
            scale: focused ? 1.045 : 1,
            zIndex: focused ? 20 : 5 + cardIndex,
            duration: .5,
            ease: "back.out(1.35)",
            overwrite: "auto",
          });
        });
      };
      const canInteract = () => sequence.classList.contains("is-card-deck-ready");
      cards.forEach((card) => {
        const focusCard = () => { if (canInteract()) settleCards(card); };
        card.addEventListener("pointerenter", focusCard);
        card.addEventListener("focus", focusCard);
        card.addEventListener("pointermove", (event) => {
          if (!canInteract() || (activeCard && activeCard !== card)) return;
          const rect = card.getBoundingClientRect();
          const nx = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1) - .5;
          const ny = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1) - .5;
          gsap.to(card, { rotationY: nx * 6, rotationX: ny * -5, duration: .22, ease: "power2.out", overwrite: "auto" });
        });
        card.addEventListener("pointerleave", () => settleCards());
        card.addEventListener("blur", () => settleCards());
        card.addEventListener("click", () => {
          if (!canInteract()) return;
          activeCard = activeCard === card ? null : card;
          settleCards();
        });
      });
      const getPearlTarget = () => {
        const sourceWidth = 1672;
        const sourceHeight = 941;
        const scale = Math.max(window.innerWidth / sourceWidth, window.innerHeight / sourceHeight);
        const renderedWidth = sourceWidth * scale;
        const renderedHeight = sourceHeight * scale;
        const cropX = (window.innerWidth - renderedWidth) / 2;
        const cropY = (window.innerHeight - renderedHeight) / 2;
        const mobile = window.innerWidth < 861;
        const sourceRect = mobile
          ? { x: 1200, y: 470, width: 472, height: 326 }
          : { x: 1207, y: 472, width: 465, height: 326 };
        const x = cropX + sourceRect.x * scale;
        const y = cropY + sourceRect.y * scale;
        return {
          x,
          y,
          width: sourceRect.width * scale,
          height: sourceRect.height * scale,
        };
      };

      gsap.set([intro, product, steps, index], { autoAlpha: 0 });
      gsap.set(intro, { x: -28 });
      gsap.set(product, { xPercent: 8, scale: .975 });
      gsap.set(steps, { y: 12 });
      gsap.set(cards, { autoAlpha: 0, x: 0, y: () => window.innerHeight * 1.18, rotation: (cardIndex) => [-8, 7, -4][cardIndex], scale: .92 });
      gsap.set(sharedPearl, {
        autoAlpha: 0,
        x: () => getPearlStart().x,
        y: () => getPearlStart().y,
        width: () => getPearlStart().width,
        height: () => getPearlStart().height,
        scaleX: 1,
        scaleY: 1,
      });
      gsap.set(sharedPearlImage, { scale: 1, xPercent: 0, yPercent: 0 });
      gsap.set(loop, { autoAlpha: 0 });
      gsap.set(loopScene, { autoAlpha: 1, scale: 1.025 });
      gsap.set([loopShade, loopBird, loopLogo, loopCopy, loopIndex, returnControl].filter(Boolean), { autoAlpha: 0 });

      if (inspirationStage) {
        gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sequence,
            start: "top bottom",
            end: "top top",
            scrub: .7,
            invalidateOnRefresh: true,
          },
        })
          .to(inspirationPieces, { y: (pieceIndex) => -window.innerHeight * (.18 + (pieceIndex % 5) * .045), autoAlpha: 0, stagger: .003, duration: .78 }, 0)
          .to(inspirationStage, { autoAlpha: .08, duration: 1 }, 0)
          .fromTo(stage, { autoAlpha: .15 }, { autoAlpha: 1, duration: 1, immediateRender: false }, 0);
      }

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sequence,
          start: "top top",
          end: "bottom bottom",
          scrub: .9,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const deckReady = self.progress > .24 && self.progress < .57;
            sequence.classList.toggle("is-card-deck-ready", deckReady);
            if (!deckReady) activeCard = null;
          },
        },
      });

      timeline
        .addLabel("product", 0)
        .addLabel("cards", .18)
        .addLabel("pearl", 2.08)
        .addLabel("handoff", 2.48)
        .addLabel("opening", 3.42)
        .to(product, { autoAlpha: 1, xPercent: 0, scale: 1, duration: .3, ease: "power3.out" }, "product")
        .to(intro, { autoAlpha: 1, x: 0, duration: .24, ease: "power3.out" }, "product+=.12")
        .to(steps, { autoAlpha: 1, y: 0, duration: .2, ease: "power2.out" }, "product+=.2")
        .to(index, { autoAlpha: 1, duration: .18 }, "product+=.2");

      cards.forEach((card, cardIndex) => {
        const start = .25 + cardIndex * .5;
        timeline
          .to(card, { autoAlpha: 1, duration: .08 }, start)
          .to(card, {
            x: () => getCardPose(cardIndex).x,
            y: () => getCardPose(cardIndex).y,
            rotation: () => getCardPose(cardIndex).rotation,
            scale: 1,
            duration: .46,
            ease: "power3.out",
          }, start);
      });

      timeline
        .to(sharedPearl, { autoAlpha: 1, duration: .12, ease: "power1.out" }, "handoff")
        .to(cards, { autoAlpha: 0, duration: .34, stagger: .018, ease: "power1.inOut" }, "handoff+=.16")
        .to([product, intro, steps, index], { autoAlpha: 0, duration: .42, stagger: .012, ease: "power1.inOut" }, "handoff+=.18")
        .to(paper, { autoAlpha: 0, duration: .58, ease: "power1.inOut" }, "handoff+=.2")
        .to(sharedBrand, { autoAlpha: 0, duration: .24, ease: "power1.inOut" }, "handoff+=.2")
        .to(loop, { autoAlpha: 1, duration: .76, ease: "power1.inOut" }, "handoff+=.24")
        .to(sharedPearl, {
          x: () => getPearlTarget().x,
          y: () => getPearlTarget().y,
          scaleX: () => getPearlTarget().width / getPearlStart().width,
          scaleY: () => getPearlTarget().height / getPearlStart().height,
          duration: .94,
          ease: "power3.inOut",
        }, "handoff+=.14")
        .to(sharedPearlImage, {
          keyframes: [
            { scale: 1.07, xPercent: 2.5, yPercent: -.5, duration: .46, ease: "power2.inOut" },
            { scale: 1.18, xPercent: 6.5, yPercent: 0, duration: .48, ease: "power3.inOut" },
          ],
        }, "handoff+=.14")
        .to(loopScene, { scale: 1.01, duration: .94, ease: "power2.inOut" }, "handoff+=.24")
        .to(sharedPearl, { autoAlpha: 0, duration: .18, ease: "power3.out" }, "handoff+=.9")
        .to(loopShade, { autoAlpha: 1, duration: .3 }, "opening+=.02")
        .to([loopBird, loopLogo], { autoAlpha: 1, y: 0, duration: .24, stagger: .035, ease: "power3.out" }, "opening+=.2")
        .fromTo(loopCopy, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: .34, ease: "power3.out", immediateRender: false }, "opening+=.27")
        .to(loopIndex, { autoAlpha: 1, duration: .18 }, "opening+=.37")
        .to(returnControl, { autoAlpha: 1, y: 0, duration: .28, ease: "power3.out" }, "opening+=.46")
        .to({}, { duration: .64 });

      const returnLoop = returnControl && returnLine && returnDrop && returnChevron
        ? gsap.timeline({ repeat: -1, repeatDelay: .52 })
          .set(returnLine, { autoAlpha: .18, scaleY: 0, transformOrigin: "center top" })
          .set(returnDrop, { autoAlpha: 0, y: 0 })
          .set(returnChevron, { autoAlpha: 0, y: 0 })
          .set(returnOrnaments, { autoAlpha: 0, scale: .45, rotation: -8 })
          .to(returnLine, { autoAlpha: 1, scaleY: 1, duration: .82, ease: "power2.inOut" }, 0)
          .to(returnDrop, { autoAlpha: .92, duration: .16 }, .08)
          .to(returnOrnaments, { autoAlpha: .82, scale: 1, rotation: 0, duration: .46, stagger: .09, ease: "power2.out" }, .14)
          .to(returnDrop, { y: 43, duration: .9, ease: "power2.in" }, .1)
          .to(returnChevron, { autoAlpha: 1, y: 4, duration: .32, ease: "power2.out" }, .64)
          .to([returnDrop, returnChevron, returnOrnaments], { autoAlpha: 0, duration: .3 }, 1.02)
          .to(returnLine, { autoAlpha: .18, scaleY: 0, transformOrigin: "center bottom", duration: .44 }, 1.02)
        : null;

      const onReturn = (event) => {
        event.preventDefault();
        history.scrollRestoration = "manual";
        window.location.assign(`./redesign-v2.html?restart=${Date.now()}#opening`);
      };
      returnControl?.addEventListener("click", onReturn);

      return () => {
        returnLoop?.kill();
        returnControl?.removeEventListener("click", onReturn);
        sequence.classList.remove("is-card-deck-ready");
      };
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
  initGrowthHandoff(orbit);
  initAgentGrowthTransition();
  initAtlasInteraction();
  initOcShowcase();
  initInspirationLibrary();
  initHeritageLoop();
  window.addEventListener("load", () => {
    orbit?.render();
    ScrollTrigger.refresh();
  }, { once: true });
})();
