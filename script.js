// 1. 구글 시트 설정 (상민님 시트 ID)
const GS_ID = '1XgMTnGMx3Q441Ky9-jeDNAfnu-slemlfGYZxyoigbqA';
const GS_URL = `https://docs.google.com/spreadsheets/d/${GS_ID}/gviz/tq?tqx=out:json`;

// 2. 변수명을 유니크하게 변경 (중복 에러 방지)
let gs_albumsData = [];
let gs_galleryData = [];
let gs_productsData = [];

window.onload = async function() {
    console.log("데이터 동기화 시작...");
    await loadDataFromSheet();
    
    // 갤러리 페이지 로직
    if (document.getElementById('gallery-grid')) {
        renderGSAlbumList();
    }

    // 쇼핑 페이지 로직
    if (document.getElementById('product-grid')) {
        renderGSProductList();
    }
};

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

        console.log("데이터 로드 성공!", gs_albumsData.length + "개의 앨범");
    } catch (e) {
        console.error("데이터 로드 실패:", e);
    }
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

/* --- 상민님 원본 디자인: 앨범 리스트 --- */
function renderGSAlbumList() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";
    
    gs_albumsData.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <div class="img-wrapper" onclick="filterByGSAlbum('${album.title || ""}')" style="cursor:pointer;">
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
        
        const wrapper = card.querySelector('.img-wrapper');
        wrapper.onmouseenter = () => wrapper.querySelector('.album-overlay').style.opacity = '1';
        wrapper.onmouseleave = () => wrapper.querySelector('.album-overlay').style.opacity = '0';
    });
}

/* --- 상민님 원본 디자인: 사진 리스트 --- */
function filterByGSAlbum(albumName) {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = "";

    const backBtn = document.createElement('div');
    backBtn.style.gridColumn = "1 / -1";
    backBtn.innerHTML = `<button onclick="renderGSAlbumList()" style="background:none; border:none; color:#888; cursor:pointer; padding:20px 0; letter-spacing:2px; font-size:0.75rem;">← BACK TO ARCHIVE</button>`;
    grid.appendChild(backBtn);

    const filtered = gs_galleryData.filter(p => p.album === albumName);
    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        const tagsHTML = p.categories.map(cat => `<span class="tag" style="font-size:0.65rem; color:#444; margin-right:8px;">#${cat}</span>`).join("");
        const loc = (p.location || p.year) ? `${p.location || ""} ${p.location && p.year ? "/" : ""} ${p.year || ""}` : "";

        item.innerHTML = `
            <div class="img-wrapper"><img src="${p.src || ""}" class="gallery-img" style="width:100%; cursor:pointer;" onclick="openGSModal('${p.src}')"></div>
            <div class="photo-info" style="margin-top:10px; display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <span class="photo-title" style="font-size:0.9rem; letter-spacing:1px;">${p.title || ""}</span>
                    <div class="photo-tags" style="display:flex; gap:5px; margin-top:5px;">${tagsHTML}</div>
                </div>
                <span class="photo-meta" style="color:#444; font-size:0.75rem;">${loc}</span>
            </div>`;
        grid.appendChild(item);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --- 상민님 원본 디자인: 쇼핑 리스트 --- */
function renderGSProductList() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = "";
    gs_productsData.forEach(p => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="img-wrapper"><img src="${p.img || ''}" style="width:100%"></div>
            <h3>${p.name || ""}</h3>
            <p style="color:#d4a373; font-size:0.9rem; margin-bottom:15px;">${p.price || ""}</p>
            <button class="view-btn" style="width:100%; padding:12px; background:none; border:1px solid #333; color:#fff; cursor:pointer; font-size:0.75rem;" onclick="showGSDetail('${p.id}')">VIEW INFO</button>
        `;
        grid.appendChild(card);
    });
}

function openGSModal(src) {
    const modal = document.getElementById("imageModal");
    document.getElementById("img01").src = src;
    modal.style.display = "flex";
}
function closeModal() { document.getElementById("imageModal").style.display = "none"; }