const SHEET_ID = '1XgMTnGMx3Q441Ky9-jeDNAfnu-slemlfGYZxyoigbqA';
const base_url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

let albumsData = [];
let galleryData = [];
let productsData = [];

window.onload = async function() {
    await loadAllData();
    
    // 1. 갤러리 페이지 초기화
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
        renderAlbumList();
    }

    // 2. 쇼핑 리스트 로드
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        renderProductList();
    }
};

async function loadAllData() {
    try {
        const [aRes, gRes, pRes] = await Promise.all([
            fetch(`${base_url}&sheet=albums`),
            fetch(`${base_url}&sheet=photos`),
            fetch(`${base_url}&sheet=products`)
        ]);

        albumsData = await parseSheetJson(await aRes.text());
        galleryData = (await parseSheetJson(await gRes.text())).map(p => ({
            ...p,
            categories: p.categories ? String(p.categories).split(',').map(c => c.trim()) : []
        }));
        productsData = await parseSheetJson(await pRes.text());
    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
    }
}

async function parseSheetJson(text) {
    const jsonData = JSON.parse(text.substring(47, text.length - 2));
    const cols = jsonData.table.cols.map(col => col.label);
    return jsonData.table.rows.map(row => {
        const item = {};
        row.c.forEach((cell, i) => { if (cols[i]) item[cols[i]] = cell ? cell.v : ""; });
        return item;
    });
}

/* --- [앨범 리스트] (상민님 원본 디자인 100% 복구) --- */
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
        
        const wrapper = card.querySelector('.img-wrapper');
        wrapper.onmouseenter = () => wrapper.querySelector('.album-overlay').style.opacity = '1';
        wrapper.onmouseleave = () => wrapper.querySelector('.album-overlay').style.opacity = '0';
    });
}

/* --- [앨범 내부] (상민님 원본 디자인 100% 복구) --- */
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
        
        const tagsHTML = (p.categories && Array.isArray(p.categories)) 
            ? p.categories.map(cat => `<span class="tag" style="font-size:0.65rem; color:#444; margin-right:8px;">#${cat}</span>`).join("") 
            : "";

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
        
        item.querySelector('img').onclick = function() {
            const modal = document.getElementById("imageModal");
            const modalImg = document.getElementById("img01");
            if (modal && modalImg) {
                modalImg.src = this.src;
                modal.style.display = "flex";
            }
        };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --- [상품 리스트] (상민님 원본 디자인 100% 복구) --- */
function renderProductList() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
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

function closeModal() { document.getElementById("imageModal").style.display = "none"; }