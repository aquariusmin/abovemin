window.onload = function() {
    // 1. 갤러리 페이지 초기화 (첫 화면: 앨범 리스트)
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid && typeof albumsData !== 'undefined') {
        renderAlbumList();
    }

    // 2. 쇼핑 리스트 로드
    const productGrid = document.getElementById('product-grid');
    if (productGrid && typeof productsData !== 'undefined') {
        productGrid.innerHTML = ""; 
        productsData.forEach(p => {
            const card = document.createElement('div');
            card.className = 'item-card';
            // 데이터가 없을 경우를 대비해 || "" (공백 처리) 적용
            card.innerHTML = `
                <div class="img-wrapper"><img src="${p.img || ''}" style="width:100%" alt="${p.name || ''}"></div>
                <h3>${p.name || ""}</h3>
                <p style="color:#d4a373; font-size:0.9rem; margin-bottom:15px;">${p.price || ""}</p>
                <button class="view-btn" style="width:100%; padding:12px; background:none; border:1px solid #333; color:#fff; cursor:pointer;" onclick="showDetail(${p.id})">VIEW INFO</button>
            `;
            productGrid.appendChild(card);
        });
    }

    // 3. 주문 폼 전송 (기존 유지)
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            btn.innerText = "ORDERING...";
            btn.disabled = true;
            const scriptURL = '여러분의_구글_스크립트_URL'; 
            fetch(scriptURL, { method: 'POST', body: new FormData(orderForm)})
                .then(() => {
                    const orderBox = document.querySelector('.order-box');
                    orderBox.innerHTML = `
                        <div style="text-align:center; padding:40px 0;">
                            <h4 style="color:#d4a373; letter-spacing:2px;">THANK YOU.</h4>
                            <p style="color:#888; font-size:0.85rem;">주문이 접수되었습니다. 곧 연락드릴게요.</p>
                            <button onclick="location.reload()" style="margin-top:20px; background:none; border:1px solid #333; color:#fff; padding:10px 20px; cursor:pointer;">BACK</button>
                        </div>
                    `;
                });
        });
    }
};

/* --- [앨범 리스트] 커버 화면 (태그 없음, undefined 방지 강화) --- */
function renderAlbumList() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";
    
    albumsData.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        // album.title이나 album.desc가 없으면 빈 칸("")으로 표시함
        card.innerHTML = `
            <div class="img-wrapper" onclick="filterByAlbum('${album.title || ""}')" style="cursor:pointer;">
                <img src="${album.cover || ""}" class="album-cover" style="width:100%; display:block;">
            </div>
            <div class="album-info" style="margin-top:15px;">
                <h3 style="font-weight:300; letter-spacing:2px; font-size:1.1rem; margin:0;">${album.title || ""}</h3>
                <p style="color:#555; font-size:0.8rem; margin-top:5px; letter-spacing:1px;">${album.desc || ""}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* --- [앨범 내부] 사진 목록 (태그 유지, undefined 방지 강화) --- */
function filterByAlbum(albumName) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";

    const backBtn = document.createElement('div');
    backBtn.style.gridColumn = "1 / -1";
    backBtn.innerHTML = `<button onclick="renderAlbumList()" style="background:none; border:none; color:#888; cursor:pointer; padding:20px 0; letter-spacing:2px; font-size:0.75rem;">← BACK TO ARCHIVE</button>`;
    grid.appendChild(backBtn);

    const filtered = galleryData.filter(p => p.album === albumName);
    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        // 1. 태그 처리: 데이터가 확실히 있을 때만 출력
        const tagsHTML = (p.categories && Array.isArray(p.categories)) 
            ? p.categories.map(cat => `<span class="tag" style="font-size:0.65rem; color:#444; margin-right:8px;">#${cat}</span>`).join("") 
            : "";

        // 2. 위치/연도 처리: 둘 다 없을 경우 슬래시(/)도 안 나오게 조절
        const locationInfo = (p.location || p.year) 
            ? `${p.location || ""} ${p.location && p.year ? "/" : ""} ${p.year || ""}` 
            : "";

        item.innerHTML = `
            <div class="img-wrapper"><img src="${p.src || ""}" class="gallery-img" style="width:100%; cursor:pointer;"></div>
            <div class="photo-info" style="margin-top:10px; display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <span class="photo-title" style="font-size:0.9rem;">${p.title || ""}</span>
                    <div class="photo-tags" style="display:flex; gap:5px; margin-top:5px;">${tagsHTML}</div>
                </div>
                <span style="color:#444; font-size:0.75rem;">${locationInfo}</span>
            </div>`;
        grid.appendChild(item);
        
        item.querySelector('img').onclick = function() {
            const modal = document.getElementById("imageModal");
            const modalImg = document.getElementById("img01");
            const caption = document.getElementById("caption");
            if(modal && modalImg) {
                modalImg.src = this.src;
                caption.innerHTML = p.title || "";
                modal.style.display = "flex";
            }
        };
    });
}

// 공통 함수들 (모달 닫기, 상세정보, 주소)
function closeModal() { 
    const modal = document.getElementById("imageModal");
    if(modal) modal.style.display = "none"; 
}

function showDetail(id) {
    const p = productsData.find(item => item.id === id);
    if(!p) return;
    document.getElementById('detail-title').innerText = p.name || "";
    document.getElementById('detail-price').innerText = p.price || "";
    document.getElementById('detail-description').innerText = p.desc || "";
    document.getElementById('order-item').value = p.name || "";
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