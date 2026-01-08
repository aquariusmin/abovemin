window.onload = function() {
    // 갤러리 렌더링
    if (document.getElementById('gallery-grid')) renderGallery('all');

    // 쇼핑 리스트 렌더링
    const productGrid = document.getElementById('product-grid');
    if (productGrid && typeof productsData !== 'undefined') {
        productsData.forEach(p => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="img-wrapper"><img src="${p.img}" style="width:100%"></div>
                <h3>${p.name}</h3>
                <p>${p.price}</p>
                <button class="view-btn" onclick="showDetail(${p.id})">VIEW INFO</button>`;
            productGrid.appendChild(card);
        });
    }

    // 모달 닫기
    const modal = document.getElementById("imageModal");
    const closeBtn = document.querySelector(".close");
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (e) => { if(e.target == modal) modal.style.display = "none"; }
    }

    // 주문 폼 유효성 및 전송
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

            const scriptURL = '본인의_구글_스크립트_URL'; // 여기에 URL 꼭 넣기
            fetch(scriptURL, { method: 'POST', body: new FormData(orderForm)})
                .then(() => {
                    alert('주문이 접수되었습니다.');
                    orderForm.reset();
                    btn.innerText = "PLACE ORDER";
                    btn.disabled = false;
                })
                .catch(() => {
                    alert('오류가 발생했습니다.');
                    btn.disabled = false;
                });
        });
    }
};

function renderGallery(filter = 'all') {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";

    const filtered = (filter === 'all') 
        ? galleryData 
        : galleryData.filter(p => {
            // categories가 배열인 경우와 일반 글자인 경우 모두 대응
            if (Array.isArray(p.categories)) {
                return p.categories.includes(filter);
            } else if (typeof p.category === 'string') {
                return p.category === filter;
            }
            return false;
        });

    if (filtered.length === 0) {
        grid.innerHTML = "<p style='color:#555; text-align:center; grid-column:1/-1;'>해당 카테고리의 사진이 없습니다.</p>";
    }

    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <div class="img-wrapper"><img src="${p.src}" class="gallery-img"></div>
            <div class="photo-info"><span>${p.title}</span><span style="color:#444">${p.location}</span></div>`;
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