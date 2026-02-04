$(function () {

    // Header Scroll
    $(window).scroll(function () {
        if ($(window).scrollTop() >= 60) {
            $("header").addClass("fixed-header");
        } else {
            $("header").removeClass("fixed-header");
        }
    });

    


    // Featured Owl Carousel
    $('.featured-projects-slider .owl-carousel').owlCarousel({
        center: true,
        loop: true,
        margin: 30,
        nav: false,
        dots: false,
        autoplay: true,
        autoplayTimeout: 5000,
        autoplayHoverPause: false,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 2
            },
            1000: {
                items: 3
            },
            1200: {
                items: 4
            }
        }
    })


    // Count - animate to `data-target` when element is visible
    function animateCount(el) {
        var $el = $(el);
        var target = parseInt($el.attr('data-target')) || 0;
        $el.prop('Counter', 0).animate({
            Counter: target
        }, {
            duration: 1500,
            easing: 'swing',
            step: function (now) {
                $(this).text(Math.ceil(now));
            }
        });
    }

    // Use IntersectionObserver to start the animation when visible (fallback to immediate animation)
    if ('IntersectionObserver' in window) {
        var counterObserver = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCount(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        $('.count').each(function () {
            $(this).text('0');
            counterObserver.observe(this);
        });
    } else {
        $('.count').each(function () {
            $(this).text('0');
            animateCount(this);
        });
    }


    // ScrollToTop
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    const btn = document.getElementById("scrollToTopBtn");
    btn.addEventListener("click", scrollToTop);

    window.onscroll = function () {
        const btn = document.getElementById("scrollToTopBtn");
        if (document.documentElement.scrollTop > 100 || document.body.scrollTop > 100) {
            btn.style.display = "flex";
        } else {
            btn.style.display = "none";
        }
    };


    // Ensure menu links navigate immediately (fix double-tap issue on some devices)
    $(document).on('click', '.header-menu .header-link', function(e){
        var href = $(this).attr('href');
        if (!href || href === '#' || href.indexOf('javascript:') === 0) return;
        e.preventDefault();
        if ($(this).attr('target') === '_blank') {
            window.open(href, '_blank');
        } else {
            window.location.href = href;
        }
    });

    // Aos
	AOS.init({
		once: true,
	});

});
document.addEventListener("DOMContentLoaded", function () {

  const form = document.getElementById("appointmentForm");
  if (!form) return;

  const status = document.getElementById("form-status");
  const button = form.querySelector("button");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    button.classList.add("loading");

    const data = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: data,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        status.textContent = "✅ Appointment sent successfully!";
        status.className = "form-status success show";
        form.reset();
      } else {
        throw new Error();
      }
    } catch (error) {
      status.textContent = "❌ Something went wrong. Please try again.";
      status.className = "form-status error show";
    }

    button.classList.remove("loading");
  });

});
document.addEventListener("DOMContentLoaded", function () {

  const form = document.getElementById("appointmentForm");
  if (!form) return;

  const status = document.getElementById("form-status");
  const statusText = status.querySelector(".status-text");
  const button = form.querySelector("button");

  let hideTimeout;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    button.classList.add("loading");
    status.className = "form-status";
    statusText.textContent = "";
    clearTimeout(hideTimeout);

    const data = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: data,
        headers: { Accept: "application/json" }
      });

      if (response.ok) {
        statusText.textContent = "Appointment sent successfully!";
        status.className = "form-status success show";
        form.reset();

        // AUTO-HIDE AFTER 10 SECONDS
        hideTimeout = setTimeout(() => {
          status.classList.remove("show");
        }, 10000);

      } else {
        throw new Error();
      }

    } catch {
      statusText.textContent = "Something went wrong. Please try again.";
      status.className = "form-status error show";

      hideTimeout = setTimeout(() => {
        status.classList.remove("show");
      }, 10000);
    }

    button.classList.remove("loading");
  });

});
document.addEventListener("DOMContentLoaded", function() {

  // Get all header links
  const links = document.querySelectorAll(".header-link");

  // Get current page filename
  const currentPage = window.location.pathname.split("/").pop();

  links.forEach(link => {
    const linkHref = link.getAttribute("href");

    // If href matches current page, add spin
    if(linkHref === currentPage) {
      const icon = link.querySelector("img");
      if(icon) {
        icon.classList.add("animate-spin");
      }
    }
  });

});
document.addEventListener("DOMContentLoaded", function () {
  const uploadInput = document.querySelector('input[type="file"][name="attachment"]');
  const uploadText = document.querySelector(".upload-text");

  if (!uploadInput || !uploadText) return;

  uploadInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      uploadText.textContent = this.files[0].name;
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".auth-tab");
  const forms = document.querySelectorAll(".auth-form");
  const indicator = document.querySelector(".auth-indicator");

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      forms.forEach(f => f.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");

      indicator.style.transform = `translateX(${index * 100}%)`;
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const bgVideo = document.querySelector(".auth-video");

  if (!bgVideo) return;

  // Force video playback on page load
  const playVideo = () => {
    bgVideo.play().catch(() => {
      // Fallback retry after user interaction
      document.addEventListener(
        "click",
        () => bgVideo.play(),
        { once: true }
      );
    });
  };

  playVideo();

  // Resume video if tab becomes active again
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      bgVideo.play().catch(() => {});
    }
  });
});


