import gsap from "gsap";

/**
 * Animates a number from 0 to endValue inside an element.
 * Formats with locale commas and optional prefix/suffix.
 */
export function animateCountUp(
  element: HTMLElement,
  endValue: number,
  duration = 1.8,
  prefix = "",
  suffix = ""
) {
  const obj = { val: 0 };
  gsap.to(obj, {
    val: endValue,
    duration,
    ease: "power2.out",
    onUpdate() {
      element.textContent = `${prefix}${obj.val.toLocaleString("en-PH", {
        maximumFractionDigits: 2,
      })}${suffix}`;
    },
  });
}

/**
 * Stagger fade-in + slide-up for elements matching selector.
 */
export function animateStaggerCards(selector: string, delay = 0) {
  gsap.fromTo(
    selector,
    { y: 30, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.5,
      stagger: 0.08,
      ease: "power3.out",
      delay,
    }
  );
}

/**
 * Slide an element in from a given direction.
 */
export function animateSlideIn(
  element: HTMLElement,
  direction: "left" | "right" | "up" | "down" = "up"
) {
  const from: gsap.TweenVars = { opacity: 0 };

  switch (direction) {
    case "left":
      from.x = -40;
      break;
    case "right":
      from.x = 40;
      break;
    case "up":
      from.y = 30;
      break;
    case "down":
      from.y = -30;
      break;
  }

  gsap.fromTo(element, from, {
    x: 0,
    y: 0,
    opacity: 1,
    duration: 0.4,
    ease: "power3.out",
  });
}

/**
 * Orchestrates a full page entrance animation:
 * 1. Header fades in
 * 2. KPI cards stagger in
 * 3. Charts fade in
 * 4. Tables slide up
 */
export function animatePageEntrance(containerSelector: string) {
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.fromTo(
    `${containerSelector} [data-animate="header"]`,
    { y: -20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4 }
  );

  tl.fromTo(
    `${containerSelector} [data-animate="kpi"]`,
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 },
    "-=0.15"
  );

  tl.fromTo(
    `${containerSelector} [data-animate="chart"]`,
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
    "-=0.2"
  );

  tl.fromTo(
    `${containerSelector} [data-animate="table"]`,
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
    "-=0.15"
  );

  return tl;
}
