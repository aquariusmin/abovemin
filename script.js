window.onload = function() {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("img01");
    const closeBtn = document.querySelector(".close");
    const images = document.querySelectorAll(".gallery-img");

    if (modal && modalImg && closeBtn) {
        images.forEach(img => {
            img.onclick = function() {
                modal.style.display = "flex";
                modalImg.src = this.src;
                document.body.style.overflow = "hidden"; // 스크롤 방지
            }
        });

        closeBtn.onclick = function() {
            modal.style.display = "none";
            document.body.style.overflow = "auto";
        }

        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.style.display = "none";
                document.body.style.overflow = "auto";
            }
        }
    }
};