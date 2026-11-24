/* ==========================================================================
   Personal Portfolio – Mehnaj Waish Shah
   File: js/script.js   (vanilla JavaScript – no libraries or frameworks)

   WHAT THIS FILE DOES
    0. SITE_CONFIG          – switch on your photo, CV, project images and links
    1. Navigation           – mobile hamburger menu (open / close / Escape)
    2. Smooth scrolling     – in-page links glide to their section
    3. Scroll effects       – header style, active menu link, back-to-top button
    4. Scroll reveal        – cards fade in using IntersectionObserver
    5. Contact form         – validation + opening the visitor's email app
    6. Optional assets      – photo / CV / project images / extra links
    7. Footer year          – © year is generated automatically

   HOW IT IS BUILT
   Everything lives inside one function so no variables leak into the global
   scope. Each feature is its own small function (a "module"), and they are all
   started once from init() at the bottom, so no event listener is registered
   twice. Every function first checks that the elements it needs exist, so a
   missing element can never cause a JavaScript error.
   ========================================================================== */
(() => {
  'use strict';

  /* ========================================================================
     0. SITE CONFIG  –  the only part you normally need to edit
     ------------------------------------------------------------------------
     Add your real files first (see README.md), then change  enabled: false
     to  enabled: true  for that item. Nothing is shown or requested until
     you do, so the live site never displays broken images or dead links.
     ======================================================================== */
  const SITE_CONFIG = {
    // Hero profile photo – put the file at assets/profile.jpg
    profilePhoto: { enabled: true, path: 'profile.jpg' },

    // "Download CV" button – put the file at assets/Mehnaj-CV.pdf
    cv: { enabled: false, path: 'assets/Mehnaj-CV.pdf', downloadName: 'Mehnaj-Waish-Shah-CV.pdf' },

    // One entry per project. The key must match data-project="…" in index.html.
    projects: {
      'scamshield': {
        image: { enabled: false, path: 'images/project-scamshield.png' },
        repoUrl: '',      // e.g. 'https://github.com/your-username/your-repo' (leave '' to hide the button)
        detailsUrl: ''    // not used by this card
      },
      'graph-theory': {
        image: { enabled: false, path: 'images/project-graph-theory.png' },
        repoUrl: '',      // not used by this card
        detailsUrl: ''    // e.g. 'https://…' or 'projects/graph-theory.html' (leave '' to hide the button)
      }
    }
  };

  /* Small settings used by several features */
  const SETTINGS = {
    backToTopAfter: 600,      // px scrolled before the back-to-top button appears
    headerShadowAfter: 8,     // px scrolled before the header gets its border/shadow
    form: {
      minName: 2,
      minSubject: 3,
      minMessage: 20,
      maxMessage: 1000
    }
  };


  /* ========================================================================
     HELPERS
     ======================================================================== */

  // Short names for the two DOM search methods
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  // True when the visitor has asked their device for less motion
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');

  // Accepts normal web links and relative paths, rejects things like "javascript:…"
  const isSafeUrl = (value) => {
    if (typeof value !== 'string' || value.trim() === '') return false;
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value.trim());
    return hasScheme ? /^https?:\/\//i.test(value.trim()) : true;
  };


  /* ========================================================================
     1. NAVIGATION – mobile hamburger menu
     ======================================================================== */
  function initNavigation() {
    const toggle = $('#nav-toggle');
    const menu = $('#primary-nav');
    if (!toggle || !menu) return;

    const isOpen = () => menu.classList.contains('is-open');

    // One function opens or closes the menu and keeps ARIA in sync
    const setOpen = (open, { returnFocus = false } = {}) => {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (!open && returnFocus) toggle.focus();
    };

    // Hamburger button toggles the menu
    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // Selecting any link inside the menu closes it (event delegation:
    // one listener on the menu instead of one per link)
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    // Escape closes the menu and gives focus back to the hamburger button
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) setOpen(false, { returnFocus: true });
    });

    // Clicking anywhere outside the open menu closes it
    document.addEventListener('click', (event) => {
      if (isOpen() && !menu.contains(event.target) && !toggle.contains(event.target)) {
        setOpen(false);
      }
    });

    // If the window grows to desktop width, reset the mobile menu state
    const desktopQuery = window.matchMedia('(min-width: 60em)');
    desktopQuery.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }


  /* ========================================================================
     2. SMOOTH SCROLLING for in-page links such as <a href="#about">
     ======================================================================== */
  function initSmoothScroll() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute('href');
      if (hash.length < 2) return;                       // a bare "#" does nothing special

      let id;
      try { id = decodeURIComponent(hash.slice(1)); } catch (error) { return; }
      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });

      // Keep the address bar in sync (#about) so the link can be shared
      try { window.history.pushState(null, '', hash); } catch (error) { /* ignore (e.g. some file:// setups) */ }

      // Move keyboard focus to the section so Tab continues from there
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }


  /* ========================================================================
     3. SCROLL EFFECTS – header style, active menu link, back-to-top button
     One scroll listener does all three jobs, and requestAnimationFrame
     makes sure the work runs at most once per screen refresh.
     ======================================================================== */
  function initScrollEffects() {
    const header = $('#site-header');
    const backToTop = $('#back-to-top');

    // Pair every menu link with the section it points to
    const items = $$('.primary-nav .nav-link[href^="#"]')
      .map((link) => ({ link, section: document.getElementById(link.getAttribute('href').slice(1)) }))
      .filter((item) => item.section);

    let currentId = null;
    let ticking = false;

    const setActive = (id) => {
      if (id === currentId) return;
      currentId = id;
      items.forEach(({ link, section }) => {
        const active = section.id === id;
        link.classList.toggle('is-active', active);
        if (active) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    const update = () => {
      ticking = false;
      const scrollY = window.scrollY || document.documentElement.scrollTop;

      if (header) header.classList.toggle('is-scrolled', scrollY > SETTINGS.headerShadowAfter);
      if (backToTop) backToTop.classList.toggle('is-visible', scrollY > SETTINGS.backToTopAfter);

      if (!items.length) return;

      // The last section whose top has passed the "reading line" is the active one
      const headerHeight = header ? header.offsetHeight : 0;
      const readingLine = headerHeight + window.innerHeight * 0.3;
      let activeId = items[0].section.id;
      items.forEach(({ section }) => {
        if (section.getBoundingClientRect().top <= readingLine) activeId = section.id;
      });

      // Scrolled to the very bottom: the last section is always the active one
      const atBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) activeId = items[items.length - 1].section.id;

      setActive(activeId);
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    update();                                            // run once on load

    // Back-to-top button
    if (backToTop) {
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        const brand = $('.site-header .brand');          // send keyboard focus to the top too
        if (brand) brand.focus({ preventScroll: true });
      });
    }
  }


  /* ========================================================================
     4. SCROLL REVEAL – elements marked data-reveal fade in when scrolled to
     ======================================================================== */
  function initRevealAnimations() {
    const items = $$('[data-reveal]');
    if (!items.length) return;

    // No animation for reduced-motion visitors or very old browsers:
    // the content simply stays visible.
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

    // Hide the elements first (the .reveal class), then reveal them one by one
    items.forEach((element) => {
      element.classList.add('reveal');
      const delay = Number(element.dataset.revealDelay);
      if (delay > 0) element.style.setProperty('--reveal-delay', `${delay}ms`);
    });

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        element.classList.add('is-visible');
        obs.unobserve(element);                          // each element only needs to animate once

        // When the fade-in has finished, remove the helper classes so the
        // element behaves normally again (e.g. card hover effects).
        const cleanUp = (transitionEvent) => {
          if (transitionEvent.target !== element || transitionEvent.propertyName !== 'opacity') return;
          element.classList.remove('reveal', 'is-visible');
          element.style.removeProperty('--reveal-delay');
          element.removeEventListener('transitionend', cleanUp);
        };
        element.addEventListener('transitionend', cleanUp);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach((element) => observer.observe(element));
  }


  /* ========================================================================
     5. CONTACT FORM – validation and mailto submission
     ------------------------------------------------------------------------
     IMPORTANT: this site has no backend/server, so JavaScript cannot send an
     email by itself. After the form is valid we open the visitor's email app
     with a ready-made message (a "mailto:" link). The visitor presses Send
     there. The success message says exactly this, so nothing is claimed
     that did not happen. To receive messages directly from the page you would
     need a backend or an email service (e.g. Formspree, EmailJS).
     ======================================================================== */
  function initContactForm() {
    const form = $('#contact-form');
    if (!form) return;

    // Our own messages replace the browser's pop-up bubbles. (If JavaScript
    // is off, this line never runs and the browser's validation still works.)
    form.noValidate = true;

    const status = $('#form-status');
    const counter = $('#message-count');
    const recipient = form.dataset.recipient || '';
    const rules = SETTINGS.form;

    const fields = ['name', 'email', 'subject', 'message']
      .map((id) => $(`#${id}`, form))
      .filter(Boolean);

    // Letters from any language, then letters/spaces/dots/hyphens/apostrophes
    const NAME_PATTERN = /^\p{L}[\p{L}\s.'’-]*$/u;
    // name@domain.tld – no spaces, exactly one @, at least a 2-letter ending
    const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

    /* ---- Clean-up helpers: protect against odd or malformed input ---- */
    // One-line fields: turn control characters/new lines into spaces, trim, collapse spaces
    const cleanLine = (value) => value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
    // Message: keep normal new lines, drop other invisible control characters
    const cleanMessage = (value) => value
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim();
    const getValue = (field) => (field.id === 'message' ? cleanMessage(field.value) : cleanLine(field.value));

    /* ---- One validator per field: returns an error message, or '' if valid ---- */
    const validators = {
      name(value) {
        if (!value) return 'Please enter your full name.';
        if (value.length < rules.minName) return `Your name needs at least ${rules.minName} characters.`;
        if (!NAME_PATTERN.test(value)) return 'Use letters, spaces, hyphens, apostrophes and full stops only.';
        return '';
      },
      email(value) {
        if (!value) return 'Please enter your email address.';
        if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email address, for example name@example.com.';
        return '';
      },
      subject(value) {
        if (!value) return 'Please enter a subject.';
        if (value.length < rules.minSubject) return `The subject needs at least ${rules.minSubject} characters.`;
        return '';
      },
      message(value) {
        if (!value) return 'Please write a message.';
        if (value.length < rules.minMessage) {
          return `Your message needs at least ${rules.minMessage} characters (it has ${value.length}).`;
        }
        if (value.length > rules.maxMessage) return `Please keep your message under ${rules.maxMessage} characters.`;
        return '';
      }
    };

    /* ---- Show or clear the inline error for one field ---- */
    const setFieldError = (field, message) => {
      const errorElement = document.getElementById(`${field.id}-error`);
      if (message) {
        field.setAttribute('aria-invalid', 'true');
        if (errorElement) { errorElement.textContent = message; errorElement.hidden = false; }
      } else {
        field.removeAttribute('aria-invalid');
        if (errorElement) { errorElement.textContent = ''; errorElement.hidden = true; }
      }
    };

    const validateField = (field) => {
      const validator = validators[field.id];
      const message = validator ? validator(getValue(field)) : '';
      setFieldError(field, message);
      return message === '';
    };

    /* ---- Form-level status message (success / error) ---- */
    const clearStatus = () => {
      if (!status) return;
      status.replaceChildren();
      status.className = 'form-status';
    };

    const showStatus = (type, title, text, extraNodes = []) => {
      if (!status) return;
      clearStatus();
      status.classList.add(`form-status--${type}`);
      const heading = document.createElement('strong');
      heading.textContent = title;                       // textContent (not innerHTML) = safe
      const body = document.createElement('span');
      body.textContent = text;
      status.append(heading, body, ...extraNodes);
    };

    /* ---- Live character counter ---- */
    const messageField = $('#message', form);
    const updateCounter = () => {
      if (counter && messageField) counter.textContent = `${messageField.value.length} / ${rules.maxMessage}`;
    };

    /* ---- Field events: validate when leaving a field, then keep checking as they type ---- */
    fields.forEach((field) => {
      field.addEventListener('blur', () => {
        field.dataset.touched = 'true';
        validateField(field);
      });
      field.addEventListener('input', () => {
        if (field === messageField) updateCounter();
        if (field.dataset.touched === 'true') validateField(field);
      });
    });
    updateCounter();

    /* ---- Submit ---- */
    form.addEventListener('submit', (event) => {
      event.preventDefault();                            // stop the page from reloading
      clearStatus();

      // Validate EVERY field (so all errors show at once), then collect the invalid ones
      const invalidFields = fields.filter((field) => {
        field.dataset.touched = 'true';
        return !validateField(field);
      });

      if (invalidFields.length > 0) {
        const count = invalidFields.length;
        showStatus(
          'error',
          'Please check the form',
          count === 1 ? '1 field needs your attention.' : `${count} fields need your attention.`
        );
        invalidFields[0].focus();                        // jump to the first problem
        return;
      }

      // All good – build the email
      const values = {
        name: getValue($('#name', form)),
        email: getValue($('#email', form)),
        subject: getValue($('#subject', form)),
        message: getValue(messageField)
      };

      const subject = `[Portfolio] ${values.subject}`;
      const body = `Hi Mehnaj,\n\n${values.message}\n\n— ${values.name}\nReply to: ${values.email}`;
      const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Honest feedback: we can only OPEN the email app, we cannot send for them
      const fallbackLink = document.createElement('a');
      fallbackLink.href = `mailto:${recipient}`;
      fallbackLink.textContent = recipient;
      showStatus(
        'success',
        'Your email app should open now',
        'Your message is ready to go – please press Send in your email app to deliver it. This portfolio is a static website with no server, so nothing is sent from this page itself. If nothing opened, email me directly at ',
        [fallbackLink, document.createTextNode('.')]
      );

      window.location.href = mailto;
    });
  }


  /* ========================================================================
     6. OPTIONAL ASSETS – photo, CV, project images and extra project links
        Controlled by SITE_CONFIG at the top of this file.
     ======================================================================== */

  // Adds an <img> next to its placeholder. The placeholder is hidden only
  // after the image has really loaded; if loading fails the image is removed
  // and the placeholder stays.
  function mountImage(container, placeholder, options) {
    const image = document.createElement('img');
    image.className = options.className || '';
    image.alt = options.alt;
    image.width = options.width;
    image.height = options.height;
    image.decoding = 'async';
    image.loading = options.eager ? 'eager' : 'lazy';    // below-the-fold images load lazily

    image.addEventListener('load', () => {
      image.classList.add('is-loaded');
      if (placeholder) placeholder.hidden = true;
    }, { once: true });
    image.addEventListener('error', () => image.remove(), { once: true });

    image.src = options.src;
    container.appendChild(image);
  }

  function initOptionalAssets() {
    // Hero profile photo
    const photoFrame = $('#profile-photo-frame');
    const photoPlaceholder = $('#profile-photo-placeholder');
    const photo = SITE_CONFIG.profilePhoto;
    if (photoFrame && photo && photo.enabled && photo.path) {
      mountImage(photoFrame, photoPlaceholder, {
        src: photo.path,
        alt: 'Portrait of Mehnaj Waish Shah',
        className: 'photo-img',
        width: 640,
        height: 640,
        eager: true                                      // it is at the top of the page
      });
    }

    // "Download CV" button
    const cvLink = $('#cv-download');
    const cv = SITE_CONFIG.cv;
    if (cvLink && cv && cv.enabled && cv.path) {
      cvLink.href = cv.path;
      cvLink.setAttribute('download', cv.downloadName || '');
      cvLink.hidden = false;
    }

    // Project cards
    $$('[data-project]').forEach((card) => {
      const config = SITE_CONFIG.projects[card.dataset.project];
      if (!config) return;

      // Screenshot
      const media = $('[data-project-media]', card);
      const placeholder = $('.media-placeholder', card);
      if (media && config.image && config.image.enabled && config.image.path) {
        mountImage(media, placeholder, {
          src: config.image.path,
          alt: media.dataset.imageAlt || '',
          width: 1280,
          height: 720
        });
      }

      // GitHub repository button
      const repoLink = $('[data-project-repo]', card);
      if (repoLink && isSafeUrl(config.repoUrl)) {
        repoLink.href = config.repoUrl;
        repoLink.hidden = false;
      }

      // Details button
      const detailsLink = $('[data-project-details]', card);
      if (detailsLink && isSafeUrl(config.detailsUrl)) {
        detailsLink.href = config.detailsUrl;
        if (/^https?:\/\//i.test(config.detailsUrl)) {   // external page: open in a new tab
          detailsLink.target = '_blank';
          detailsLink.rel = 'noopener noreferrer';
        }
        detailsLink.hidden = false;
      }
    });
  }


  /* ========================================================================
     7. FOOTER YEAR
     ======================================================================== */
  function initFooterYear() {
    const yearElement = $('#current-year');
    if (yearElement) yearElement.textContent = String(new Date().getFullYear());
  }


  /* ========================================================================
     START EVERYTHING (once)
     ======================================================================== */
  let started = false;

  function init() {
    if (started) return;                                 // guards against running twice
    started = true;

    initNavigation();
    initSmoothScroll();
    initScrollEffects();
    initRevealAnimations();
    initContactForm();
    initOptionalAssets();
    initFooterYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
