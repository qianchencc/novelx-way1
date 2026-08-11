(() => {
  const archiveFrame = document.querySelector(".archive-frame");
  const archivePanels = Array.from(document.querySelectorAll(".archive-panel"));
  const causalButtons = Array.from(document.querySelectorAll("[data-causal]"));
  const causalNotes = Array.from(document.querySelectorAll("[data-causal-note]"));
  const agentBeats = Array.from(document.querySelectorAll("[data-beat]"));
  const video = document.querySelector(".agent-video");
  const videoState = document.querySelector(".video-state");
  const navLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
  const sections = Array.from(document.querySelectorAll("[data-chapter]"));

  let activeAgentBeat = -1;
  let activeCausalStep = -1;
  let videoReady = false;

  function setArchive(index) {
    if (!archiveFrame) return;
    archiveFrame.dataset.activeIndex = String(index);
    archivePanels.forEach((panel, panelIndex) => {
      const active = panelIndex === index;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("aria-expanded", String(active));
    });
  }

  function setAgentBeat(index) {
    if (index === activeAgentBeat) return;
    activeAgentBeat = index;
    agentBeats.forEach((beat, beatIndex) => {
      beat.classList.toggle("is-active", beatIndex === index);
    });
  }

  function setCausalStep(index, animate = true) {
    const next = Math.max(0, Math.min(causalNotes.length - 1, index));
    if (next === activeCausalStep) return;
    activeCausalStep = next;

    causalButtons.forEach((button, buttonIndex) => {
      const active = buttonIndex === next;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    causalNotes.forEach((note, noteIndex) => {
      note.classList.toggle("is-active", noteIndex === next);
    });

    if (animate && window.gsap) {
      const note = causalNotes[next];
      window.gsap.fromTo(
        note,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.36, ease: "power2.out", overwrite: true },
      );
    }
  }

  archivePanels.forEach((panel, index) => {
    panel.addEventListener("click", () => setArchive(index));
    panel.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch" && window.innerWidth > 860) setArchive(index);
    });
  });

  causalButtons.forEach((button, index) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => setCausalStep(index));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  });

  async function hydrateAgentVideo() {
    if (
      !video ||
      video.dataset.available !== "true" ||
      !video.dataset.src ||
      !/^https?:$/.test(window.location.protocol)
    ) return;

    try {
      const response = await fetch(video.dataset.src, { method: "HEAD", cache: "no-store" });
      if (!response.ok) return;
      video.src = video.dataset.src;
      video.load();
    } catch (_error) {
      return;
    }

    video.addEventListener(
      "loadedmetadata",
      () => {
        videoReady = Number.isFinite(video.duration) && video.duration > 0;
        if (!videoReady) return;
        video.classList.add("is-ready");
        videoState.textContent = "真实录屏已接入";
        window.ScrollTrigger?.refresh();
      },
      { once: true },
    );
  }

  setArchive(0);
  setAgentBeat(0);
  setCausalStep(0, false);
  hydrateAgentVideo();

  if (!window.gsap || !window.ScrollTrigger) {
    document.body.classList.add("no-gsap");
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ duration: 0.7, ease: "power3.out" });

  const progressBar = document.querySelector(".page-progress span");
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

  const heroRoute = document.querySelector(".hero-route path");
  const causalPath = document.querySelector(".causal-line path");

  if (heroRoute) {
    const length = heroRoute.getTotalLength();
    gsap.set(heroRoute, { strokeDasharray: length, strokeDashoffset: length });
  }

  if (causalPath) {
    const length = causalPath.getTotalLength();
    gsap.set(causalPath, { strokeDasharray: length, strokeDashoffset: length });
  }

  const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
  intro
    .from(".site-header", { autoAlpha: 0, y: -18, duration: 0.7 })
    .from(".hero-brand", { autoAlpha: 0, y: 16, duration: 0.55 }, 0.18)
    .from(".hero h1", { autoAlpha: 0, y: 34, duration: 0.9 }, 0.24)
    .from(".hero-copy > p:last-child", { autoAlpha: 0, y: 22, duration: 0.72 }, 0.48)
    .to(heroRoute, { strokeDashoffset: 0, duration: 1.7, ease: "power2.inOut" }, 0.22);

  const mm = gsap.matchMedia();
  mm.add(
    {
      desktop: "(min-width: 861px)",
      mobile: "(max-width: 860px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { desktop, reduceMotion } = context.conditions;

      if (reduceMotion) {
        gsap.set([".showcase-copy", ".causal-nodes button"], { autoAlpha: 1, clearProps: "transform" });
        if (causalPath) gsap.set(causalPath, { strokeDashoffset: 0 });
        setAgentBeat(0);
        setCausalStep(0, false);
        return;
      }

      const heroExit = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#opening",
          start: "top top",
          end: "bottom top",
          scrub: 0.8,
        },
      });
      heroExit
        .to(".hero-art", { scale: desktop ? 1.08 : 1.04 }, 0)
        .to(".hero-copy", { autoAlpha: 0, y: desktop ? -80 : -36 }, 0)
        .to(".hero-route", { autoAlpha: 0.2 }, 0.18);

      if (desktop) {
        const agentTimeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: "#agent",
            start: "top top",
            end: "+=2100",
            pin: ".agent-stage",
            scrub: 0.8,
            anticipatePin: 1,
            onUpdate: (self) => {
              const beat = Math.min(3, Math.floor(self.progress * 4));
              setAgentBeat(beat);
              if (videoReady && video.duration) {
                const targetTime = Math.min(video.duration - 0.04, self.progress * video.duration);
                if (Math.abs(video.currentTime - targetTime) > 0.04) video.currentTime = targetTime;
              }
            },
          },
        });
        agentTimeline
          .addLabel("arrive", 0)
          .fromTo(".agent-media", { scale: 0.88 }, { scale: 1, duration: 0.34 }, "arrive")
          .fromTo(".agent-copy", { autoAlpha: 0.45, y: 44 }, { autoAlpha: 1, y: 0, duration: 0.28 }, "arrive")
          .to(".video-sheen", { xPercent: 230, duration: 0.22 }, 0.18)
          .addLabel("inspect", 0.38)
          .to(".agent-media", { scale: 0.96, duration: 0.28 }, "inspect")
          .addLabel("resolve", 0.7)
          .to(".agent-media", { scale: 1, duration: 0.3 }, "resolve");

        gsap.fromTo(
          ".archive-frame",
          { scale: 0.88, autoAlpha: 0.35 },
          {
            scale: 1,
            autoAlpha: 1,
            ease: "none",
            scrollTrigger: {
              trigger: "#objects",
              start: "top 85%",
              end: "center 55%",
              scrub: 0.7,
            },
          },
        );

        const causalTimeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: "#causality",
            start: "top top",
            end: "+=2600",
            pin: ".causal-stage",
            scrub: 0.85,
            anticipatePin: 1,
            onUpdate: (self) => {
              setCausalStep(Math.min(5, Math.floor(self.progress * 6)), false);
            },
          },
        });
        gsap.set(".causal-nodes button", { autoAlpha: 0, scale: 0.72 });
        causalTimeline
          .to(".causal-map", { scale: 1.1, duration: 1 }, 0)
          .to(causalPath, { strokeDashoffset: 0, duration: 0.92 }, 0.03)
          .to(
            ".causal-nodes button",
            { autoAlpha: 1, scale: 1, duration: 0.12, stagger: 0.14 },
            0.04,
          );

        const productProof = document.querySelector(".product-proof");
        gsap.set(productProof, { xPercent: -50, yPercent: -50 });
        const showcaseTimeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: "#showcase",
            start: "top top",
            end: "+=2100",
            pin: ".showcase-stage",
            scrub: 0.9,
            anticipatePin: 1,
          },
        });
        showcaseTimeline
          .fromTo(".showcase-scene", { scale: 1.08 }, { scale: 1, duration: 1 }, 0)
          .fromTo(productProof, { scale: 0.88, autoAlpha: 0.72 }, { scale: 1, autoAlpha: 1, duration: 0.28 }, 0)
          .to(productProof, { scale: 0.58, xPercent: -76, yPercent: 4, duration: 0.42 }, 0.38)
          .fromTo(
            ".showcase-copy",
            { autoAlpha: 0, y: 46 },
            { autoAlpha: 1, y: 0, duration: 0.32 },
            0.56,
          )
          .to(".showcase-wash", { autoAlpha: 0.76, duration: 0.3 }, 0.68);

        const heroArt = document.querySelector(".hero-art");
        const hero = document.querySelector(".hero");
        const xTo = gsap.quickTo(heroArt, "x", { duration: 0.8, ease: "power3.out" });
        const yTo = gsap.quickTo(heroArt, "y", { duration: 0.8, ease: "power3.out" });

        const handlePointer = (event) => {
          const rect = hero.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          xTo(x * -18);
          yTo(y * -12);
        };

        const resetPointer = () => {
          xTo(0);
          yTo(0);
        };

        hero.addEventListener("pointermove", handlePointer);
        hero.addEventListener("pointerleave", resetPointer);

        return () => {
          hero.removeEventListener("pointermove", handlePointer);
          hero.removeEventListener("pointerleave", resetPointer);
        };
      }

      gsap.set([".showcase-copy", ".causal-nodes button"], { autoAlpha: 1 });
      if (causalPath) gsap.set(causalPath, { strokeDashoffset: 0 });

      [".agent-copy", ".agent-proof", ".archive-heading", ".archive-frame", ".causal-heading", ".showcase-copy", ".product-proof"].forEach(
        (selector) => {
          gsap.from(selector, {
            autoAlpha: 0,
            y: 26,
            duration: 0.75,
            scrollTrigger: {
              trigger: selector,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          });
        },
      );
    },
  );

  function setActiveNavigation(section) {
    const id = section.id;
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  sections.forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top 35%",
      end: "+=1",
      onEnter: () => setActiveNavigation(section),
      onEnterBack: () => setActiveNavigation(section),
    });
  });

  const imagePromises = Array.from(document.images).map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  });

  const fontPromise = document.fonts?.ready || Promise.resolve();
  Promise.allSettled([...imagePromises, fontPromise]).then(() => {
    ScrollTrigger.refresh();
    document.body.classList.add("is-ready");
  });

  window.addEventListener("pagehide", () => mm.revert(), { once: true });
})();
