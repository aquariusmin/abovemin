window.onload = function() {
    // 1. 갤러리 페이지 초기화 (첫 화면: 앨범 리스트)
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid && typeof albumsData !== 'undefined') {
        renderAlbumList();
    }

    // 2. 쇼핑 리스트 로드 (상품 목록)
    const productGrid = document.getElementById('product-grid');
    if (productGrid && typeof productsData !== 'undefined') {
        productGrid.innerHTML = ""; 
        productsData.forEach(p => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="img-wrapper"><img src="${p.img || ''}" style="width:100%" alt="${p.name || ''}"></div>
                <h3>${p.name || ""}</h3>
                <p style="color:#d4a373; font-size:0.9rem; margin-bottom:15px;">${p.price || ""}</p>
                <button class="view-btn" style="width:100%; padding:12px; background:none; border:1px solid #333; color:#fff; cursor:pointer; font-size:0.75rem; letter-spacing:1px;" onclick="showDetail(${p.id})">VIEW INFO</button>
            `;
            productGrid.appendChild(card);
        });
    }

    // 3. 주문 폼 전송 로직
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            btn.innerText = "ORDERING...";
            btn.disabled = true;

            // 구글 앱스 스크립트 URL (본인의 URL로 교체 필수)
            const scriptURL = '여러분의_구글_스크립트_URL'; 
            fetch(scriptURL, { method: 'POST', body: new FormData(orderForm)})
                .then(() => {
                    const orderBox = document.querySelector('.order-box');
                    orderBox.innerHTML = `
                        <div style="text-align:center; padding:40px 0;">
                            <h4 style="color:#d4a373; letter-spacing:2px;">THANK YOU.</h4>
                            <p style="color:#888; font-size:0.85rem;">주문이 접수되었습니다. 곧 연락드릴게요.</p>
                            <button onclick="location.reload()" style="margin-top:20px; background:none; border:1px solid #333; color:#fff; padding:10px 20px; cursor:pointer; font-size:0.75rem; letter-spacing:1px;">BACK</button>
                        </div>
                    `;
                })
                .catch(() => {
                    alert("전송 중 오류가 발생했습니다.");
                    btn.innerText = "PLACE ORDER";
                    btn.disabled = false;
                });
        });
    }
};

/* --- [앨범 리스트] 첫 화면 (태그/메타 없이 깔끔하게) --- */
function renderAlbumList() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";
    
    albumsData.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <div class="img-wrapper" onclick="filterByAlbum('${album.title || ""}')" style="cursor:pointer;">
                <img src="${album.cover || ""}" class="album-cover" style="width:100%; display:block;">
                <div class="album-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s;">
                    <span style="color:#fff; font-size:0.75rem; letter-spacing:2px;">VIEW ALBUM</span>
                </div>
            </div>
            <div class="album-info" style="margin-top:15px;">
                <h3 style="font-weight:300; letter-spacing:2px; font-size:1.1rem; margin:0;">${album.title || ""}</h3>
                <p style="color:#555; font-size:0.8rem; margin-top:5px; letter-spacing:1px;">${album.desc || ""}</p>
            </div>
        `;
        grid.appendChild(card);
        
        // 오버레이 효과를 위한 호버 이벤트 (JS로 처리)
        const wrapper = card.querySelector('.img-wrapper');
        wrapper.onmouseenter = () => wrapper.querySelector('.album-overlay').style.opacity = '1';
        wrapper.onmouseleave = () => wrapper.querySelector('.album-overlay').style.opacity = '0';
    });
}

/* --- [앨범 내부] 사진 목록 (태그 복구 + 모달 연결) --- */
function filterByAlbum(albumName) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";

    // 뒤로가기 버튼
    const backBtn = document.createElement('div');
    backBtn.style.gridColumn = "1 / -1";
    backBtn.innerHTML = `<button onclick="renderAlbumList()" style="background:none; border:none; color:#888; cursor:pointer; padding:20px 0; letter-spacing:2px; font-size:0.75rem;">← BACK TO ARCHIVE</button>`;
    grid.appendChild(backBtn);

    const filtered = galleryData.filter(p => p.album === albumName);
    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        // 태그 데이터 안전하게 가져오기
        const tagsHTML = (p.categories && Array.isArray(p.categories)) 
            ? p.categories.map(cat => `<span class="tag" style="font-size:0.65rem; color:#444; margin-right:8px;">#${cat}</span>`).join("") 
            : "";

        // 위치 및 연도 정보 (없으면 빈칸)
        const locationInfo = (p.location || p.year) 
            ? `${p.location || ""} ${p.location && p.year ? "/" : ""} ${p.year || ""}` 
            : "";

        item.innerHTML = `
            <div class="img-wrapper"><img src="${p.src || ""}" class="gallery-img" style="width:100%; cursor:pointer;"></div>
            <div class="photo-info" style="margin-top:10px; display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <span class="photo-title" style="font-size:0.9rem; letter-spacing:1px;">${p.title || ""}</span>
                    <div class="photo-tags" style="display:flex; gap:5px; margin-top:5px;">${tagsHTML}</div>
                </div>
                <span class="photo-meta" style="color:#444; font-size:0.75rem;">${locationInfo}</span>
            </div>`;
        grid.appendChild(item);
        
        // 이미지 클릭 시 모달 열기
        item.querySelector('img').onclick = function() {
            const modal = document.getElementById("imageModal");
            const modalImg = document.getElementById("img01");
            const captionText = document.getElementById("caption");
            if (modal && modalImg) {
                modalImg.src = this.src;
                captionText.innerHTML = p.title || "";
                modal.style.display = "flex";
            }
        };
    });
    
    // 사진 목록으로 이동 시 화면 최상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --- 공통 기능 함수들 --- */
function closeModal() { 
    const modal = document.getElementById("imageModal");
    if (modal) modal.style.display = "none"; 
}

function showDetail(id) {
    if (typeof productsData === 'undefined') return;
    const p = productsData.find(item => item.id === id);
    if (!p) return;

    document.getElementById('detail-title').innerText = p.name || "";
    document.getElementById('detail-price').innerText = p.price || "";
    document.getElementById('detail-description').innerText = p.desc || "";
    document.getElementById('order-item').value = p.name || "";
    
    const detailContainer = document.getElementById('product-detail');
    if (detailContainer) {
        detailContainer.style.display = 'block';
        detailContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

function findAddr() {
    new daum.Postcode({
        oncomplete: function(data) {
            let addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
            document.getElementById("address").value = addr;
            document.getElementById("detailAddress").focus();
        }
    }).open();
}