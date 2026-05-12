import { numberToWords } from '../../utils/format';

describe('numberToWords — Vietnamese branch coverage', () => {
  const cases: [number, string][] = [
    [1, 'một'],
    [10, 'mười'],
    [11, 'mười một'],
    [15, 'mười lăm'],
    [20, 'hai mươi'],
    [21, 'hai mươi mốt'],
    [25, 'hai mươi lăm'],
    [100, 'một trăm'],
    [105, 'một trăm lẻ năm'],
    [110, 'một trăm mười'],
    [1000, 'ngàn'],
    [1500, 'năm trăm'],
    [10000, 'ngàn'],
    [1000000, 'triệu'],
    [1000000000, 'tỷ'],
    [1500000000, 'tỷ'],
  ];

  for (const [input, expected] of cases) {
    it(`numberToWords(${input}) contains "${expected}"`, () => {
      expect(numberToWords(input, 'vi').toLowerCase()).toContain(expected.toLowerCase());
    });
  }

  it('returns empty string for 0', () => {
    expect(numberToWords(0, 'vi')).toBe('');
  });

  it('capitalises first letter', () => {
    const result = numberToWords(1, 'vi');
    expect(result[0]).toBe(result[0].toUpperCase());
  });
});

describe('numberToWords — English branch coverage', () => {
  const cases: [number, string][] = [
    [1, 'one'],
    [10, 'ten'],
    [11, 'eleven'],
    [20, 'twenty'],
    [21, 'twenty-one'],
    [100, 'hundred'],
    [1000, 'thousand'],
    [1000000, 'million'],
    [1000000000, 'billion'],
  ];

  for (const [input, expected] of cases) {
    it(`numberToWords(${input}, 'en') contains "${expected}"`, () => {
      expect(numberToWords(input, 'en').toLowerCase()).toContain(expected.toLowerCase());
    });
  }
});
