(() => {
  const commandCopy = document.querySelector(".command-copy");
  const sourceText = commandCopy?.dataset.text || commandCopy?.textContent || "";

  function splitCommand() {
    if (!commandCopy || !sourceText) return [];

    commandCopy.textContent = "";
    commandCopy.setAttribute("aria-label", sourceText);

    return Array.from(sourceText).map((character) => {
      const span = document.createElement("span");
      span.className = "command-char";
      span.setAttribute("aria-hidden", "true");
      span.textContent = character === " " ? "\u00a0" : character;
      commandCopy.appendChild(span);
      return span;
    });
  }

  const commandChars = splitCommand();
  const storyChars = Array.from(document.querySelectorAll(".story-title-char"));
  const storyArcPath = document.querySelector(".story-arc-path");
  const storyContinuumHaze = document.querySelector(".story-continuum-haze");
  const storyContinuumOrnaments = Array.from(
    document.querySelectorAll(".story-continuum-ornaments > *"),
  );

  function setupWorldGraph() {
    const data = window.GRAY_TIDE_GRAPH_DATA;
    const canvas = document.querySelector("#world-graph-canvas");
    const svg = document.querySelector("#world-graph-svg");
    const edgeLayer = document.querySelector("#world-graph-edges");
    const nodeLayer = document.querySelector("#world-graph-nodes");
    const clusterLayer = document.querySelector("#world-graph-clusters");
    const inspector = document.querySelector("#world-graph-inspector");
    const caption = document.querySelector("#world-graph-caption");
    const search = document.querySelector("#world-graph-search");
    const reset = document.querySelector(".world-graph-reset");

    if (!data || !canvas || !svg || !edgeLayer || !nodeLayer || !clusterLayer || !inspector) {
      return null;
    }

    const width = 1000;
    const height = 620;
    const clusterIndex = new Map(data.clusters.map((cluster, index) => [cluster, index]));
    const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
    const groupedNodes = new Map(data.clusters.map((cluster) => [cluster, []]));
    const positions = new Map();
    const nodeElements = new Map();
    const edgeElements = new Map();
    const neighbors = new Map(data.nodes.map((node) => [node.id, new Set()]));
    let selectedId = null;
    let hoverId = null;
    let searchQuery = "";

    data.nodes.forEach((node) => groupedNodes.get(node.cluster)?.push(node));
    data.edges.forEach((edge) => {
      neighbors.get(edge.source)?.add(edge.target);
      neighbors.get(edge.target)?.add(edge.source);
    });

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");

    data.clusters.forEach((cluster, index) => {
      const label = document.createElement("span");
      label.className = "world-graph-cluster";
      label.style.left = `${12 + index * 19}%`;
      label.textContent = cluster;
      clusterLayer.appendChild(label);

      const group = groupedNodes.get(cluster) || [];
      group.forEach((node, nodeIndex) => {
        const x = 120 + index * 190;
        const y = 62 + (nodeIndex * (height - 124)) / Math.max(1, group.length - 1);
        positions.set(node.id, { x, y });
      });
    });

    function edgePath(source, target, edgeIndex) {
      const sameColumn = Math.abs(source.x - target.x) < 1;
      if (sameColumn) {
        const bend = 26 + (edgeIndex % 4) * 10;
        const direction = edgeIndex % 2 ? -1 : 1;
        return `M ${source.x} ${source.y} C ${source.x + bend * direction} ${source.y}, ${target.x + bend * direction} ${target.y}, ${target.x} ${target.y}`;
      }

      const delta = target.x - source.x;
      const control = Math.max(42, Math.abs(delta) * 0.42) * Math.sign(delta);
      return `M ${source.x} ${source.y} C ${source.x + control} ${source.y}, ${target.x - control} ${target.y}, ${target.x} ${target.y}`;
    }

    data.edges.forEach((edge, index) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("world-graph-edge");
      path.dataset.edgeId = edge.id;
      path.dataset.source = edge.source;
      path.dataset.target = edge.target;
      path.dataset.kind = edge.kind;
      path.setAttribute("d", edgePath(source, target, index));
      edgeLayer.appendChild(path);
      edgeElements.set(edge.id, path);
    });

    data.nodes.forEach((node) => {
      const position = positions.get(node.id);
      if (!position) return;

      const button = document.createElement("button");
      const name = document.createElement("strong");
      const type = document.createElement("small");
      button.type = "button";
      button.className = "world-graph-node";
      button.dataset.nodeId = node.id;
      button.style.left = `${(position.x / width) * 100}%`;
      button.style.top = `${(position.y / height) * 100}%`;
      button.setAttribute("aria-label", `${node.label}，${node.cluster}，${node.type}`);
      name.textContent = node.label;
      type.textContent = node.type;
      button.append(name, type);
      nodeLayer.appendChild(button);
      nodeElements.set(node.id, button);
    });

    function relationText(edge) {
      return edge.label || "关系待补充";
    }

    function relationsFor(nodeId) {
      return data.edges
        .filter((edge) => edge.source === nodeId || edge.target === nodeId)
        .sort((a, b) => Number(Boolean(b.label)) - Number(Boolean(a.label)));
    }

    function renderInspector(nodeId) {
      const node = nodeById.get(nodeId);
      if (!node) return;

      const kicker = document.createElement("p");
      const title = document.createElement("h3");
      const type = document.createElement("span");
      const summary = document.createElement("p");
      const source = document.createElement("div");
      const sourceLabel = document.createElement("span");
      const sourcePath = document.createElement("code");
      const relations = document.createElement("div");
      const relationHeading = document.createElement("strong");

      kicker.className = "world-graph-inspector-kicker";
      kicker.textContent = node.cluster;
      title.textContent = node.label;
      type.className = "world-graph-inspector-type";
      type.textContent = node.type;
      summary.className = "world-graph-inspector-summary";
      summary.textContent = node.summary;
      source.className = "world-graph-source";
      sourceLabel.textContent = "SOURCE ARCHIVE";
      sourcePath.textContent = node.path;
      source.append(sourceLabel, sourcePath);
      relations.className = "world-graph-relations";
      relationHeading.textContent = `关系脉络 ${relationsFor(nodeId).length}`;
      relations.appendChild(relationHeading);

      relationsFor(nodeId).forEach((edge) => {
        const neighborId = edge.source === nodeId ? edge.target : edge.source;
        const neighbor = nodeById.get(neighborId);
        if (!neighbor) return;

        const relation = document.createElement("button");
        const relationName = document.createElement("span");
        const relationMeta = document.createElement("small");
        relation.type = "button";
        relation.className = "world-graph-relation";
        relationName.textContent = neighbor.label;
        relationMeta.textContent = `${edge.source === nodeId ? "影响" : "源自"} · ${relationText(edge)}`;
        relation.append(relationName, relationMeta);
        relation.addEventListener("click", () => selectNode(neighborId, true));
        relations.appendChild(relation);
      });

      inspector.replaceChildren(kicker, title, type, summary, source, relations);
    }

    function updateVisualState() {
      const focusId = hoverId || selectedId;
      const relatedIds = focusId ? neighbors.get(focusId) || new Set() : new Set();
      const normalizedQuery = searchQuery.trim().toLocaleLowerCase("zh-CN");
      const matches = new Set(
        normalizedQuery
          ? data.nodes
              .filter((node) => `${node.label}${node.type}${node.cluster}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery))
              .map((node) => node.id)
          : [],
      );

      nodeElements.forEach((element, nodeId) => {
        const inFocus = !focusId || nodeId === focusId || relatedIds.has(nodeId);
        const matchesSearch = !normalizedQuery || matches.has(nodeId);
        element.classList.toggle("is-selected", nodeId === selectedId);
        element.classList.toggle("is-related", Boolean(focusId) && relatedIds.has(nodeId));
        element.classList.toggle("is-search-match", normalizedQuery.length > 0 && matches.has(nodeId));
        element.classList.toggle("is-dimmed", !inFocus || !matchesSearch);
      });

      data.edges.forEach((edge) => {
        const element = edgeElements.get(edge.id);
        if (!element) return;
        const active = Boolean(focusId) && (edge.source === focusId || edge.target === focusId);
        const searchVisible = !normalizedQuery || matches.has(edge.source) || matches.has(edge.target);
        element.classList.toggle("is-active", active);
        element.classList.toggle("is-dimmed", (Boolean(focusId) && !active) || !searchVisible);
      });

      if (!caption) return;
      if (focusId) {
        const node = nodeById.get(focusId);
        caption.textContent = node ? `${node.label} · ${relationsFor(focusId).length} 条关系` : "";
      } else if (normalizedQuery) {
        caption.textContent = matches.size ? `找到 ${matches.size} 个相关实体` : "没有匹配的世界实体";
      } else {
        caption.textContent = "选择一个节点，查看它如何影响世界。";
      }
    }

    function selectNode(nodeId, moveFocus = false) {
      selectedId = nodeId;
      hoverId = null;
      renderInspector(nodeId);
      updateVisualState();
      if (moveFocus) nodeElements.get(nodeId)?.focus({ preventScroll: true });
    }

    nodeElements.forEach((button, nodeId) => {
      button.addEventListener("pointerenter", () => {
        hoverId = nodeId;
        updateVisualState();
      });
      button.addEventListener("pointerleave", () => {
        hoverId = null;
        updateVisualState();
      });
      button.addEventListener("focus", () => {
        hoverId = nodeId;
        updateVisualState();
      });
      button.addEventListener("blur", () => {
        hoverId = null;
        updateVisualState();
      });
      button.addEventListener("click", () => selectNode(nodeId));
    });

    search?.addEventListener("input", () => {
      searchQuery = search.value;
      updateVisualState();
    });

    reset?.addEventListener("click", () => {
      selectedId = null;
      hoverId = null;
      searchQuery = "";
      if (search) search.value = "";
      inspector.innerHTML = `
        <div class="world-graph-inspector-empty">
          <span aria-hidden="true">✦</span>
          <p>选择一个节点</p>
          <small>它的来源、摘要与因果邻域会在这里展开。</small>
        </div>
      `;
      updateVisualState();
    });

    updateVisualState();

    return {
      stage: document.querySelector(".world-graph-stage"),
      heading: document.querySelector(".world-graph-heading"),
      toolbar: document.querySelector(".world-graph-toolbar"),
      legend: document.querySelector(".world-graph-legend"),
      inspector,
      clusters: Array.from(clusterLayer.children),
      nodes: Array.from(nodeElements.values()),
      edges: Array.from(edgeElements.values()),
    };
  }

  const worldGraph = setupWorldGraph();
  const closingReturn = document.querySelector(".closing-return");

  if (!window.gsap || !window.ScrollTrigger) {
    document.body.classList.add("no-gsap");
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  let storyArcIntroOffset = 0;
  if (storyArcPath) {
    const storyArcLength = storyArcPath.getTotalLength();
    const introMeasurePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    introMeasurePath.setAttribute("d", storyArcPath.dataset.introPath || "");
    introMeasurePath.setAttribute("fill", "none");
    introMeasurePath.setAttribute("stroke", "none");
    storyArcPath.ownerSVGElement?.append(introMeasurePath);
    const storyArcIntroLength = introMeasurePath.getTotalLength();
    introMeasurePath.remove();
    storyArcIntroOffset = Math.max(0, storyArcLength - storyArcIntroLength);
    gsap.set(storyArcPath, {
      strokeDasharray: storyArcLength,
      strokeDashoffset: storyArcLength,
    });
    gsap.set(storyContinuumHaze, {
      strokeDasharray: storyArcLength,
      strokeDashoffset: storyArcLength,
    });
  }

  const journeyCue = document.querySelector(".journey-cue");
  const journeyLine = document.querySelector(".journey-line");
  const journeyDrop = document.querySelector(".journey-drop");
  const journeyChevron = document.querySelector(".journey-chevron");
  const journeyOrnaments = Array.from(document.querySelectorAll(".journey-ornament"));
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const heroOc = document.querySelector(".hero-oc");
  const ocDefault = heroOc?.querySelector(".oc-default");
  const ocExpanded = heroOc?.querySelector(".oc-expanded");
  const ocRollTrack = heroOc?.querySelector(".oc-roll-track");
  const ocWorld = ocRollTrack?.lastElementChild;
  const ocGlitchLayers = Array.from(heroOc?.querySelectorAll(".oc-glitch") || []);
  let ocAutoTimer = null;

  if (heroOc && ocDefault && ocExpanded && ocRollTrack && ocWorld && ocGlitchLayers.length) {
    const ocTargets = [heroOc, ocDefault, ocExpanded, ocRollTrack, ocWorld, ...ocGlitchLayers];
    const ocCooldownMs = 650;
    const ocLeaveGraceMs = 180;
    const ocDefaultHoldMs = 4000;
    const ocWorldHoldSeconds = 1.2;
    let ocExpandedState = false;
    let ocAutoCycleInProgress = false;
    let ocInteractionTimeline = null;
    let ocIntentTimer = null;
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
        filter: expanded
          ? "drop-shadow(0 0.035em 0.055em rgba(137, 88, 18, 0.26))"
          : "drop-shadow(0 0 0 rgba(137, 88, 18, 0))",
      });
      gsap.set(ocRollTrack, {
        yPercent: expanded ? -50 : 0,
        y: expanded ? "-0.02em" : 0,
      });
      gsap.set(ocGlitchLayers, { x: 0, autoAlpha: 0, clipPath: "inset(0% 0 0% 0)" });
    };

    const showExpandedOc = (autoRestore = false) => {
      if (ocExpandedState) return;
      ocExpandedState = true;
      ocInteractionTimeline?.kill();
      gsap.killTweensOf(ocTargets);

      if (reduceMotionQuery.matches) {
        resetOc(true);
        return;
      }

      setGlitchText("OC");
      gsap.set(ocRollTrack, { yPercent: 0, y: 0 });
      gsap.set(ocExpanded, { autoAlpha: 0 });
      gsap.set(ocWorld, {
        backgroundPosition: "100% 0%",
        filter: "drop-shadow(0 0 0 rgba(137, 88, 18, 0))",
      });

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
        .fromTo(
          ocGlitchLayers[0],
          { x: -3, clipPath: "inset(8% 0 58% 0)" },
          { x: 5, duration: 0.09, ease: "power1.inOut" },
          "glitchIn",
        )
        .fromTo(
          ocGlitchLayers[1],
          { x: 3, clipPath: "inset(62% 0 7% 0)" },
          { x: -5, duration: 0.09, ease: "power1.inOut" },
          "glitchIn",
        )
        .add(() => setGlitchText("原创角色"), "glitchIn+=0.08")
        .to(ocDefault, { autoAlpha: 0, duration: 0.08 }, "glitchIn+=0.07")
        .to(heroOc, { width: getOcExpandedWidth, duration: 0.38, ease: "power3.out" }, "glitchIn+=0.08")
        .to(ocExpanded, { autoAlpha: 1, duration: 0.2, ease: "power2.out" }, "glitchIn+=0.17")
        .to(ocGlitchLayers[0], { x: -2, duration: 0.07, ease: "none" }, "glitchIn+=0.1")
        .to(ocGlitchLayers[1], { x: 3, duration: 0.07, ease: "none" }, "glitchIn+=0.1")
        .to(ocGlitchLayers, { x: 0, autoAlpha: 0, duration: 0.13, ease: "power1.out" }, "glitchIn+=0.19")
        .addLabel("wordRoll", "glitchIn+=1.72")
        .to(ocRollTrack, { yPercent: -50, y: "-0.02em", duration: 0.56, ease: "power3.inOut" }, "wordRoll")
        .fromTo(
          ocWorld,
          {
            backgroundPosition: "100% 0%",
            filter: "drop-shadow(0 0 0 rgba(137, 88, 18, 0))",
          },
          {
            backgroundPosition: "0% 0%",
            filter: "drop-shadow(0 0.035em 0.055em rgba(137, 88, 18, 0.26))",
            duration: 0.62,
            ease: "power2.out",
          },
          "wordRoll+=0.12",
        )
        .to({}, { duration: ocWorldHoldSeconds });
    };

    const restoreDefaultOc = () => {
      if (!ocExpandedState) return;
      ocExpandedState = false;
      ocInteractionTimeline?.kill();
      gsap.killTweensOf(ocTargets);

      if (reduceMotionQuery.matches) {
        resetOc(false);
        return;
      }

      setGlitchText("原创世界");
      ocInteractionTimeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          resetOc(false);
          if (ocAutoCycleInProgress) {
            ocAutoCycleInProgress = false;
            scheduleAutomaticOcCycle();
          }
        },
      });

      ocInteractionTimeline
        .addLabel("glitchOut", 0)
        .set(ocGlitchLayers, { autoAlpha: 1 }, "glitchOut")
        .fromTo(
          ocGlitchLayers[0],
          { x: 4, clipPath: "inset(12% 0 54% 0)" },
          { x: -4, duration: 0.1, ease: "power1.inOut" },
          "glitchOut",
        )
        .fromTo(
          ocGlitchLayers[1],
          { x: -3, clipPath: "inset(61% 0 8% 0)" },
          { x: 5, duration: 0.1, ease: "power1.inOut" },
          "glitchOut",
        )
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
      const cooldownRemaining = Math.max(0, ocCooldownUntil - performance.now());
      const wait = Math.max(graceMs, cooldownRemaining);

      ocIntentTimer = window.setTimeout(() => {
        ocIntentTimer = null;
        const interactionActive = ocPointerInside || ocKeyboardFocus;
        if (expanded !== interactionActive || expanded === ocExpandedState) return;

        ocCooldownUntil = performance.now() + ocCooldownMs;
        if (expanded) showExpandedOc();
        else restoreDefaultOc();
      }, wait);
    };

    const playAutomaticOcCycle = () => {
      ocAutoTimer = null;
      const opening = heroOc.closest(".opening");
      const rect = opening?.getBoundingClientRect();
      const openingVisible = rect && rect.bottom > 0 && rect.top < window.innerHeight;
      const interactionActive = ocPointerInside || ocKeyboardFocus;

      if (
        document.visibilityState !== "visible" ||
        !openingVisible ||
        interactionActive ||
        ocExpandedState ||
        ocInteractionTimeline?.isActive() ||
        reduceMotionQuery.matches
      ) {
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

    heroOc.addEventListener("pointerenter", () => {
      ocPointerInside = true;
      scheduleOcState(true);
    });

    heroOc.addEventListener("pointerleave", () => {
      ocPointerInside = false;
      scheduleOcState(false, ocLeaveGraceMs);
    });

    heroOc.addEventListener("focus", () => {
      ocKeyboardFocus = heroOc.matches(":focus-visible");
      if (ocKeyboardFocus) scheduleOcState(true);
    });

    heroOc.addEventListener("blur", () => {
      ocKeyboardFocus = false;
      if (!ocPointerInside) scheduleOcState(false, ocLeaveGraceMs);
    });
  }

  journeyCue?.addEventListener("click", (event) => {
    const destination = document.querySelector(journeyCue.getAttribute("href"));
    if (!destination) return;

    event.preventDefault();
    destination.scrollIntoView({
      behavior: reduceMotionQuery.matches ? "auto" : "smooth",
      block: "start",
    });
  });

  const orbitReveal = document.querySelector(".orbit-reveal");

  if (orbitReveal) {
    const length = orbitReveal.getTotalLength();
    gsap.set(orbitReveal, {
      strokeDasharray: length,
      strokeDashoffset: length,
    });
  }
  gsap.set(".orbit-decor > *", { autoAlpha: 0, scale: 0, transformOrigin: "center" });
  gsap.set(".orbit-brush", { autoAlpha: 0.62 });
  gsap.set(".hero-oc", { textShadow: "0 0 0 rgba(179, 134, 61, 0)" });
  gsap.set(journeyCue, { autoAlpha: 0, y: 12 });
  gsap.set(journeyLine, { autoAlpha: 0.34, scaleY: 0, transformOrigin: "center top" });
  gsap.set([journeyDrop, journeyChevron], { autoAlpha: 0 });
  gsap.set(journeyOrnaments, { autoAlpha: 0, scale: 0.45, transformOrigin: "center" });

  const journeyLoop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.52 });
  journeyLoop
    .set(journeyLine, { autoAlpha: 0.18, scaleY: 0, transformOrigin: "center top" })
    .set(journeyDrop, { autoAlpha: 0, y: 0 })
    .set(journeyChevron, { autoAlpha: 0, y: 0 })
    .set(journeyOrnaments, { autoAlpha: 0, scale: 0.45, rotation: -8 })
    .to(journeyLine, { autoAlpha: 1, scaleY: 1, duration: 0.88, ease: "power2.inOut" }, 0)
    .to(journeyDrop, { autoAlpha: 0.92, duration: 0.18, ease: "power1.out" }, 0.1)
    .to(journeyOrnaments, { autoAlpha: 0.82, scale: 1, rotation: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, 0.16)
    .to(journeyDrop, { y: 47, duration: 1.02, ease: "power2.in" }, 0.12)
    .to(journeyChevron, { autoAlpha: 1, y: 4, duration: 0.34, ease: "power2.out" }, 0.72)
    .to([journeyDrop, journeyChevron, journeyOrnaments], { autoAlpha: 0, duration: 0.34, ease: "power1.out" }, 1.16)
    .to(
      journeyLine,
      { autoAlpha: 0.18, scaleY: 0, transformOrigin: "center bottom", duration: 0.46, ease: "power2.inOut" },
      1.1,
    )
    .set(journeyDrop, { y: 0 }, 1.56)
    .set(journeyChevron, { y: 0 }, 1.56)
    .set(journeyOrnaments, { scale: 0.45, rotation: -8 }, 1.56);

  const progressBar = document.querySelector(".page-progress span");
  const growthStage = document.querySelector(".growth-stage");
  const scanStage = document.querySelector(".scan-stage");
  const scanMedia = document.querySelector(".scan-card");
  const scanSurface = document.querySelector(".scan-card-surface");
  const scanReveal = document.querySelector(".scan-reveal");
  const scanResult = document.querySelector(".scan-result");
  const scanBeam = document.querySelector(".scan-beam");
  const scanGlare = document.querySelector(".scan-card-glare");
  const scanFrame = document.querySelector(".scan-card-frame");
  const introBackground = document.querySelector(".intro-background");
  const storyExplainers = Array.from(document.querySelectorAll("[data-explain-copy]"));
  const demoFocuses = Array.from(document.querySelectorAll("[data-explain-focus]"));
  const demoNodes = Array.from(document.querySelectorAll("[data-explain-node]"));
  const demoProgressFill = document.querySelector(".story-demo-progress-line i");
  const atlasSection = document.querySelector("#world-atlas");
  const atlasStage = document.querySelector(".atlas-stage");
  const atlasBackdrop = document.querySelector(".atlas-backdrop");
  const atlasHeading = document.querySelector(".atlas-heading");
  const atlasMapShell = document.querySelector(".atlas-map-shell");
  const atlasMap = document.querySelector(".atlas-map");
  const atlasEntryGlow = document.querySelector(".atlas-entry-glow");
  const atlasHotspotSvg = document.querySelector(".atlas-hotspots");
  const atlasLocator = document.querySelector(".atlas-locator");
  const atlasRegionPin = document.querySelector(".atlas-region-pin");
  const atlasHighlights = Array.from(document.querySelectorAll(".atlas-highlight"));
  const atlasRegionMetadata = {
    "western-bay": ["西南海湾", "海湾、孤岛与通向大陆腹地的水路。"],
    "central-ridge": ["中央山脉", "群峰横贯大陆，河流从山谷向四方延伸。"],
    "northern-forest": ["北部森林", "密林沿河谷生长，连接山地与湖区。"],
    "northern-highlands": ["北境高地", "高原与群峰构成大陆最北端的天然屏障。"],
    "eastern-lakes": ["东北湖区", "湖泊与支流交织，形成独立的水域网络。"],
    "southern-forest": ["东南森林", "南境林海覆盖丘陵，并延伸至海岸。"],
    "southern-coast": ["南部海岸与群岛", "曲折海岸与群岛展开通往远方的航线。"],
  };

  if (atlasHotspotSvg && window.NOVELX_ATLAS_HOTSPOTS) {
    const svgNamespace = "http://www.w3.org/2000/svg";
    Object.entries(window.NOVELX_ATLAS_HOTSPOTS).forEach(([region, pathData]) => {
      const metadata = atlasRegionMetadata[region];
      if (!metadata || !pathData) return;

      const path = document.createElementNS(svgNamespace, "path");
      path.classList.add("atlas-hotspot");
      path.dataset.region = region;
      path.dataset.title = metadata[0];
      path.dataset.description = metadata[1];
      path.setAttribute("d", pathData);
      path.setAttribute("tabindex", "0");
      path.setAttribute("aria-label", metadata[0]);
      atlasHotspotSvg.append(path);
    });
  }

  const atlasHotspots = Array.from(document.querySelectorAll(".atlas-hotspot"));
  const atlasRegionName = document.querySelector(".atlas-region-name");
  const atlasRegionDescription = document.querySelector(".atlas-region-description");
  const atlasCopy = document.querySelector(".atlas-copy");
  const ocArchiveStage = document.querySelector(".oc-archive-stage");
  const ocDetailCards = Array.from(document.querySelectorAll(".oc-detail-card"));
  const ocMasterStudy = document.querySelector(".oc-master-study");
  const ocMasterPlate = document.querySelector(".oc-master-plate");
  const ocArchiveIndex = document.querySelector(".oc-archive-index");
  const ocArchivePath = document.querySelector(".oc-thread-line");
  const ocArchiveHaze = document.querySelector(".oc-thread-haze");
  const ocArchiveOrnaments = Array.from(document.querySelectorAll(".oc-thread-ornaments > *"));
  const ocShowcaseStage = document.querySelector(".oc-showcase-stage");
  const ocShowcaseBand = document.querySelector(".oc-continuum-band-showcase");
  const ocShowcaseWorld = document.querySelector(".oc-showcase-world");
  const ocShowcaseHeading = document.querySelector(".oc-showcase-heading");
  const ocTitleRules = Array.from(document.querySelectorAll(".oc-title-rule"));
  const ocPresentationSheet = document.querySelector(".oc-presentation-sheet");
  const ocPresentationImage = document.querySelector(".oc-presentation-sheet img");
  const ocShowcaseNote = document.querySelector(".oc-showcase-note");
  const ocShowcasePath = document.querySelector(".oc-showcase-thread-line");
  const ocShowcaseHaze = document.querySelector(".oc-showcase-thread-haze");
  const ocShowcaseOrnaments = Array.from(document.querySelectorAll(".oc-showcase-ornaments > *"));
  const closingStage = document.querySelector(".closing-stage");
  const closingGraphEcho = document.querySelector(".closing-graph-echo");
  const closingWorkbenchCard = document.querySelector(".closing-workbench-card");
  const closingWorkbenchImage = document.querySelector(".closing-workbench-surface img");
  const closingCardFrame = document.querySelector(".closing-card-frame");
  const closingCardSheen = document.querySelector(".closing-card-sheen");
  const closingPaperReveal = document.querySelector(".closing-paper-reveal");
  const closingScanBeam = document.querySelector(".closing-scan-beam");
  const closingHero = document.querySelector(".closing-hero");
  const closingTitleLines = Array.from(document.querySelectorAll(".closing-copy h2 span"));
  const closingReturnLine = document.querySelector(".closing-return-line");
  const closingReturnDrop = document.querySelector(".closing-return-drop");
  const closingReturnChevron = document.querySelector(".closing-return-chevron");
  const closingReturnOrnaments = Array.from(document.querySelectorAll(".closing-return-ornament"));
  const closingFlourishLine = document.querySelector(".closing-flourish-line");
  const closingFlourishHaze = document.querySelector(".closing-flourish-haze");
  const closingOrnaments = Array.from(document.querySelectorAll(".closing-ornaments > *"));

  let resetScanCard = () => {};
  let storyCueLoop = null;
  let closingReturnLoop = null;
  let activeAtlasRegion = "";
  let atlasResetCall = null;

  function setScanCardInteractive(enabled) {
    if (!scanMedia) return;
    scanMedia.classList.toggle("is-interactive", enabled);
    if (enabled) {
      storyCueLoop?.play();
    } else {
      storyCueLoop?.pause(0);
    }
    if (!enabled) resetScanCard();
  }

  storyCueLoop = gsap
    .timeline({ paused: true, repeat: -1, repeatDelay: 0.34 })
    .fromTo(
      ".story-cue-line",
      { scaleY: 0, autoAlpha: 0.2 },
      { scaleY: 1, autoAlpha: 1, duration: 0.72, ease: "power2.inOut" },
    )
    .fromTo(
      ".story-cue-arrow",
      { autoAlpha: 0, y: -7 },
      { autoAlpha: 1, y: 8, duration: 0.48, ease: "power2.out" },
      0.34,
    )
    .to([".story-cue-line", ".story-cue-arrow"], { autoAlpha: 0, duration: 0.24 }, 0.82);

  function setAtlasRegion(region = "") {
    if (!atlasMap || !atlasRegionName || !atlasRegionDescription) return;

    atlasResetCall?.kill();
    atlasResetCall = null;
    if (region === activeAtlasRegion) return;

    activeAtlasRegion = region;
    const hotspot = atlasHotspots.find((item) => item.dataset.region === region);
    const target = atlasHighlights.find((item) => item.dataset.atlasRegion === region);
    const duration = reduceMotionQuery.matches ? 0 : 0.34;

    const outgoingHighlights = target
      ? atlasHighlights.filter((item) => item !== target)
      : atlasHighlights;
    gsap.to(outgoingHighlights, {
      autoAlpha: 0,
      duration: reduceMotionQuery.matches ? 0 : 0.2,
      ease: "power1.out",
      overwrite: "auto",
    });
    if (target) {
      const edge = target.querySelector(".atlas-highlight-edge");
      const fill = target.querySelector(".atlas-highlight-fill");
      gsap.killTweensOf(target);
      gsap.set(target, { autoAlpha: 1 });
      gsap.fromTo(
        edge,
        { autoAlpha: 0, filter: "brightness(1.18) drop-shadow(0 0 2px rgba(217, 174, 96, 0.08))" },
        {
          autoAlpha: 0.9,
          filter: "brightness(1.08) drop-shadow(0 0 9px rgba(217, 174, 96, 0.58))",
          duration: duration * 0.78,
          ease: "power2.out",
          overwrite: "auto",
        },
      );
      gsap.fromTo(
        fill,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration,
          delay: reduceMotionQuery.matches ? 0 : 0.055,
          ease: "power2.out",
          overwrite: "auto",
        },
      );
    }

    atlasRegionName.textContent = hotspot?.dataset.title || "完整大陆";
    atlasRegionDescription.textContent = hotspot?.dataset.description || "每一处地理，都能成为故事的起点。";
    gsap.fromTo(
      [atlasRegionName, atlasRegionDescription],
      { autoAlpha: 0.2, y: 7 },
      { autoAlpha: 1, y: 0, duration: reduceMotionQuery.matches ? 0 : 0.3, stagger: 0.035, ease: "power2.out", overwrite: "auto" },
    );
    gsap.to(atlasMap, {
      scale: region ? 1.007 : 1,
      duration: reduceMotionQuery.matches ? 0 : 0.55,
      ease: "power2.out",
      overwrite: "auto",
    });

    if (atlasRegionPin) {
      if (hotspot && atlasMap) {
        const bounds = hotspot.getBBox();
        const mapBounds = atlasMap.getBoundingClientRect();
        const x = ((bounds.x + bounds.width * 0.5) / 1448) * mapBounds.width;
        const y = ((bounds.y + bounds.height * 0.5) / 1086) * mapBounds.height;
        gsap.to(atlasRegionPin, {
          autoAlpha: 1,
          x,
          y,
          scale: 1,
          duration: reduceMotionQuery.matches ? 0 : 0.3,
          ease: "power3.out",
          overwrite: "auto",
        });
      } else {
        gsap.to(atlasRegionPin, {
          autoAlpha: 0,
          scale: 0.7,
          duration: reduceMotionQuery.matches ? 0 : 0.18,
          overwrite: "auto",
        });
      }
    }
  }

  function scheduleAtlasReset() {
    if (!activeAtlasRegion || atlasResetCall) return;
    atlasResetCall = gsap.delayedCall(0.14, () => setAtlasRegion());
  }

  gsap.set(atlasHighlights, { autoAlpha: 0 });
  atlasHotspots.forEach((hotspot) => {
    const activate = () => setAtlasRegion(hotspot.dataset.region || "");
    hotspot.addEventListener("pointerenter", activate);
    hotspot.addEventListener("focus", activate);
  });
  if (atlasMap && atlasLocator && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const locatorXTo = gsap.quickTo(atlasLocator, "x", { duration: 0.22, ease: "power2.out" });
    const locatorYTo = gsap.quickTo(atlasLocator, "y", { duration: 0.22, ease: "power2.out" });
    atlasMap.addEventListener("pointerenter", () => {
      if (!atlasSection?.classList.contains("is-ready")) return;
      gsap.to(atlasLocator, { autoAlpha: 0.58, duration: 0.18, overwrite: "auto" });
    });
    atlasMap.addEventListener("pointermove", (event) => {
      const bounds = atlasMap.getBoundingClientRect();
      locatorXTo(event.clientX - bounds.left);
      locatorYTo(event.clientY - bounds.top);
    });
    atlasMap.addEventListener("pointerleave", () => {
      gsap.to(atlasLocator, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
    });
  }

  atlasMap?.addEventListener("pointermove", (event) => {
    if (event.target.closest?.(".atlas-hotspot")) {
      atlasResetCall?.kill();
      atlasResetCall = null;
      return;
    }
    scheduleAtlasReset();
  });
  atlasMap?.addEventListener("pointerleave", scheduleAtlasReset);

  [ocArchivePath, ocShowcasePath].forEach((path) => {
    if (!path) return;
    const length = path.getTotalLength();
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
    });
  });

  if (
    scanMedia &&
    scanSurface &&
    scanGlare &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    const rotateXTo = gsap.quickTo(scanSurface, "rotationX", {
      duration: 0.58,
      ease: "power3.out",
    });
    const rotateYTo = gsap.quickTo(scanSurface, "rotationY", {
      duration: 0.58,
      ease: "power3.out",
    });
    const glareXTo = gsap.quickTo(scanGlare, "x", {
      duration: 0.72,
      ease: "power3.out",
    });
    const glareYTo = gsap.quickTo(scanGlare, "y", {
      duration: 0.72,
      ease: "power3.out",
    });

    resetScanCard = () => {
      rotateXTo(0);
      rotateYTo(0);
      glareXTo(0);
      glareYTo(0);
      gsap.to(scanGlare, { autoAlpha: 0, duration: 0.36, overwrite: "auto" });
    };

    scanMedia.addEventListener("pointermove", (event) => {
      if (!scanMedia.classList.contains("is-interactive")) return;

      const bounds = scanSurface.getBoundingClientRect();
      const pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;

      rotateXTo(pointerY * -3.2);
      rotateYTo(pointerX * 4.2);
      glareXTo(pointerX * bounds.width * 0.12);
      glareYTo(pointerY * bounds.height * 0.08);
    });

    scanMedia.addEventListener("pointerenter", () => {
      if (!scanMedia.classList.contains("is-interactive")) return;
      gsap.to(scanGlare, { autoAlpha: 0.22, duration: 0.42, overwrite: "auto" });
    });
    scanMedia.addEventListener("pointerleave", resetScanCard);
  }

  gsap.to(progressBar, {
    scaleX: 1,
    ease: "none",
    scrollTrigger: {
      trigger: document.documentElement,
      start: "top top",
      end: "max",
      scrub: 0.25,
    },
  });

  const openingIntro = gsap.timeline({ defaults: { ease: "power3.out" } });
  openingIntro
    .from(".opening-brand", { autoAlpha: 0, y: 18, duration: 0.72 })
    .from(".opening .title-line", { autoAlpha: 0, y: 48, duration: 0.98, stagger: 0.12 }, 0.12)
    .to(
      ".hero-oc",
      {
        textShadow: "0 0 9px rgba(204, 164, 91, 0.32), 0 0 26px rgba(179, 134, 61, 0.18)",
        duration: 0.7,
      },
      0.44,
    )
    .to(orbitReveal, { strokeDashoffset: 0, duration: 1.9, ease: "power2.inOut" }, 0.5)
    .to(
      ".orbit-decor > *",
      { autoAlpha: 0.72, scale: 1, duration: 0.7, stagger: 0.13, ease: "power2.out" },
      1.2,
    )
    .from(".opening-note", { autoAlpha: 0, y: 14, duration: 0.62 }, 0.62)
    .from(".opening-index", { autoAlpha: 0, duration: 0.6 }, 0.76)
    .to(journeyCue, { autoAlpha: 1, y: 0, duration: 0.68, ease: "power2.out" }, 2.02)
    .add(() => {
      if (!reduceMotionQuery.matches) journeyLoop.play(0);
    }, 2.18);

  const mm = gsap.matchMedia();

  mm.add(
    {
      desktop: "(min-width: 861px)",
      mobile: "(max-width: 860px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { desktop, reduceMotion } = context.conditions;
      const getDemoScale = () => {
        if (!desktop || !scanMedia) return 0.94;

        const cardWidth = Math.max(scanMedia.offsetWidth, 1);
        return Math.min(0.68, (window.innerWidth * 0.62) / cardWidth);
      };
      const getDemoX = () => {
        if (!desktop || !scanMedia) return 0;

        const scale = getDemoScale();
        return window.innerWidth * 0.975 - window.innerWidth / 2 - (scanMedia.offsetWidth * scale) / 2;
      };
      const getAtlasCardScale = () => {
        if (!scanMedia) return 1;
        if (!desktop) return 0.98;
        return Math.min(0.84, (window.innerWidth * 0.84) / Math.max(scanMedia.offsetWidth, 1));
      };
      const getAtlasStartGeometry = () => {
        if (!scanMedia || !atlasMapShell) return { x: 0, y: 0, scale: 0.5 };

        const cardScale = getAtlasCardScale();
        const cardWidth = scanMedia.offsetWidth * cardScale;
        const cardHeight = scanMedia.offsetHeight * cardScale;
        const cardLeft = (window.innerWidth - cardWidth) * 0.5;
        const cardTop = (window.innerHeight - cardHeight) * 0.5;
        const mapCenterX = cardLeft + cardWidth * (0.396 + 0.3505 * 0.5);
        const mapCenterY = cardTop + cardHeight * (0.164 + 0.6205 * 0.5);
        const visibleMapHeight = cardHeight * 0.6205;

        return {
          x: mapCenterX - window.innerWidth * 0.5,
          y: mapCenterY - window.innerHeight * 0.5,
          scale: visibleMapHeight / Math.max(atlasMapShell.offsetHeight, 1),
        };
      };

      if (reduceMotion) {
        journeyLoop.pause(0);
        gsap.set(journeyCue, { autoAlpha: 1, y: 0 });
        gsap.set(journeyLine, { autoAlpha: 0.76, scaleY: 1 });
        gsap.set(journeyDrop, { autoAlpha: 0 });
        gsap.set(journeyChevron, { autoAlpha: 0.82, y: 0 });
        gsap.set(journeyOrnaments, { autoAlpha: 0.68, scale: 1, rotation: 0 });
        gsap.set([".command-name", commandChars, ".command-caret"], {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(growthStage, { autoAlpha: 0 });
        gsap.set(scanStage, { autoAlpha: 1, yPercent: 0 });
        gsap.set(scanReveal, { clearProps: "transform" });
        gsap.set(scanResult, {
          clipPath: "inset(0% 0% 0% 0%)",
          clearProps: "transform",
        });
        gsap.set(scanBeam, { autoAlpha: 0 });
        gsap.set(scanFrame, { autoAlpha: 0.72 });
        gsap.set(storyChars, { autoAlpha: 1, y: 0, rotationX: 0 });
        gsap.set([".story-ghost", ".story-arc-node", ".story-star", ".story-gold-point"], {
          autoAlpha: 1,
        });
        gsap.set([storyArcPath, storyContinuumHaze], { strokeDashoffset: 0 });
        gsap.set(storyArcPath, { autoAlpha: 0.44 });
        gsap.set(storyContinuumHaze, { autoAlpha: 0.22 });
        gsap.set(storyContinuumOrnaments, { autoAlpha: 0.58, scale: 1 });
        gsap.set(".story-bridge", { autoAlpha: 1 });
        gsap.set(".story-bridge span", { scaleX: 1 });
        gsap.set(".story-scroll-cue", { autoAlpha: 1 });
        gsap.set(storyExplainers, { autoAlpha: 0 });
        gsap.set(demoFocuses, { autoAlpha: 0 });
        gsap.set(demoNodes, { autoAlpha: 0 });
        gsap.set(demoProgressFill, { scaleX: 0 });
        gsap.set(atlasStage, { autoAlpha: 1 });
        gsap.set(atlasBackdrop, { autoAlpha: 1 });
        gsap.set([atlasMapShell, atlasHeading, atlasCopy], {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          filter: "none",
          clipPath: "inset(0% 0% 0% 0%)",
        });
        atlasSection?.classList.add("is-ready");
        gsap.set(
          scanMedia,
          desktop
            ? { scale: 0.68, x: window.innerWidth * 0.15, y: 0 }
            : { scale: 0.92, x: 0, y: window.innerHeight * 0.15 },
        );
        setScanCardInteractive(true);
        return;
      }

      const openingExit = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#opening",
          start: "top top",
          end: "bottom top",
          scrub: 0.75,
        },
      });
      openingExit
        .to(".opening-image", { scale: desktop ? 1.065 : 1.035, duration: 1 }, 0)
        .to(".opening-copy", { autoAlpha: 0, y: desktop ? -72 : -36, duration: 0.72 }, 0.08)
        .to(".hero-orbit", { autoAlpha: 0, scale: 1.025, duration: 0.82 }, 0.08)
        .fromTo(
          journeyCue,
          { autoAlpha: 1, y: 0 },
          { autoAlpha: 0, y: 16, duration: 0.22, immediateRender: false },
          0,
        )
        .to(".opening-shade", { autoAlpha: 0, duration: 0.65 }, 0.25);

      gsap.set(".command-name", { autoAlpha: 0, y: 18 });
      gsap.set(commandChars, { autoAlpha: 0, y: 18 });
      gsap.set(".command-caret", { autoAlpha: 0 });
      gsap.set(".growth-aura", { autoAlpha: 0, scaleX: 0.2 });
      gsap.set(".growth-seed", { scaleX: 0 });

      gsap.set(scanStage, { autoAlpha: 1, yPercent: 100 });
      gsap.set(scanReveal, { clearProps: "transform" });
      gsap.set(scanResult, { clipPath: "inset(0% 0% 100% 0%)" });
      gsap.set(scanBeam, { autoAlpha: 0, y: 0 });
      gsap.set(scanMedia, { scale: 1, x: 0, y: 0 });
      gsap.set(scanSurface, {
        rotationX: 0,
        rotationY: 0,
        transformPerspective: 1500,
      });
      gsap.set(scanFrame, { autoAlpha: 0 });
      gsap.set(scanGlare, { autoAlpha: 0, x: 0, y: 0, xPercent: -34 });
      gsap.set(introBackground, { autoAlpha: 0.62, scale: 1.075 });
      gsap.set(storyChars, { autoAlpha: 0, y: 34, rotationX: -20 });
      gsap.set([".story-ghost", ".story-arc-node", ".story-star", ".story-gold-point"], {
        autoAlpha: 0,
      });
      gsap.set(".story-ghost", { x: -24 });
      gsap.set([".story-arc-node", ".story-star", ".story-gold-point"], {
        scale: 0,
        transformOrigin: "center",
      });
      gsap.set(".story-bridge", { autoAlpha: 0 });
      gsap.set(".story-bridge span", { scaleX: 0 });
      gsap.set(".story-scroll-cue", { autoAlpha: 0, y: 12 });
      gsap.set(storyExplainers, { autoAlpha: 0, y: 30 });
      gsap.set(demoFocuses, { autoAlpha: 0, scale: 0.97 });
      gsap.set(demoNodes, { autoAlpha: 0.42, scale: 0.72 });
      gsap.set(demoProgressFill, { scaleX: 0 });
      gsap.set(storyArcPath, { autoAlpha: 0 });
      gsap.set(storyContinuumHaze, { autoAlpha: 0 });
      gsap.set(storyContinuumOrnaments, {
        autoAlpha: 0,
        scale: 0,
        transformOrigin: "center",
      });
      gsap.set(atlasStage, { autoAlpha: 1 });
      gsap.set(atlasBackdrop, { autoAlpha: 0 });
      gsap.set(atlasMapShell, {
        autoAlpha: 0,
        x: () => getAtlasStartGeometry().x,
        y: () => getAtlasStartGeometry().y,
        scale: () => getAtlasStartGeometry().scale,
        clipPath: "inset(0% 12.5% 0% 12.5%)",
        filter: "blur(4px)",
        transformOrigin: "center",
      });
      gsap.set([atlasHeading, atlasCopy], { autoAlpha: 0, y: 18 });
      gsap.set(atlasEntryGlow, { autoAlpha: 0, scale: 0.985 });
      gsap.set(atlasLocator, { autoAlpha: 0 });
      gsap.set(atlasRegionPin, { autoAlpha: 0, scale: 0.7, transformOrigin: "center" });
      atlasSection?.classList.remove("is-ready");
      setScanCardInteractive(false);

      let creationTimeline;
      const atlasHold = { progress: 0 };
      creationTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#growth",
          start: "top top",
          end: desktop ? "+=9400" : "+=7600",
          pin: ".creation-stage",
          scrub: 0.84,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: () => {
            const timelineTime = creationTimeline?.time() || 0;
            const invitationActive = timelineTime >= 1.67 && timelineTime < 2.02;
            const atlasReady = timelineTime >= 7.08;
            setScanCardInteractive(invitationActive);
            atlasSection?.classList.toggle("is-ready", atlasReady);
          },
          onLeave: () => {
            setScanCardInteractive(false);
            atlasSection?.classList.remove("is-ready");
          },
        },
      });
      creationTimeline
        .addLabel("invoke", 0)
        .to(".growth-aura", { autoAlpha: 1, scaleX: 1, duration: 0.18 }, "invoke")
        .to(".command-name", { autoAlpha: 1, y: 0, duration: 0.13 }, "invoke+=0.04")
        .to(".command-caret", { autoAlpha: 1, duration: 0.06 }, "invoke+=0.12")
        .addLabel("describe", 0.2)
        .to(
          commandChars,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.035,
            stagger: 0.021,
          },
          "describe",
        )
        .addLabel("commit", 0.77)
        .to(".growth-seed", { scaleX: 1, duration: 0.17 }, "commit")
        .to(".command-caret", { autoAlpha: 0.22, duration: 0.09 }, "commit")
        .to(
          ".growth-command",
          { autoAlpha: 0, scale: 0.975, y: -18, duration: 0.16 },
          "commit+=0.07",
        )
        .to(".growth-aura", { autoAlpha: 0, duration: 0.14 }, "commit+=0.08")
        .addLabel("handoff", 0.84)
        .to(scanStage, { yPercent: 0, duration: 0.18 }, "handoff")
        .to(growthStage, { autoAlpha: 0, yPercent: -7, duration: 0.16 }, "handoff+=0.03")
        .to(introBackground, { autoAlpha: 1, scale: 1.01, duration: 0.96 }, "handoff")
        .addLabel("scanStart", 0.91)
        .to(scanBeam, { autoAlpha: 1, duration: 0.035 }, "scanStart")
        .to(scanResult, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.86 }, "scanStart")
        .to(
          scanBeam,
          {
            y: () => scanMedia?.offsetHeight || window.innerHeight,
            duration: 0.86,
          },
          "scanStart",
        )
        .to(".scan-source", { scale: 1.022, autoAlpha: 0.42, duration: 0.86 }, "scanStart")
        .addLabel("contract", 0.99)
        .to(
          scanMedia,
          desktop
            ? {
                scale: 0.68,
                x: () => window.innerWidth * 0.15,
                y: 0,
                duration: 0.78,
              }
            : {
                scale: 0.92,
                x: 0,
                y: () => window.innerHeight * 0.15,
                duration: 0.78,
              },
          "contract",
        )
        .to(scanFrame, { autoAlpha: 0.72, duration: 0.42 }, "contract+=0.16")
        .to(
          ".story-ghost",
          { autoAlpha: 1, x: 0, duration: 0.34, ease: "power2.out" },
          "scanStart+=0.48",
        )
        .to(
          storyArcPath,
          {
            autoAlpha: 0.64,
            strokeDashoffset: () => storyArcIntroOffset,
            duration: 0.46,
          },
          "scanStart+=0.5",
        )
        .to(
          storyContinuumHaze,
          {
            autoAlpha: 0.16,
            strokeDashoffset: () => storyArcIntroOffset,
            duration: 0.46,
          },
          "scanStart+=0.5",
        )
        .to(
          [".story-arc-node", ".story-star"],
          { autoAlpha: 1, scale: 1, duration: 0.22, stagger: 0.05, ease: "power2.out" },
          "scanStart+=0.62",
        )
        .to(
          storyChars,
          {
            autoAlpha: 1,
            y: 0,
            rotationX: 0,
            duration: 0.18,
            stagger: 0.035,
            ease: "power3.out",
          },
          "scanStart+=0.58",
        )
        .to(
          ".story-gold-point",
          { autoAlpha: 1, scale: 1, duration: 0.18, ease: "back.out(1.6)" },
          "scanStart+=0.72",
        )
        .to(".story-bridge", { autoAlpha: 1, duration: 0.12 }, "scanStart+=0.69")
        .to(".story-bridge span", { scaleX: 1, duration: 0.28 }, "scanStart+=0.69")
        .to(
          ".story-scroll-cue",
          { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" },
          "scanStart+=0.76",
        )
        .to(scanBeam, { autoAlpha: 0, duration: 0.08 }, "scanStart+=0.8")
        .to(scanResult, { scale: 1.008, duration: 0.08 }, "scanStart+=0.78")
        .to(scanGlare, { autoAlpha: 0.2, xPercent: 18, duration: 0.12 }, "scanStart+=0.74")
        .to(scanGlare, { autoAlpha: 0, xPercent: 34, duration: 0.12 }, "scanStart+=0.86")
        .addLabel("demoHandoff", 2.02)
        .to(
          [".story-title", ".story-ghost", ".story-scroll-cue", ".story-bridge"],
          { autoAlpha: 0, y: -20, duration: 0.22, ease: "power2.in" },
          "demoHandoff",
        )
        .to(
          scanMedia,
          desktop
            ? {
                scale: getDemoScale,
                x: getDemoX,
                y: 0,
                duration: 0.38,
                ease: "power2.inOut",
              }
            : {
                scale: 0.94,
                x: 0,
                y: () => window.innerHeight * 0.19,
                duration: 0.38,
                ease: "power2.inOut",
          },
          "demoHandoff",
        )
        .to(scanResult, { scale: 1, duration: 0.24, ease: "power2.out" }, "demoHandoff")
        .to(demoProgressFill, { scaleX: 1, duration: 3.65 }, "demoHandoff+=0.16");

      const addExplanationBeat = (index, position) => {
        if (index > 0) {
          creationTimeline
            .to(
              storyExplainers[index - 1],
              { autoAlpha: 0, y: -22, duration: 0.18, ease: "power2.in" },
              position - 0.2,
            )
            .to(
              demoFocuses[index - 1],
              { autoAlpha: 0, scale: 1.014, duration: 0.2 },
              position - 0.22,
            )
            .to(
              demoNodes[index - 1],
              { autoAlpha: 0.56, scale: 0.82, duration: 0.16 },
              position - 0.18,
            );
        }

        creationTimeline
          .to(
            storyExplainers[index],
            { autoAlpha: 1, y: 0, duration: 0.28, ease: "power3.out" },
            position,
          )
          .to(
            demoFocuses[index],
            { autoAlpha: 1, scale: 1, duration: 0.28, ease: "power2.out" },
            position + 0.02,
          )
          .to(
            demoNodes[index],
            { autoAlpha: 1, scale: 1.22, duration: 0.2, ease: "power2.out" },
            position + 0.03,
          );
      };

      addExplanationBeat(0, 2.18);
      addExplanationBeat(1, 3.18);
      addExplanationBeat(2, 4.18);
      addExplanationBeat(3, 5.18);

      creationTimeline
        .to(storyArcPath, { autoAlpha: 0.68, duration: 0.2 }, 5.28)
        .to(
          [storyArcPath, storyContinuumHaze],
          { strokeDashoffset: 0, duration: 2.08, ease: "power1.inOut" },
          5.3,
        )
        .to(storyContinuumHaze, { autoAlpha: 0.48, duration: 0.62 }, 5.42)
        .to(
          storyContinuumOrnaments,
          {
            autoAlpha: 0.82,
            scale: 1,
            duration: 0.2,
            stagger: 0.24,
            ease: "back.out(1.35)",
          },
          5.66,
        )
        .addLabel("atlasHandoff", 6.04)
        .to(
          storyExplainers[3],
          { autoAlpha: 0, y: -22, duration: 0.2, ease: "power2.in" },
          "atlasHandoff",
        )
        .to(demoFocuses[3], { autoAlpha: 0, scale: 1.014, duration: 0.18 }, "atlasHandoff")
        .to(demoNodes, { autoAlpha: 0, scale: 0.72, duration: 0.18 }, "atlasHandoff")
        .to(demoProgressFill, { autoAlpha: 0, duration: 0.16 }, "atlasHandoff")
        .to(
          scanMedia,
          {
            scale: getAtlasCardScale,
            x: 0,
            y: 0,
            duration: 0.34,
            ease: "power2.inOut",
          },
          "atlasHandoff+=0.02",
        )
        .to(scanGlare, { autoAlpha: 0.14, xPercent: 10, duration: 0.22 }, "atlasHandoff+=0.08")
        .to(atlasMapShell, { autoAlpha: 1, duration: 0.18, ease: "power1.out" }, "atlasHandoff+=0.28")
        .to(scanMedia, { autoAlpha: 0, duration: 0.3, ease: "power1.out" }, "atlasHandoff+=0.34")
        .to(atlasBackdrop, { autoAlpha: 1, duration: 0.42, ease: "power1.inOut" }, "atlasHandoff+=0.3")
        .to(storyContinuumHaze, { autoAlpha: 0.22, duration: 0.72 }, "atlasHandoff+=0.28")
        .to(storyArcPath, { autoAlpha: 0.44, duration: 0.72 }, "atlasHandoff+=0.28")
        .to(storyContinuumOrnaments, { autoAlpha: 0.58, duration: 0.72 }, "atlasHandoff+=0.28")
        .to(
          atlasMapShell,
          {
            x: 0,
            y: 0,
            scale: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            filter: "blur(0px)",
            duration: 0.82,
            ease: "power3.inOut",
          },
          "atlasHandoff+=0.35",
        )
        .to(atlasMap, { scale: 1.012, duration: 0.5, ease: "power1.out" }, "atlasHandoff+=0.42")
        .to(atlasMap, { scale: 1, duration: 0.42, ease: "power2.out" }, "atlasHandoff+=0.86")
        .to(atlasHeading, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power3.out" }, "atlasHandoff+=0.92")
        .to(atlasCopy, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power3.out" }, "atlasHandoff+=0.98")
        .to(atlasEntryGlow, { autoAlpha: 0.72, scale: 1, duration: 0.22 }, "atlasHandoff+=0.92")
        .to(atlasEntryGlow, { autoAlpha: 0, scale: 1.015, duration: 0.42 }, "atlasHandoff+=1.14")
        .addLabel("atlasReady", 7.08)
        .to(atlasHold, { progress: 1, duration: 1.28, ease: "none" }, "atlasReady");
    },
  );

  mm.add(
    {
      desktop: "(min-width: 861px)",
      mobile: "(max-width: 860px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { desktop, reduceMotion } = context.conditions;
      if (reduceMotion || !ocArchiveStage || !ocShowcaseStage) return;

      gsap.set(ocArchiveIndex, { autoAlpha: 0 });
      gsap.set(ocDetailCards, {
        autoAlpha: 0,
        y: (index) => (index % 2 ? 44 : 30),
        clipPath: "inset(0% 0% 100% 0%)",
      });
      gsap.set(ocMasterStudy, {
        autoAlpha: 1,
        scale: 1,
      });
      gsap.set(ocMasterPlate, {
        autoAlpha: 0,
        scale: 1.025,
        clipPath: "inset(0% 0% 100% 0%)",
      });
      gsap.set(ocArchiveHaze, { autoAlpha: 0 });
      gsap.set(ocArchiveOrnaments, { autoAlpha: 0, scale: 0, transformOrigin: "center" });

      const archiveTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#oc-archive",
          start: "top top",
          end: desktop ? "+=3000" : "+=2200",
          pin: ocArchiveStage,
          scrub: 0.72,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      archiveTimeline
        .to(ocArchiveHaze, { autoAlpha: 0.72, duration: 0.38 }, 0.04)
        .to(ocArchivePath, { strokeDashoffset: 0, duration: 1.7, ease: "power1.inOut" }, 0.08)
        .to(
          ocDetailCards,
          {
            autoAlpha: 1,
            y: 0,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.16,
            stagger: 0.035,
            ease: "power3.out",
          },
          0.02,
        )
        .to(
          ocMasterPlate,
          {
            autoAlpha: 1,
            scale: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.62,
            ease: "power2.inOut",
          },
          0.5,
        )
        .to(
          ocArchiveOrnaments,
          { autoAlpha: 0.9, scale: 1, duration: 0.24, stagger: 0.1, ease: "back.out(1.5)" },
          0.94,
        )
        .to(ocArchiveIndex, { autoAlpha: 1, duration: 0.28 }, 1.18);

      const archiveExitTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#oc-showcase",
          start: "top bottom",
          end: "top top",
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
      });

      archiveExitTimeline
        .to(
          [...ocDetailCards].reverse(),
          {
            clipPath: "inset(0% 0% 100% 0%)",
            autoAlpha: 0,
            duration: 0.55,
            stagger: 0.07,
            ease: "power2.in",
          },
          0,
        )
        .to(
          ocMasterStudy,
          {
            clipPath: "inset(0% 0% 100% 0%)",
            autoAlpha: 0,
            duration: 0.7,
            ease: "power2.inOut",
          },
          0.18,
        );

      gsap.set(ocShowcaseWorld, { autoAlpha: 0.35, scale: 1.08, yPercent: 1.8 });
      gsap.set(ocShowcaseBand, { autoAlpha: 0.14, scaleX: 1 });
      gsap.set(ocShowcaseHeading, { autoAlpha: 0, y: 24 });
      gsap.set(ocTitleRules, { scaleX: 0 });
      gsap.set(ocPresentationSheet, {
        autoAlpha: 0,
        scale: 0.96,
        clipPath: "inset(50% 0% 50% 0%)",
      });
      gsap.set(ocPresentationImage, { scale: 1.035 });
      gsap.set(ocShowcaseNote, { autoAlpha: 0, y: 12 });
      gsap.set(ocShowcaseHaze, { autoAlpha: 0 });
      gsap.set(ocShowcaseOrnaments, { autoAlpha: 0, scale: 0, transformOrigin: "center" });

      const showcaseTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#oc-showcase",
          start: "top top",
          end: desktop ? "+=2500" : "+=1900",
          pin: ocShowcaseStage,
          scrub: 0.76,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      showcaseTimeline
        .to(ocShowcaseWorld, { autoAlpha: 1, scale: 1.015, yPercent: 0, duration: 1.2, ease: "power1.out" }, 0)
        .to(ocShowcaseBand, { autoAlpha: 0.03, scaleX: 1.12, duration: 0.72, ease: "power2.inOut" }, 0)
        .to(ocShowcaseHaze, { autoAlpha: 0.74, duration: 0.3 }, 0)
        .to(ocShowcasePath, { strokeDashoffset: 0, duration: 0.82, ease: "power2.inOut" }, 0.02)
        .to(
          ocShowcaseOrnaments,
          { autoAlpha: 0.9, scale: 1, duration: 0.22, stagger: 0.09, ease: "back.out(1.45)" },
          0.42,
        )
        .to(ocShowcaseHeading, { autoAlpha: 1, y: 0, duration: 0.34, ease: "power3.out" }, 0.34)
        .to(ocTitleRules, { scaleX: 1, duration: 0.38, ease: "power2.inOut" }, 0.42)
        .to(
          ocPresentationSheet,
          {
            autoAlpha: 0.88,
            scale: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.72,
            ease: "power3.inOut",
          },
          0.68,
        )
        .to(ocPresentationImage, { scale: 1, duration: 0.82, ease: "power2.out" }, 0.68)
        .to(ocShowcaseNote, { autoAlpha: 1, y: 0, duration: 0.28 }, 1.16)
        .to(ocPresentationSheet, { y: desktop ? -7 : -3, duration: 0.5 }, 1.34)
        .to(ocShowcaseWorld, { scale: 1, duration: 0.5 }, 1.34);
    },
  );

  mm.add(
    {
      desktop: "(min-width: 861px)",
      mobile: "(max-width: 860px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      if (!worldGraph?.stage) return;
      const { desktop, reduceMotion } = context.conditions;

      worldGraph.edges.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: reduceMotion ? 0 : length,
        });
      });

      if (reduceMotion) {
        gsap.set(
          [worldGraph.heading, worldGraph.toolbar, worldGraph.legend, worldGraph.inspector, worldGraph.clusters, worldGraph.nodes, worldGraph.edges],
          { autoAlpha: 1, clearProps: "transform" },
        );
        return;
      }

      gsap.set(worldGraph.heading, { autoAlpha: 0, y: 18 });
      gsap.set(worldGraph.toolbar, { autoAlpha: 0, y: 12 });
      gsap.set(worldGraph.legend, { autoAlpha: 0 });
      gsap.set(worldGraph.inspector, { autoAlpha: 0, x: 18 });
      gsap.set(worldGraph.clusters, { autoAlpha: 0, y: -7 });
      gsap.set(worldGraph.nodes, { autoAlpha: 0, scale: 0.9 });
      gsap.set(worldGraph.edges, { autoAlpha: 0.18 });

      const graphTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#world-graph",
          start: desktop ? "top top" : "top 78%",
          end: desktop ? "+=1900" : "top 18%",
          pin: desktop ? worldGraph.stage : false,
          scrub: desktop ? 0.72 : 0.45,
          anticipatePin: desktop ? 1 : 0,
          invalidateOnRefresh: true,
        },
      });

      graphTimeline
        .addLabel("archive", 0)
        .to(worldGraph.heading, { autoAlpha: 1, y: 0, duration: 0.24, ease: "power3.out" }, "archive")
        .to(worldGraph.toolbar, { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" }, "archive+=0.08")
        .to(
          worldGraph.clusters,
          { autoAlpha: 1, y: 0, duration: 0.24, stagger: 0.055, ease: "power2.out" },
          "archive+=0.12",
        )
        .addLabel("causality", 0.24)
        .to(
          worldGraph.edges,
          {
            autoAlpha: 0.42,
            strokeDashoffset: 0,
            duration: 0.92,
            stagger: { amount: 0.42, from: "start" },
            ease: "power1.inOut",
          },
          "causality",
        )
        .to(
          worldGraph.nodes,
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.34,
            stagger: { amount: 0.72, from: "start" },
            ease: "power3.out",
          },
          "causality+=0.08",
        )
        .to(worldGraph.inspector, { autoAlpha: 1, x: 0, duration: 0.28, ease: "power2.out" }, "causality+=0.7")
        .to(worldGraph.legend, { autoAlpha: 1, duration: 0.22 }, "causality+=0.82");
    },
  );

  mm.add(
    {
      desktop: "(min-width: 861px)",
      mobile: "(max-width: 860px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      if (!closingStage || !closingWorkbenchCard || !closingPaperReveal || !closingHero) return;
      const { desktop, reduceMotion } = context.conditions;

      if (closingFlourishLine) {
        const lineLength = closingFlourishLine.getTotalLength();
        gsap.set([closingFlourishLine, closingFlourishHaze], {
          strokeDasharray: lineLength,
          strokeDashoffset: reduceMotion ? 0 : lineLength,
        });
      }

      if (reduceMotion) {
        gsap.set(closingGraphEcho, { autoAlpha: 0 });
        gsap.set(closingWorkbenchCard, {
          autoAlpha: 1,
          top: "50%",
          left: "50%",
          width: "100vw",
          height: "100dvh",
          xPercent: -50,
          yPercent: -50,
          scale: 1,
          borderRadius: 0,
          boxShadow: "none",
        });
        gsap.set(closingPaperReveal, { clipPath: "inset(0% 0% 0% 0%)" });
        gsap.set(closingCardFrame, { autoAlpha: 0 });
        gsap.set(closingHero, { autoAlpha: 1, pointerEvents: "auto" });
        gsap.set([closingTitleLines, closingReturn, closingOrnaments], { autoAlpha: 1, clearProps: "transform,filter" });
        return;
      }

      gsap.set(closingGraphEcho, { autoAlpha: 1 });
      gsap.set(closingWorkbenchCard, {
        autoAlpha: 0,
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
        scale: desktop ? 0.72 : 0.82,
        borderRadius: 4,
      });
      gsap.set(closingWorkbenchImage, { scale: 1 });
      gsap.set(closingCardFrame, { autoAlpha: 0.78 });
      gsap.set(closingCardSheen, { autoAlpha: 0, xPercent: -10 });
      gsap.set(closingPaperReveal, { clipPath: "inset(100% 0% 0% 0%)" });
      gsap.set(closingScanBeam, { autoAlpha: 0, y: 0 });
      gsap.set(closingHero, { autoAlpha: 0, pointerEvents: "none" });
      gsap.set(closingTitleLines, { autoAlpha: 0, y: 42, filter: "blur(8px)" });
      gsap.set(closingReturn, { autoAlpha: 0, y: 18 });
      gsap.set(closingReturnLine, { autoAlpha: 0.34, scaleY: 0, transformOrigin: "center top" });
      gsap.set([closingReturnDrop, closingReturnChevron], { autoAlpha: 0 });
      gsap.set(closingReturnOrnaments, { autoAlpha: 0, scale: 0.45, transformOrigin: "center" });
      gsap.set(closingFlourishHaze, { autoAlpha: 0 });
      gsap.set(closingOrnaments, { autoAlpha: 0, scale: 0, transformOrigin: "center" });

      closingReturnLoop?.kill();
      closingReturnLoop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.52 });
      closingReturnLoop
        .set(closingReturnLine, { autoAlpha: 0.18, scaleY: 0, transformOrigin: "center top" })
        .set(closingReturnDrop, { autoAlpha: 0, y: 0 })
        .set(closingReturnChevron, { autoAlpha: 0, y: 0 })
        .set(closingReturnOrnaments, { autoAlpha: 0, scale: 0.45, rotation: -8 })
        .to(closingReturnLine, { autoAlpha: 1, scaleY: 1, duration: 0.82, ease: "power2.inOut" }, 0)
        .to(closingReturnDrop, { autoAlpha: 0.92, duration: 0.16, ease: "power1.out" }, 0.08)
        .to(
          closingReturnOrnaments,
          { autoAlpha: 0.82, scale: 1, rotation: 0, duration: 0.46, stagger: 0.09, ease: "power2.out" },
          0.14,
        )
        .to(closingReturnDrop, { y: 43, duration: 0.9, ease: "power2.in" }, 0.1)
        .to(closingReturnChevron, { autoAlpha: 1, y: 4, duration: 0.32, ease: "power2.out" }, 0.64)
        .to([closingReturnDrop, closingReturnChevron, closingReturnOrnaments], { autoAlpha: 0, duration: 0.3, ease: "power1.out" }, 1.02)
        .to(
          closingReturnLine,
          { autoAlpha: 0.18, scaleY: 0, transformOrigin: "center bottom", duration: 0.44, ease: "power2.inOut" },
          1.02,
        )
        .set(closingReturnDrop, { y: 0 }, 1.46)
        .set(closingReturnChevron, { y: 0 }, 1.46)
        .set(closingReturnOrnaments, { scale: 0.45, rotation: -8 }, 1.46);

      const closingTimeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#closing",
          start: "top top",
          end: desktop ? "+=3300" : "+=2300",
          pin: closingStage,
          scrub: desktop ? 0.78 : 0.58,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (self.progress >= 0.992) {
              if (closingReturnLoop?.paused()) closingReturnLoop.play(0);
            } else if (closingReturnLoop) {
              closingReturnLoop.pause(0);
            }
          },
        },
      });

      const fitCardScale = () =>
        Math.min(
          window.innerWidth / Math.max(closingWorkbenchCard.offsetWidth, 1),
          closingStage.offsetHeight / Math.max(closingWorkbenchCard.offsetHeight, 1),
        ) * (desktop ? 0.97 : 0.94);
      const coverCardScale = () =>
        Math.max(
          window.innerWidth / Math.max(closingWorkbenchCard.offsetWidth, 1),
          closingStage.offsetHeight / Math.max(closingWorkbenchCard.offsetHeight, 1),
        ) * 1.015;

      closingTimeline
        .addLabel("cardReturn", 0)
        .to(closingWorkbenchCard, { autoAlpha: 1, duration: 0.18, ease: "power2.out" }, "cardReturn")
        .to(closingGraphEcho, { scale: 1.025, duration: 1.72, ease: "power1.out" }, "cardReturn")
        .to(closingCardSheen, { autoAlpha: 0.42, xPercent: 520, duration: 0.66, ease: "power2.inOut" }, "cardReturn+=0.04")
        .to(closingCardSheen, { autoAlpha: 0, duration: 0.18 }, "cardReturn+=0.6")
        .addLabel("transform", 0.14)
        .to(
          closingWorkbenchCard,
          {
            scale: fitCardScale,
            duration: 1.58,
            ease: "power2.inOut",
          },
          "transform",
        )
        .to(closingScanBeam, { autoAlpha: 1, duration: 0.08 }, "transform")
        .to(closingPaperReveal, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.58, ease: "power1.inOut" }, "transform")
        .to(
          closingScanBeam,
          { y: () => -(closingWorkbenchCard.offsetHeight + 12), duration: 1.58, ease: "power1.inOut" },
          "transform",
        )
        .to(closingWorkbenchImage, { scale: 1.012, filter: "saturate(0.74) contrast(0.96) sepia(0.08)", duration: 1.58 }, "transform")
        .to(closingCardFrame, { autoAlpha: 0.36, duration: 1.3 }, "transform+=0.26")
        .to(closingScanBeam, { autoAlpha: 0, duration: 0.1 }, "transform+=1.5")
        .addLabel("resolve", 1.78)
        .to(
          closingWorkbenchCard,
          {
            scale: coverCardScale,
            borderRadius: 0,
            boxShadow: "0 0 0 rgba(50, 35, 20, 0)",
            duration: 0.48,
            ease: "power3.inOut",
          },
          "resolve",
        )
        .to(closingCardFrame, { autoAlpha: 0, duration: 0.3 }, "resolve")
        .to(closingGraphEcho, { autoAlpha: 0, duration: 0.42 }, "resolve+=0.06")
        .addLabel("invitation", 2.18)
        .to(closingHero, { autoAlpha: 1, pointerEvents: "auto", duration: 0.24 }, "invitation")
        .to(closingTitleLines, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.54, stagger: 0.1, ease: "power3.out" }, "invitation+=0.08")
        .to(closingFlourishHaze, { autoAlpha: 0.5, duration: 0.3 }, "invitation+=0.16")
        .to([closingFlourishLine, closingFlourishHaze], { strokeDashoffset: 0, duration: 0.92, ease: "power2.inOut" }, "invitation+=0.18")
        .to(
          closingOrnaments,
          { autoAlpha: 0.86, scale: 1, duration: 0.18, stagger: 0.09, ease: "back.out(1.4)" },
          "invitation+=0.72",
        )
        .to(closingReturn, { autoAlpha: 1, y: 0, duration: 0.36, ease: "power3.out" }, "invitation+=0.86")
        .to({}, { duration: 0.78 });
    },
  );

  const refresh = () => ScrollTrigger.refresh();
  const images = Array.from(document.images);
  Promise.all([
    document.fonts?.ready || Promise.resolve(),
    ...images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }),
  ]).then(refresh);

  window.addEventListener(
    "pagehide",
    () => {
      if (ocAutoTimer !== null) window.clearTimeout(ocAutoTimer);
      storyCueLoop?.kill();
      journeyLoop.kill();
      closingReturnLoop?.kill();
      mm.revert();
    },
    { once: true },
  );
})();
