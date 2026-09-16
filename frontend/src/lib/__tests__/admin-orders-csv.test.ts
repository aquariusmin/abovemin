import { describe, expect, it } from 'vitest';
import { CSV_BOM, csvCell, formatKst, ordersToCsv, type CsvOrder } from '@/lib/admin/orders-csv';

describe('csvCell', () => {
  it('평범한 값은 그대로', () => {
    expect(csvCell('홍길동')).toBe('홍길동');
    expect(csvCell(35000)).toBe('35000');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('쉼표·따옴표·줄바꿈은 따옴표로 감싸고 안의 따옴표는 두 번 쓴다', () => {
    expect(csvCell('서울시, 중구')).toBe('"서울시, 중구"');
    expect(csvCell('문 앞 "경비실"')).toBe('"문 앞 ""경비실"""');
    expect(csvCell('1층\n2층')).toBe('"1층\n2층"');
    expect(csvCell('a\r\nb')).toBe('"a\r\nb"');
  });

  it('수식으로 실행될 칸은 글자로 읽히게 한다', () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(csvCell('+82 10')).toBe("'+82 10");
    expect(csvCell('-1+1')).toBe("'-1+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('숫자는 수식 처리를 하지 않는다(음수도 숫자다)', () => {
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(Number.NaN)).toBe('');
  });
});

describe('formatKst', () => {
  it('시간대와 상관없이 한국 시간으로 적는다', () => {
    expect(formatKst('2026-09-16T15:30:00Z')).toBe('2026-09-17 00:30');
    expect(formatKst('2026-01-01T00:00:00+09:00')).toBe('2026-01-01 00:00');
  });

  it('날짜가 아니면 원문 그대로', () => {
    expect(formatKst('not a date')).toBe('not a date');
  });
});

describe('ordersToCsv', () => {
  const order: CsvOrder = {
    id: 7,
    created_at: '2026-09-16T01:02:00Z',
    status: 'shipped',
    name: '김, 철수',
    email: 'kim@example.com',
    phone: null,
    zipcode: '04524',
    address: '서울시 중구 "세종대로" 110',
    note: null,
    items: [
      { name: 'Print A3', price: 30000, quantity: 2 },
      { name: 'Postcard', price: 2000, quantity: 1 },
    ],
    total_price: 62000,
    tracking_carrier: 'CJ대한통운',
    tracking_number: '1234-5678',
    admin_memo: undefined,
  };

  it('BOM으로 시작하고 CRLF로 끝난다', () => {
    const csv = ordersToCsv([order]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(3); // 헤더 + 1행 + 끝의 빈 문자열
  });

  it('행의 칸이 헤더 칸 수와 맞고, 값이 이스케이프된다', () => {
    const [header, row] = ordersToCsv([order]).slice(1).split('\r\n');
    expect(header.split(',')).toHaveLength(14);
    expect(row).toBe(
      [
        '7',
        '2026-09-16 10:02',
        '배송 중',
        '"김, 철수"',
        'kim@example.com',
        '',
        '04524',
        '"서울시 중구 ""세종대로"" 110"',
        '',
        'Print A3 ×2 / Postcard ×1',
        '62000',
        'CJ대한통운',
        '1234-5678',
        '',
      ].join(','),
    );
  });

  it('주문이 없으면 헤더만', () => {
    expect(ordersToCsv([])).toBe(`${CSV_BOM}${ordersToCsv([]).slice(1).split('\r\n')[0]}\r\n`);
  });
});
