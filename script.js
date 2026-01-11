// 1. 구글 시트 및 기본 설정
const GS_ID = '1XgMTnGMx3Q441Ky9-jeDNAfnu-slemlfGYZxyoigbqA';
const GS_URL = `https://docs.google.com/spreadsheets/d/${GS_ID}/gviz/tq?tqx=out:json`;

let gs_albumsData = [];
let gs_galleryData = [];
let gs_productsData = [];

// 2. 사이트 초기화
window.onload = async function() {
    console.log("데이터 동기화 및 최적화 로드 시작...");
    await loadDataFromSheet();
    
    // 페이지 구성요소 확인 후 렌더링
    if (document.getElementById('gallery-grid')) {
        renderGSAlbumList();
    }
    if (document.getElementById('product-grid')) {
        renderGSProductList();
    }
};

/* --- [성능 최적화] Cloudinary 주소 변환 함수 --- */
function optimizeCloudinary(url, width = 800) {
    if (!url || !url.includes("cloudinary.com")) return url;
    // f_auto(형식 자동), q_auto(화질 자동), w_(너비 조절) 옵션 삽입
    if (url.includes("/upload/")) {
        return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
    }
    return url;
}

/* --- 데이터 로드 로직 --- */
async function loadDataFromSheet() {
    try {
        const [aRes, gRes, pRes] = await Promise.all([
            fetch(`${GS_URL}&sheet=albums`),
            fetch(`${GS_URL}&sheet=photos`),
            fetch(`${GS_URL}&sheet=products`)
        ]);

        gs_albumsData = parseGS(await aRes.text());
        gs_galleryData = parseGS(await gRes.text()).map(p => ({
            ...p,
            categories: p.categories ? String(p.categories).split(',').map(c => c.trim()) : []
        }));
        gs_productsData = parseGS(await pRes.text());

        console.log("데이터 로드 성공!", gs_albumsData.length + "개의 앨범 로드됨");
    } catch (e) {
        console.error("데이터 로드 중 에러 발생:", e);
    }
}

function parseGS(text) {
    try {
        const json = JSON.parse(text.substring(47, text.length - 2));
        const cols = json.table.cols.map(c => c.label);
        return json.table.rows.map(row => {
            const item = {};
            row.c.forEach((cell, i) => { if (cols[i]) item[cols[i]] = cell ? (cell.f ? cell.f : cell.v) : ""; });
            return item;
        });
    } catch (e) { return []; }
}

/* --- [앨범 리스트] 상민님 원본 디자인 + 최적화 --- */
function renderGSAlbumList() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";
    
    gs_albumsData.forEach(album => {
        const optimizedCover = optimizeCloudinary(album.cover, 800);
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <div class="img-wrapper" onclick="filterByGSAlbum('${album.title || ""}')" style="cursor:pointer;">
                <img src="${optimizedCover}" class="album-cover" loading="lazy" style="width:100%; display:block;">
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
        
        const wrapper = card.querySelector('.img-wrapper');
        wrapper.onmouseenter = () => wrapper.querySelector('.album-overlay').style.opacity = '1';
        wrapper.onmouseleave = () => wrapper.querySelector('.album-overlay').style.opacity = '0';
    });
}

/* --- [사진 리스트] 상민님 원본 디자인 + 최적화 --- */
function filterByGSAlbum(albumName) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";

    const backBtn = document.createElement('div');
    backBtn.style.gridColumn = "1 / -1";
    backBtn.innerHTML = `<button onclick="renderGSAlbumList()" style="background:none; border:none; color:#888; cursor:pointer; padding:20px 0; letter-spacing:2px; font-size:0.75rem;">← BACK TO ARCHIVE</button>`;
    grid.appendChild(backBtn);

    const filtered = gs_galleryData.filter(p => p.album === albumName);
    filtered.forEach(p => {
        const thumbSrc = optimizeCloudinary(p.src, 1000); // 갤러리 목록용 (1000px)
        const fullSrc = optimizeCloudinary(p.src, 2000);  // 모달 크게보기용 (2000px)
        
        const tagsHTML = (p.categories && Array.isArray(p.categories)) 
            ? p.categories.map(cat => `<span class="tag" style="font-size:0.65rem; color:#444; margin-right:8px;">#${cat}</span>`).join("") 
            : "";

        const locationInfo = (p.location || p.year) 
            ? `${p.location || ""} ${p.location && p.year ? "/" : ""} ${p.year || ""}` 
            : "";

        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <div class="img-wrapper"><img src="${thumbSrc}" class="gallery-img" loading="lazy" style="width:100%; cursor:pointer;" onclick="openGSModal('${fullSrc}', '${p.title || ""}')"></div>
            <div class="photo-info" style="margin-top:10px; display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <span class="photo-title" style="font-size:0.9rem; letter-spacing:1px;">${p.title || ""}</span>
                    <div class="photo-tags" style="display:flex; gap:5px; margin-top:5px;">${tagsHTML}</div>
                </div>
                <span class="photo-meta" style="color:#444; font-size:0.75rem;">${locationInfo}</span>
            </div>`;
        grid.appendChild(item);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --- [상품 리스트] 상민님 원본 디자인 + 최적화 --- */
function renderGSProductList() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    productGrid.innerHTML = ""; 
    
    gs_productsData.forEach(p => {
        const optimizedImg = optimizeCloudinary(p.img, 800);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="img-wrapper"><img src="${optimizedImg}" loading="lazy" style="width:100%" alt="${p.name || ''}"></div>
            <h3>${p.name || ""}</h3>
            <p style="color:#d4a373; font-size:0.9rem; margin-bottom:15px;">${p.price || ""}</p>
            <button class="view-btn" style="width:100%; padding:12px; background:none; border:1px solid #333; color:#fff; cursor:pointer; font-size:0.75rem; letter-spacing:1px;" onclick="showGSDetail('${p.id}')">VIEW INFO</button>
        `;
        productGrid.appendChild(card);
    });
}

/* --- 유틸리티 함수 (모달, 상세정보) --- */
function openGSModal(src, title) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("img01");
    if (modal && modalImg) {
        modalImg.src = src;
        modal.style.display = "flex";
    }
}

function closeModal() {
    const modal = document.getElementById("imageModal");
    if (modal) modal.style.display = "none";
}

function showGSDetail(id) {
    const p = gs_productsData.find(item => String(item.id) === String(id));
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