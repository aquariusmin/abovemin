function renderGSInvestList() {
    const body = document.getElementById('invest-body');
    if (!body) return;
    body.innerHTML = "";

    // 1. 데이터 존재 여부 확인
    if (!gs_investData || gs_investData.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#444;">데이터를 불러오는 중이거나 시트가 비어있습니다.</td></tr>`;
        return;
    }

    // 2. 유효한 데이터만 필터링 (title이 있는 경우만)
    const validData = gs_investData.filter(item => item.title && item.title !== "");

    // 3. 안전한 정렬 (change 값이 없어도 튕기지 않음)
    const sorted = [...validData].sort((a, b) => {
        const aVal = parseFloat(a.change) || -999;
        const bVal = parseFloat(b.change) || -999;
        return bVal - aVal;
    });

    sorted.forEach(item => {
        // 숫자 데이터 안전 변환 (에러 시 0 또는 "-" 처리)
        const price = item.price || "0";
        const changeVal = parseFloat(item.change) || 0;
        const pe = (item.pe && item.pe !== "#N/A") ? item.pe : "-";
        const beta = (item.beta && item.beta !== "#N/A") ? item.beta : "-";
        const high52 = parseFloat(item.h52) || 0;
        const low52 = parseFloat(item.l52) || 0;
        const priceNum = parseFloat(price.replace(/,/g, '')) || 0; // 콤마 제거 후 변환

        // 52주 게이지 계산
        let rangePercent = 50; // 기본 중간값
        if (high52 > low52) {
            rangePercent = ((priceNum - low52) / (high52 - low52)) * 100;
            rangePercent = Math.max(0, Math.min(100, rangePercent)); 
        }

        const colorClass = changeVal > 0 ? "up" : (changeVal < 0 ? "down" : "");
        const sign = changeVal > 0 ? "+" : "";
        const currency = item.curr === "KRW" ? "₩" : (item.curr === "USD" ? "$" : "");
        const marketCap = item.mc ? (parseFloat(item.mc) / 1000000000000).toFixed(1) + "조" : "-";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="stock-name">${item.title}</span>
                <span class="badge">${item.sector || "기타"}</span>
            </td>
            <td>
                <div class="stock-price">${currency}${price}</div>
                <div class="${colorClass}" style="font-size:0.75rem; font-weight:600;">
                    ${sign}${(changeVal * 100).toFixed(2)}%
                </div>
            </td>
            <td>
                <div><span class="meta-label">PE</span><span class="meta-value ${pe > 0 && pe < 12 ? 'good' : ''}">${pe}</span></div>
                <div><span class="meta-label">BETA</span><span class="meta-value ${beta > 1.3 ? 'warning' : ''}">${beta}</span></div>
                <div><span class="meta-label">시총</span><span class="meta-value">${marketCap}</span></div>
            </td>
            <td>
                <div class="range-container">
                    <div class="range-bar" style="width: 100%;"></div>
                    <div class="current-dot" style="left: ${rangePercent}%;"></div>
                </div>
                <div style="font-size:0.6rem; color:#444; margin-top:5px; text-align:center;">52주 범위</div>
            </td>
            <td><div style="color:#666; font-size:0.75rem; line-height:1.4;">${item.note || ""}</div></td>
        `;
        body.appendChild(tr);
    });
}