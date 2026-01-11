// 1. 구글 시트 및 기본 설정
const GS_ID = '1XgMTnGMx3Q441Ky9-jeDNAfnu-slemlfGYZxyoigbqA';
const GS_URL = `https://docs.google.com/spreadsheets/d/${GS_ID}/gviz/tq?tqx=out:json`;

let gs_albumsData = [];
let gs_galleryData = [];
let gs_productsData = [];

window.onload = async function() {
    await loadDataFromSheet();
    if (document.getElementById('gallery-grid')) renderGSAlbumList();
    if (document.getElementById('product-grid')) renderGSProductList();
};

/* --- 성능 최적화: Cloudinary 주소 변환 --- */
function optimizeCloudinary(url, width = 800) {
    if (!url || !url.includes("cloudinary.com")) return url;
    if (url.includes("/upload/")) return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
    return url;
}

/* --- 데이터 로드 --- */
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
    } catch (e) { console.error(e); }
}

function parseGS(text) {
    const json = JSON.parse(text.substring(47, text.length - 2));
    const cols = json.table.cols.map(c => c.label);
    return json.table.rows.map(row => {
        const item = {};
        row.c.forEach((cell, i) => { if (cols[i]) item[cols[i]] = cell ? (cell.f ? cell.f : cell.v) : ""; });
        return item;
    });
}

/* --- 앨범 및 사진 렌더링 (상민님 원본 디자인) --- */
function renderGSAlbumList() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";
    gs_albumsData.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <div class="img-wrapper" onclick="filterByGSAlbum('${album.title}')" style="cursor:pointer;">
                <img src="${optimizeCloudinary(album.cover, 800)}" class="album-cover" loading="lazy" style="width:100%; display:block;">
                <div class="album-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s;">
                    <span style="color:#fff; font-size:0.75rem; letter-spacing:2px;">VIEW ALBUM</span>
                </div>
            </div>
            <div class="album-info" style="margin-top:15px;">
                <h3 style="font-weight:300; letter-spacing:2px; font-size:1.1rem; margin:0;">${album.title}</h3>
                <p style="color:#555; font-size:0.8rem; margin-top:5px; letter-spacing:1px;">${album.desc}</p>
            </div>`;
        grid.appendChild(card);
        const w = card.querySelector('.img-wrapper');
        w.onmouseenter = () => w.querySelector('.album-overlay').style.opacity = '1';
        w.onmouseleave = () => w.querySelector('.album-overlay').style.opacity = '0';
    });
}

function filterByGSAlbum(albumName) {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = `<div style="grid-column:1/-1;"><button onclick="renderGSAlbumList()" style="background:none; border:none; color:#888; cursor:pointer; padding:20px 0; letter-spacing:2px; font-size:0.75rem;">← BACK TO ARCHIVE</button></div>`;
    const filtered = gs_galleryData.filter(p => p.album === albumName);
    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        const tags = p.categories.map(cat => `<span class="tag" style="font-size:0.65rem; color:#444; margin-right:8px;">#${cat}</span>`).join("");
        const loc = (p.location || p.year) ? `${p.location || ""} ${p.location && p.year ? "/" : ""} ${p.year || ""}` : "";
        item.innerHTML = `
            <div class="img-wrapper"><img src="${optimizeCloudinary(p.src, 1000)}" class="gallery-img" loading="lazy" style="width:100%; cursor:pointer;" onclick="openGSModal('${optimizeCloudinary(p.src, 2000)}')"></div>
            <div class="photo-info" style="margin-top:10px; display:flex; justify-content:space-between; align-items:flex-start;">
                <div><span class="photo-title" style="font-size:0.9rem; letter-spacing:1px;">${p.title}</span><div class="photo-tags" style="display:flex; gap:5px; margin-top:5px;">${tags}</div></div>
                <span class="photo-meta" style="color:#444; font-size:0.75rem;">${loc}</span>
            </div>`;
        grid.appendChild(item);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --- 상품 리스트 --- */
function renderGSProductList() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = "";
    gs_productsData.forEach(p => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="img-wrapper"><img src="${optimizeCloudinary(p.img, 800)}" loading="lazy" style="width:100%"></div>
            <h3>${p.name}</h3>
            <p style="color:#d4a373; font-size:0.9rem; margin-bottom:15px;">${p.price}</p>
            <button class="view-btn" style="width:100%; padding:12px; background:none; border:1px solid #333; color:#fff; cursor:pointer; font-size:0.75rem;" onclick="showGSDetail('${p.id}')">VIEW INFO</button>
        `;
        grid.appendChild(card);
    });
}

/* --- [추가] 상세 정보 및 버튼 비활성화 로직 --- */
function showGSDetail(id) {
    const p = gs_productsData.find(item => String(item.id) === String(id));
    if (!p) return;

    document.getElementById('detail-title').innerText = p.name;
    document.getElementById('detail-price').innerText = p.price;
    document.getElementById('detail-description').innerText = p.desc;
    document.getElementById('order-item').value = p.name;
    
    const submitBtn = document.getElementById('submitBtn');
    
    // 가격이 "-원" 이거나 설명에 "준비중"이 포함되어 있으면 버튼 비활성화
    if (p.price === "-원" || p.desc.includes("준비중")) {
        submitBtn.disabled = true;
        submitBtn.innerText = "NOT AVAILABLE (준비중)";
        submitBtn.style.background = "#333";
        submitBtn.style.color = "#777";
        submitBtn.style.cursor = "not-allowed";
    } else {
        submitBtn.disabled = false;
        submitBtn.innerText = "PLACE ORDER";
        submitBtn.style.background = "#fff";
        submitBtn.style.color = "#000";
        submitBtn.style.cursor = "pointer";
    }

    const detailContainer = document.getElementById('product-detail');
    detailContainer.style.display = 'block';
    detailContainer.scrollIntoView({ behavior: 'smooth' });
}

/* --- [추가] 주소 찾기 기능 복구 --- */
function findAddr() {
    new daum.Postcode({
        oncomplete: function(data) {
            let addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
            document.getElementById("address").value = addr;
            document.getElementById("detailAddress").focus();
        }
    }).open();
}

function openGSModal(src) { document.getElementById("img01").src = src; document.getElementById("imageModal").style.display = "flex"; }
function closeModal() { document.getElementById("imageModal").style.display = "none"; }