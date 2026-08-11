const concepts = Array.from(document.querySelectorAll(".concept"));
const navButtons = Array.from(document.querySelectorAll(".direction-nav button"));
const choiceButtons = Array.from(document.querySelectorAll(".select-direction"));
const progress = document.querySelector(".scroll-progress span");
const status = document.querySelector(".selection-status");
const dialog = document.querySelector(".reference-dialog");
const dialogTrigger = document.querySelector(".reference-trigger");
const dialogClose = document.querySelector(".dialog-close");

let activeConcept = "A";
let statusTimer = 0;

function setActive(concept) {
  activeConcept = concept.dataset.concept;
  document.body.dataset.active = activeConcept;

  navButtons.forEach((button) => {
    button.setAttribute(
      "aria-current",
      button.dataset.target === concept.id ? "true" : "false",
    );
  });
}

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) setActive(visible.target);
  },
  { threshold: [0.35, 0.55, 0.75] },
);

concepts.forEach((concept) => sectionObserver.observe(concept));

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.target)?.scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;

    event.preventDefault();
    history.replaceState(null, "", link.hash);
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  });
});

function applySelectedChoice(choice, announce = false) {
  choiceButtons.forEach((button) => {
    const selected = button.dataset.choice === choice;
    button.dataset.selected = String(selected);
    button.textContent = selected ? "已选择此方向" : "选择此方向";
  });

  if (!announce || !choice) return;

  window.clearTimeout(statusTimer);
  status.textContent = `已记录方向 ${choice}`;
  status.classList.add("is-visible");
  statusTimer = window.setTimeout(() => status.classList.remove("is-visible"), 2200);
}

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const choice = button.dataset.choice;
    localStorage.setItem("novelx-way1-choice", choice);
    applySelectedChoice(choice, true);
  });
});

applySelectedChoice(localStorage.getItem("novelx-way1-choice"));

function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const value = scrollable > 0 ? window.scrollY / scrollable : 0;
  progress.style.transform = `scaleX(${Math.min(1, Math.max(0, value))})`;
}

window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

window.addEventListener("load", () => {
  const initialTarget = document.getElementById(window.location.hash.slice(1));
  if (!initialTarget) return;

  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  const previousScrollSnapType = document.documentElement.style.scrollSnapType;
  document.documentElement.style.scrollBehavior = "auto";
  document.documentElement.style.scrollSnapType = "none";
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: initialTarget.offsetTop, behavior: "instant" });
    window.requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
      document.documentElement.style.scrollSnapType = previousScrollSnapType;
    });
  });
});

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  concepts.forEach((concept) => {
    const image = concept.querySelector(".concept-backdrop");

    concept.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const rect = concept.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      image.style.transform = `translate3d(${x * -12}px, ${y * -8}px, 0) scale(1.025)`;
    });

    concept.addEventListener("pointerleave", () => {
      image.style.transform = "translate3d(0, 0, 0) scale(1.015)";
    });
  });
}

dialogTrigger.addEventListener("click", () => dialog.showModal());
dialogClose.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.addEventListener("keydown", (event) => {
  if (dialog.open) return;
  if (event.key >= "1" && event.key <= "3") {
    concepts[Number(event.key) - 1]?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  const activeIndex = concepts.findIndex((concept) => concept.dataset.concept === activeConcept);
  if (event.key === "ArrowDown" || event.key === "PageDown") {
    concepts[Math.min(concepts.length - 1, activeIndex + 1)]?.scrollIntoView({ behavior: "smooth" });
  }
  if (event.key === "ArrowUp" || event.key === "PageUp") {
    concepts[Math.max(0, activeIndex - 1)]?.scrollIntoView({ behavior: "smooth" });
  }
});
