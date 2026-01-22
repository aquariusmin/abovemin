const GS_ID = '1XgMTnGMx3Q441Ky9-jeDNAfnu-slemlfGYZxyoigbqA';
const GS_URL = `https://docs.google.com/spreadsheets/d/${GS_ID}/gviz/tq?tqx=out:json`;

let gs_albumsData = [], gs_galleryData = [], gs_productsData = [], gs_investData = [];

window.onload = async function() {
    await loadDataFromSheet();
    if (document.getElementById('gallery-grid')) renderGSAlbumList();
    if (document.getElementById('product-grid')) renderGSProductList();
    if (document.getElementById('kr-invest-body')) renderGSInvestList();
};

async function loadDataFromSheet() {
    try {
        const [aRes, gRes, pRes, iRes] = await Promise.all([
            fetch(`${GS_URL}&sheet=albums`), fetch(`${GS_URL}&sheet=photos`),
            fetch(`${GS_URL}&sheet=products`), fetch(`${GS_URL}&sheet=invest`)
        ]);
        gs_albumsData = parseGS(await aRes.text());
        gs_galleryData = parseGS(await gRes.text());
        gs_productsData = parseGS(await pRes.text());
        gs_investData = parseGS(await iRes.text());
    } catch (e) { console.error("Data Load Error:", e); }
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

/* --- [분석 리스트 렌더링] 시장 분리 및 통화/지표 강화 --- */
function renderGSInvestList() {
    const krBody = document.getElementById('kr-invest-body');
    const usBody = document.getElementById('us-invest-body');
    if (!krBody || !usBody) return;

    krBody.innerHTML = ""; usBody.innerHTML = "";

    // 시장별 데이터 분류 및 정렬
    const krData = gs_investData.filter(item => item.curr === "KRW").sort((a, b) => (parseFloat(b.change) || 0) - (parseFloat(a.change) || 0));
    const usData = gs_investData.filter(item => item.curr === "USD").sort((a, b) => (parseFloat(b.change) || 0) - (parseFloat(a.change) || 0));

    renderMarketZone(krData, krBody);
    renderMarketZone(usData, usBody);
}

function renderMarketZone(data, container) {
    data.forEach(item => {
        const changeVal = parseFloat(item.change) || 0;
        const colorClass = changeVal > 0 ? "up" : (changeVal < 0 ? "down" : "");
        const pe = parseFloat(item.pe) || 0;
        const eps = parseFloat(item.eps) || 0;
        const beta = parseFloat(item.beta) || 0;

        // 지수별 조건부 색상 (Green: 긍정 / Red: 부정 / Yellow: 주의)
        const peStyle = (pe > 0 && pe < 12) ? "color: #00ff88;" : (pe > 40 ? "color: #ff4444;" : "");
        const epsStyle = (eps > 0) ? "color: #00ff88;" : (eps < 0 ? "color: #ff4444;" : "");
        const betaStyle = (beta > 1.3) ? "color: #ffbb00;" : (beta > 0 && beta < 0.8 ? "color: #00ff88;" : "");

        const marketCap = item.mc ? (parseFloat(item.mc.toString().replace(/[^0-9.]/g, "")) / 1000000000000).toFixed(1) + "조" : "-";

        const tr = document.createElement('tr');
        tr.onclick = () => showStockChart(item.id);
        tr.innerHTML = `
            <td>
                <span class="stock-name">${item.title}</span>
                <span class="badge">${item.sector || "기타"}</span>
            </td>
            <td>
                <div style="font-size:1.15rem; font-weight:700;">${item.price} <small style="color:#666; font-size:0.7rem;">${item.curr}</small></div>
                <div class="${colorClass}" style="font-weight:600; font-size:0.95rem;">
                    ${changeVal > 0 ? "+" : ""}${(changeVal * 100).toFixed(2)}%
                </div>
            </td>
            <td>
                <div class="valuation-box">
                    <div class="meta-item"><span class="meta-label">PE</span><span class="meta-value" style="${peStyle}">${item.pe || "-"}</span></div>
                    <div class="meta-item"><span class="meta-label">EPS</span><span class="meta-value" style="${epsStyle}">${item.eps || "-"}</span></div>
                    <div class="meta-item"><span class="meta-label">BETA</span><span class="meta-value" style="${betaStyle}">${item.beta || "-"}</span></div>
                    <div class="meta-item"><span class="meta-label">MCAP</span><span class="meta-value">${marketCap}</span></div>
                </div>
            </td>
            <td>
                <div class="range-container">
                    <div class="range-bar" style="width: 100%;"></div>
                    <div class="current-dot" style="left: ${calculateRange(item)}%;"></div>
                </div>
                <div style="font-size:0.6rem; color:#444; margin-top:8px; text-align:center;">52W RANGE</div>
            </td>
            <td><div class="stock-note">${item.note || ""}</div></td>
        `;
        container.appendChild(tr);
    });
}

function calculateRange(item) {
    const price = parseFloat(item.price.toString().replace(/[^0-9.]/g, "")) || 0;
    const high = parseFloat(item.h52) || 0, low = parseFloat(item.l52) || 0;
    if (high === low) return 50;
    return Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100));
}

function showStockChart(symbol) {
    const cleanSymbol = symbol.toString().trim().toUpperCase();
    const chartDiv = document.getElementById('chart-area');
    chartDiv.style.display = 'block';
    chartDiv.innerHTML = `<div id="tv-chart-container" style="height:100%;"></div>`;
    new TradingView.widget({
        "width": "100%", "height": 550, "symbol": cleanSymbol, "interval": "D", "timezone": "Asia/Seoul",
        "theme": "dark", "style": "1", "locale": "kr", "container_id": "tv-chart-container"
    });
    chartDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* --- [기존 갤러리/쇼핑몰 기능] --- */
function optimizeCloudinary(url, width = 800) {
    if (!url || !url.includes("cloudinary.com")) return url;
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

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
        const tags = p.categories ? p.categories.split(',').map(cat => `<span class="tag" style="font-size:0.65rem; color:#444; margin-right:8px;">#${cat.trim()}</span>`).join("") : "";
        item.innerHTML = `
            <div class="img-wrapper"><img src="${optimizeCloudinary(p.src, 1000)}" class="gallery-img" loading="lazy" style="width:100%; cursor:pointer;" onclick="openGSModal('${optimizeCloudinary(p.src, 2000)}')"></div>
            <div class="photo-info" style="margin-top:10px;">
                <span class="photo-title" style="font-size:0.9rem; letter-spacing:1px;">${p.title}</span>
                <div class="photo-tags" style="display:flex; gap:5px; margin-top:5px;">${tags}</div>
            </div>`;
        grid.appendChild(item);
    });
}

function renderGSProductList() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = "";
    gs_productsData.forEach(p => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="img-wrapper"><img src="${optimizeCloudinary(p.img, 800)}" style="width:100%"></div>
            <h3>${p.name}</h3>
            <p style="color:#d4a373; font-size:0.9rem; margin-bottom:15px;">${p.price}</p>
            <button class="view-btn" onclick="showGSDetail('${p.id}')">VIEW INFO</button>
        `;
        grid.appendChild(card);
    });
}

function showGSDetail(id) {
    const p = gs_productsData.find(item => String(item.id) === String(id));
    if (!p) return;
    document.getElementById('detail-title').innerText = p.name;
    document.getElementById('detail-price').innerText = p.price;
    document.getElementById('detail-description').innerText = p.desc;
    document.getElementById('product-detail').style.display = 'block';
    document.getElementById('product-detail').scrollIntoView({ behavior: 'smooth' });
}

function openGSModal(src) { document.getElementById("img01").src = src; document.getElementById("imageModal").style.display = "flex"; }
function closeModal() { document.getElementById("imageModal").style.display = "none"; }