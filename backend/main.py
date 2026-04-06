from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ⚠️ 중요: 프론트엔드(3000번)에서 백엔드(8000번)에 접속할 수 있게 허용해줍니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 소품샵 상품 데이터 (상민님의 취향에 맞게 수정 가능!)
products = [
    {"id": 1, "name": "Olive Leaf Poster (A2)", "price": 18000, "category": "Poster", "tag": "Best", "image_url": "/photo1.jpeg"},
    {"id": 2, "name": "Sage Pencil Set", "price": 8000, "category": "Stationery", "tag": "New", "image_url": "/photo2.jpeg"},
    {"id": 3, "name": "Forest Postcard Pack", "price": 12000, "category": "Postcard", "tag": None, "image_url": "/photo3.jpeg"},
    {"id": 4, "name": "Khaki Canvas Bag", "price": 24000, "category": "Lifestyle", "tag": "Limited", "image_url": "/photo4.jpeg"},
    {"id": 5, "name": "Morning Fog Print", "price": 15000, "category": "Poster", "tag": None, "image_url": "/photo5.jpeg"},
    {"id": 6, "name": "Brass Key Ring", "price": 9000, "category": "Lifestyle", "tag": None, "image_url": "/photo6.jpeg"},
]

@app.get("/")
def read_root():
    return {"message": "phorage Studio API is running"}

# 상품 목록을 보내주는 통로(API)
@app.get("/api/products")
def get_products():
    return products

# (기존 코드 생략...)
from fastapi import FastAPI, HTTPException # HTTPException 추가
# (add_middleware, products list 등 생략...)

@app.get("/api/products")
def get_products():
    return products

# 🌟 [신규] 개별 상품의 상세 정보를 보내주는 통로 (API)
@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    # products 리스트에서 ID가 일치하는 상품을 찾습니다.
    product = next((p for p in products if p["id"] == product_id), None)
    
    # 만약 상품을 못 찾았다면 404 에러를 보냅니다.
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
        
    return product