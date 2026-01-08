window.onload = function() {
    // 1. 갤러리 렌더링 (갤러리 페이지일 때만 실행)
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid && typeof galleryData !== 'undefined') {
        renderGallery('all');
    }

    // 2. 쇼핑 리스트 렌더링 (쇼핑 페이지일 때만 실행)
    const productGrid = document.getElementById('product-grid');
    if (productGrid && typeof productsData !== 'undefined') {
        productGrid.innerHTML = ""; // 초기화
        productsData.forEach(p => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="img-wrapper"><img src="${p.img}" style="width:100%" alt="${p.name}"></div>
                <h3>${p.name}</h3>
                <p style="color:#d4a373">${p.price}</p>
                <button class="view-btn" onclick="showDetail(${p.id})">VIEW INFO</button>
            `;
            productGrid.appendChild(card);
        });
    }

    // 3. 모달 및 공통 로직
    const closeBtn = document.querySelector(".close");
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById("imageModal").style.display = "none";
        };
    }

    // 4. 주문 폼 전송
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!/^[0-9]*$/.test(orderForm.phone.value)) {
                alert("연락처는 숫자만 입력해주세요.");
                return;
            }
            const btn = document.getElementById('submitBtn');
            btn.innerText = "ORDERING...";
            btn.disabled = true;

            const scriptURL = '여러분의_구글_스크립트_URL'; // 실제 URL로 교체 필수
            fetch(scriptURL, { method: 'POST', body: new FormData(orderForm)})
                .then(() => {
                    const orderBox = document.querySelector('.order-box');
                    orderBox.innerHTML = `
                        <div class="order-success-msg">
                            <h4 style="color:#d4a373">THANK YOU.</h4>
                            <p style="color:#888; font-size:0.85rem;">주문이 접수되었습니다.<br>곧 안내 메시지를 보내드릴게요.</p>
                            <button onclick="location.reload()" class="view-btn" style="margin-top:20px; width:auto; padding:10px 20px;">BACK</button>
                        </div>
                    `;
                })
                .catch(() => {
                    alert('전송 중 오류가 발생했습니다.');
                    btn.disabled = false;
                    btn.innerText = "PLACE ORDER";
                });
        });
    }
};

/* --- 필요 함수들 --- */
function renderGallery(filter = 'all') {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";
    const filtered = (filter === 'all') ? galleryData : galleryData.filter(p => p.categories.includes(filter));
    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        const tagsHTML = p.categories.map(cat => `<span class="tag">#${cat}</span>`).join("");
        item.innerHTML = `
            <div class="img-wrapper"><img src="${p.src}" class="gallery-img"></div>
            <div class="photo-info">
                <div><span>${p.title}</span><div class="photo-tags">${tagsHTML}</div></div>
                <span style="color:#444; font-size:0.75rem;">${p.location}</span>
            </div>`;
        grid.appendChild(item);
        item.querySelector('img').onclick = function() {
            document.getElementById("img01").src = this.src;
            document.getElementById("caption").innerHTML = p.title;
            document.getElementById("imageModal").style.display = "flex";
        };
    });
}

function filterGallery(category, event) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderGallery(category);
}

function showDetail(id) {
    const p = productsData.find(item => item.id === id);
    if(!p) return;
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
        directInput.focus();
    } else {
        directInput.style.display = 'none';
        directInput.removeAttribute('name');
        select.setAttribute('name', 'quantity');
    }
}