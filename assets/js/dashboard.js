const navButtons = document.querySelectorAll(".nav-btn");
const sections = document.querySelectorAll(".section");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    navButtons.forEach(b => b.classList.remove("active"));
    sections.forEach(s => s.classList.remove("active"));

    btn.classList.add("active");
    const target = btn.dataset.target;
    if (target) document.getElementById(target).classList.add("active");
  });
});
