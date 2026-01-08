window.onload = function() {
    // 갤러리 로드
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid && typeof galleryData !== 'undefined') {
        galleryData.forEach(p => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `<div class="img-wrapper"><img src="${p.src}" class="gallery-img"></div>
                <div class="photo-info"><span>${p.title}</span><span style="color:#444">${p.location}</span></div>`;
            galleryGrid.appendChild(item);
            item.querySelector('img').onclick = function() {
                const modal = document.getElementById("imageModal");
                document.getElementById("img01").src = this.src;
                document.getElementById("caption").innerHTML = p.title;
                modal.style.display = "flex";
            };
        });
    }

    // 쇼핑 리스트 로드
    const productGrid = document.getElementById('product-grid');
    if (productGrid && typeof productsData !== 'undefined') {
        productsData.forEach(p => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `<img src="${p.img}" style="width:100%"><h3 style="font-size:0.9rem">${p.name}</h3><p style="color:#d4a373">${p.price}</p>
                <button class="view-btn" onclick="showDetail(${p.id})" style="width:100%; background:none; border:1px solid #333; color:#fff; padding:10px; cursor:pointer;">VIEW INFO</button>`;
            productGrid.appendChild(card);
        });
    }

    // 모달 닫기
    const closeBtn = document.querySelector(".close");
    if (closeBtn) closeBtn.onclick = () => document.getElementById("imageModal").style.display = "none";
};

function showDetail(id) {
    const p = productsData.find(item => item.id === id);
    document.getElementById('detail-title').innerText = p.name;
    document.getElementById('detail-price').innerText = p.price;
    document.getElementById('detail-description').innerText = p.desc;
    document.getElementById('order-item').value = p.name;
    document.getElementById('product-detail').style.display = 'block';
    document.getElementById('product-detail').scrollIntoView({ behavior: 'smooth' });
}

function findAddr() {
    new daum.Postcode({
        oncomplete: function(data) {
            document.getElementById("address").value = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
            document.getElementById("detailAddress").focus();
        }
    }).open();
}

function checkQuantity(select) {
    const directInput = document.getElementById('quantity-direct');
    if (select.value === 'direct') {
        directInput.style.display = 'block';
        directInput.setAttribute('name', 'quantity');
        select.removeAttribute('name');
    } else {
        directInput.style.display = 'none';
        directInput.removeAttribute('name');
        select.setAttribute('name', 'quantity');
    }
}