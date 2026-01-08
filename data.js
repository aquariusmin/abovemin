// 앨범 정보 (커버 이미지와 제목)
const albumsData = [
    { id: 1, title: "New York", cover: "images/photo1.jpeg" },
    { id: 2, title: "Nagoya", cover: "images/photo4.jpeg" },
];

// 갤러리 데이터
const galleryData = [
    { id: 1, src: "images/photo1.jpeg", title: "George Washington Bridge Bus Terminal", location: "New York", year: "2024", categories: ["United States of America", "winter"], album: "New York"},
    { id: 2, src: "images/photo2.jpg", title: "Liberty State Park", location: "New Jersey", year: "2025", categories: ["United States of America", "winter"], album: "New York"},
    { id: 3, src: "images/photo3.jpg", title: "Top of the Rock", location: "New York", year: "2025", categories: ["United States of America", "winter"], album: "New York"},
    { id: 4, src: "images/photo4.jpeg", title: "Ogimachi", location: "Shirakawa", year: "2025", categories: ["japan", "autumn"], album: "Nagoya"},
    { id: 5, src: "images/photo5.jpeg", title: "MIT", location: "Cambridge", year: "2025", categories: ["United States of America", "winter"], album: "New York"},
    { id: 6, src: "images/photo6.jpg", title: "High-Line Park", location: "New York", year: "2026", categories: ["United States of America", "winter"], album: "New York"},
    { id: 7, src: "images/photo7.jpg", title: "High-Line Park", location: "New York", year: "2026", categories: ["usa", "winter"], album: "New York"},
    { id: 8, src: "images/photo8.jpeg", title: "9.11 Memorial", location: "New York", year: "2025", categories: ["United States of America", "winter"], album: "New York"},
    { id: 9, src: "images/photo9.jpg", title: "High-Line Park", location: "New York", year: "2026", categories: ["United States of America", "winter"], album: "New York"},
    { id: 10, src: "images/photo10.jpg", title: "High-Line Park", location: "New York", year: "2026", categories: ["United States of America", "winter"], album: "New York"},
    { id: 11, src: "images/photo11.jpg", title: "High-Line Park", location: "New York", year: "2026", categories: ["United States of America", "winter"], album: "New York"},
    { id: 12, src: "images/photo12.jpg", title: "High-Line Park", location: "New York", year: "2026", categories: ["United States of America", "winter"], album: "New York"},
    { id : 13, src: "images/photo13.jpg", title: "High-Line Park", location: "New York", year: "2026", categories: ["United States of America", "winter"], album: "New York"},
    { id : 14, src: "images/photo14.jpg", title: "High-Line Park", location: "New York", year: "2026", categories: ["United States of America", "winter"], album: "New York"},
    { id : 15, src: "images/photo15.jpg", title: "Brooklyn Bridge", location: "New York", year: "2025", categories: ["United States of America", "winter"], album: "New York"},
    { id : 16, src: "images/photo16.jpg", title: "Dumbo", location: "New York", year: "2025", categories: ["United States of America", "winter"], album: "New York"},
    { id : 17, src: "images/photo17.jpg", title: "Dumbo", location: "New York", year: "2025", categories: ["United States of America", "winter"], album: "New York"},
];

// 상품 데이터
const productsData = [
    { id: 1, name: "2026 Season Postcard Set", price: "12,000원", img: "images/photo1.jpeg", desc: "제주의 고요한 새벽을 담은 5장 세트입니다. 고급 수입지 240g 사용." },
    { id: 2, name: "Winter Forest Poster", price: "25,000원", img: "images/photo2.jpg", desc: "강원도 눈 덮인 숲의 깊이감을 담은 A2 포스터입니다." },
    { id: 3, name: "2026 Minimal Calendar", price: "18,000원", img: "images/photo3.jpg", desc: "매달 한 장의 사진과 여백을 담은 미니멀 달력입니다." }
];