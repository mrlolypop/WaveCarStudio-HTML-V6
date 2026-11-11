/* ============================================================================
   Wave Car Studio — static build layer
   ----------------------------------------------------------------------------
   The React app shipped four interactive pieces. This file re-implements the
   same behaviour in plain JavaScript, one section per component:

     SiteHeader.tsx        -> header state + mobile menu
     Reveal.tsx            -> scroll-in reveal
     CalibrationPanel.tsx  -> factory / calibrated switch
     contact.tsx           -> enquiry form (Cloudflare Function + mail fallback)
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------- *
   * Configuration
   * ---------------------------------------------------------------------- */

  var CONTACTS = {
    phone: "+91 98189 81161",
    phoneHref: "tel:+919818981161",
    email: "audit@wavecarstudio.co.in",
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------------------------------------------------------------------- *
   * SiteHeader.tsx
   * ---------------------------------------------------------------------- */

  var header = document.querySelector(".site-header");
  var overlay = header ? header.getAttribute("data-overlay") === "true" : false;
  var menuToggle = document.getElementById("menu-toggle");
  var mobileNav = document.getElementById("mobile-nav");

  function menuIsOpen() {
    return menuToggle ? menuToggle.getAttribute("aria-expanded") === "true" : false;
  }

  function syncHeader() {
    if (!header) return;
    var solid = !overlay || window.scrollY > 16 || menuIsOpen();
    header.classList.toggle("is-solid", solid);
  }

  function setMenu(open) {
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    if (mobileNav) {
      mobileNav.setAttribute("data-open", open ? "true" : "false");
    }
    document.body.style.overflow = open ? "hidden" : "";
    syncHeader();
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      setMenu(!menuIsOpen());
    });
  }

  /* Close the drawer after tapping a link (React did this with onClick). */
  if (mobileNav) {
    mobileNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 768 && menuIsOpen()) setMenu(false);
  });

  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();

  /* ---------------------------------------------------------------------- *
   * Reveal.tsx
   * ---------------------------------------------------------------------- */

  var revealTargets = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("reveal-pending");
          entry.target.classList.add("is-shown");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );

    revealTargets.forEach(function (el) {
      /* Anything above the fold shows straight away, as in the React version. */
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add("is-shown");
      } else {
        el.classList.add("reveal-pending");
        observer.observe(el);
      }
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("is-shown");
    });
  }

  /* ---------------------------------------------------------------------- *
   * CalibrationPanel.tsx
   * ---------------------------------------------------------------------- */

  var panel = document.querySelector("[data-calibration]");

  if (panel) {
    var bars = panel.querySelectorAll("[data-factory]");
    var readouts = panel.querySelectorAll("[data-before]");
    var tabs = panel.querySelectorAll('[role="tab"]');
    var calibrated = false;

    var paint = function () {
      tabs.forEach(function (tab) {
        var active = (tab.getAttribute("data-state") === "tuned") === calibrated;
        tab.setAttribute("aria-selected", active ? "true" : "false");
        tab.classList.toggle("bg-primary", active);
        tab.classList.toggle("text-primary-foreground", active);
        tab.classList.toggle("text-muted-foreground", !active);
        tab.classList.toggle("hover:text-foreground", !active);
      });

      bars.forEach(function (bar) {
        bar.style.height = (calibrated ? bar.dataset.tuned : bar.dataset.factory) + "%";
        bar.classList.toggle("bg-primary", calibrated);
        bar.classList.toggle("bg-foreground/80", !calibrated);
      });

      readouts.forEach(function (dd) {
        dd.textContent = calibrated ? dd.dataset.after : dd.dataset.before;
        dd.classList.toggle("text-primary", calibrated);
        dd.classList.toggle("text-foreground/80", !calibrated);
      });
    };

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        calibrated = tab.getAttribute("data-state") === "tuned";
        paint();
      });
    });

    paint();
  }

  /* ---------------------------------------------------------------------- *
   * contact.tsx -> enquiry form
   * ---------------------------------------------------------------------- *
   * The form POSTs JSON to Web3Forms (https://api.web3forms.com/submit),
   * which emails audit@wavecarstudio.co.in. If that endpoint is unreachable,
   * the visitor's mail app opens with the enquiry prefilled so nothing is
   * lost. Non-JS submits post the form natively and Web3Forms redirects back
   * to /contact?sent=1, which this script then shows as the sent state.
   */

  var form = document.querySelector("[data-enquiry-form]");

  if (form) {
    var statusEl = form.querySelector("[data-form-status]");
    var submitButton = form.querySelector('button[type="submit"]');
    var submitLabel = form.querySelector("[data-submit-label]");
    var endpoint = form.getAttribute("action") || "https://api.web3forms.com/submit";
    var sending = false;

    var setStatus = function (state, message) {
      if (!statusEl) return;
      statusEl.setAttribute("data-state", state);
      if (message) {
        statusEl.textContent = message;
      } else if (state === "sent") {
        statusEl.textContent =
          "Thank you — your enquiry has been sent. We will reply by phone or email.";
      } else if (state === "sending") {
        statusEl.textContent = "Sending your enquiry…";
      } else if (state === "error") {
        statusEl.innerHTML =
          'The form could not send just now. Please email <a class="text-primary hover:underline" href="mailto:' +
          CONTACTS.email +
          '">' +
          CONTACTS.email +
          '</a> or call <a class="text-primary hover:underline" href="' +
          CONTACTS.phoneHref +
          '">' +
          CONTACTS.phone +
          "</a>.";
      } else {
        statusEl.textContent =
          "Your details are emailed to " + CONTACTS.email + ". We reply by phone or email.";
      }
    };

    /* Non-JS submit returns to /contact?sent=1 (or ?error=1). */
    var params = new URLSearchParams(window.location.search);
    if (params.get("sent") === "1") {
      setStatus("sent");
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } else if (params.get("error") === "1") {
      setStatus("error");
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    var openMailFallback = function (name, contact, vehicle, service, message) {
      var subject = "Enquiry — " + name + (service ? " · " + service : "");
      var body = [
        "Name: " + name,
        "Contact: " + contact,
        "Vehicle: " + (vehicle || "—"),
        "Service: " + (service || "Not sure yet"),
        "",
        message || "—",
      ].join("\n");

      window.location.href =
        "mailto:" +
        CONTACTS.email +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (sending) return;

      var fd = new FormData(form);
      var name = String(fd.get("name") || "").trim();
      var contact = String(fd.get("contact") || "").trim();
      var vehicle = String(fd.get("vehicle") || "").trim();
      var service = String(fd.get("service") || "").trim();
      var message = String(fd.get("message") || "").trim();

      if (!name || !contact) {
        setStatus("error", "Please add your name and a phone number or email.");
        return;
      }

      sending = true;
      if (submitButton) submitButton.disabled = true;
      if (submitLabel) submitLabel.textContent = "Sending…";
      setStatus("sending");

      // Send every field the form carries (access_key, subject, from_name,
      // botcheck, name, contact, vehicle, service, message).
      var payload = {};
      fd.forEach(function (value, key) {
        payload[key] = value;
      });
      // Web3Forms returns JSON for AJAX calls; `redirect` only applies to
      // non-JavaScript submits.
      delete payload.redirect;
      // Give the enquiry a Reply-To when the visitor left an email address.
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
        payload.replyto = contact;
      }

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (payload) {
            if (!res.ok || payload.success === false) {
              throw new Error(payload.message || "Request failed: " + res.status);
            }
            return payload;
          });
        })
        .then(function () {
          form.reset();
          setStatus("sent");
        })
        .catch(function () {
          /* Endpoint unreachable (e.g. plain static preview): open the mail
             app with the enquiry ready to send, so it is never lost. */
          openMailFallback(name, contact, vehicle, service, message);
          setStatus(
            "fallback",
            "Your email app should open with the details ready to send to " +
              CONTACTS.email +
              ". If it does not open, email us or call " +
              CONTACTS.phone +
              ".",
          );
        })
        .finally(function () {
          sending = false;
          if (submitButton) submitButton.disabled = false;
          if (submitLabel) submitLabel.textContent = "Submit Enquiry";
        });
    });
  }

  /* ---------------------------------------------------------------------- *
   * Footer year (React used new Date().getFullYear())
   * ---------------------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
