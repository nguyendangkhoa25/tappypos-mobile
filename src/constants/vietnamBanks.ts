/**
 * Vietnamese bank directory — fully client-side.
 * Logo URLs sourced from VietQR CDN (https://api.vietqr.io/v2/banks, fetched 2026-05-24).
 * No backend API call needed; update this file when new banks appear.
 */

export type VietnamBank = {
  bin: string;
  code: string;   // stored as bankCode in saved accounts
  name: string;
  shortName: string;
  logoUrl: string | null;
};

const CDN = 'https://cdn.vietqr.io/img';

/** Build logo URL from VietQR CDN code. Pass null when the bank has no VietQR logo. */
function logo(vietqrCode: string | null): string | null {
  return vietqrCode ? `${CDN}/${vietqrCode}.png` : null;
}

/**
 * Resolve a logo URL for a saved bank account that may pre-date this directory.
 * Looks up by BIN first; returns null if the BIN is unknown.
 */
export function bankLogoUrl(bin: string): string | null {
  const bank = VIETNAM_BANKS.find((b) => b.bin === bin);
  return bank?.logoUrl ?? null;
}

/**
 * All Vietnamese banks ordered by popularity / daily usage.
 * Top 10 cover ~90 % of all transactions.
 */
export const VIETNAM_BANKS: VietnamBank[] = [
  // ── Most popular ──────────────────────────────────────────────────────────
  { bin: '970436', code: 'VCB',        name: 'Ngân hàng TMCP Ngoại Thương Việt Nam',                   shortName: 'Vietcombank',       logoUrl: logo('VCB')      },
  { bin: '970407', code: 'TCB',        name: 'Ngân hàng TMCP Kỹ thương Việt Nam',                      shortName: 'Techcombank',       logoUrl: logo('TCB')      },
  { bin: '970422', code: 'MB',         name: 'Ngân hàng TMCP Quân đội',                                shortName: 'MB Bank',           logoUrl: logo('MB')       },
  { bin: '970432', code: 'VPB',        name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng',                    shortName: 'VPBank',            logoUrl: logo('VPB')      },
  { bin: '970418', code: 'BIDV',       name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',           shortName: 'BIDV',              logoUrl: logo('BIDV')     },
  { bin: '970415', code: 'CTG',        name: 'Ngân hàng TMCP Công thương Việt Nam',                    shortName: 'VietinBank',        logoUrl: logo('ICB')      },
  { bin: '970405', code: 'AGR',        name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', shortName: 'Agribank',          logoUrl: logo('VBA')      },
  { bin: '970416', code: 'ACB',        name: 'Ngân hàng TMCP Á Châu',                                  shortName: 'ACB',               logoUrl: logo('ACB')      },
  { bin: '970403', code: 'STB',        name: 'Ngân hàng TMCP Sài Gòn Thương Tín',                      shortName: 'Sacombank',         logoUrl: logo('STB')      },
  { bin: '970423', code: 'TPB',        name: 'Ngân hàng TMCP Tiên Phong',                              shortName: 'TPBank',            logoUrl: logo('TPB')      },
  // ── Popular mid-tier ──────────────────────────────────────────────────────
  { bin: '970437', code: 'HDB',        name: 'Ngân hàng TMCP Phát triển TP. Hồ Chí Minh',             shortName: 'HDBank',            logoUrl: logo('HDB')      },
  { bin: '970441', code: 'VIB',        name: 'Ngân hàng TMCP Quốc tế Việt Nam',                        shortName: 'VIB',               logoUrl: logo('VIB')      },
  { bin: '970443', code: 'SHB',        name: 'Ngân hàng TMCP Sài Gòn – Hà Nội',                        shortName: 'SHB',               logoUrl: logo('SHB')      },
  { bin: '970426', code: 'MSB',        name: 'Ngân hàng TMCP Hàng Hải Việt Nam',                       shortName: 'MSB',               logoUrl: logo('MSB')      },
  { bin: '970440', code: 'SEAB',       name: 'Ngân hàng TMCP Đông Nam Á',                              shortName: 'SeABank',           logoUrl: logo('SEAB')     },
  { bin: '970448', code: 'OCB',        name: 'Ngân hàng TMCP Phương Đông',                             shortName: 'OCB',               logoUrl: logo('OCB')      },
  { bin: '970431', code: 'EIB',        name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam',                 shortName: 'Eximbank',          logoUrl: logo('EIB')      },
  { bin: '970425', code: 'ABB',        name: 'Ngân hàng TMCP An Bình',                                 shortName: 'ABBank',            logoUrl: logo('ABB')      },
  { bin: '970449', code: 'LPB',        name: 'Ngân hàng TMCP Bưu điện Liên Việt',                      shortName: 'LienVietPostBank',  logoUrl: logo('LPB')      },
  { bin: '970412', code: 'PVCB',       name: 'Ngân hàng TMCP Đại Chúng Việt Nam',                     shortName: 'PVcomBank',         logoUrl: logo('PVCB')     },
  // ── Digital banks ──────────────────────────────────────────────────────────
  { bin: '546034', code: 'CAKE',       name: 'Ngân hàng số CAKE by VPBank',                           shortName: 'CAKE',              logoUrl: logo('CAKE')     },
  { bin: '546035', code: 'UBANK',      name: 'Ngân hàng số Ubank by VPBank',                          shortName: 'Ubank',             logoUrl: logo('UBANK')    },
  { bin: '963388', code: 'TIMO',       name: 'Ngân hàng số Timo',                                     shortName: 'Timo',              logoUrl: logo('TIMO')     },
  { bin: '970406', code: 'VIKKI',      name: 'Ngân hàng số Vikki by HDBank',                          shortName: 'Vikki',             logoUrl: logo('Vikki')    },
  // ── Other domestic ────────────────────────────────────────────────────────
  { bin: '970409', code: 'BAB',        name: 'Ngân hàng TMCP Bắc Á',                                   shortName: 'Bac A Bank',        logoUrl: logo('BAB')      },
  { bin: '970452', code: 'KLB',        name: 'Ngân hàng TMCP Kiên Long',                               shortName: 'KienLongBank',      logoUrl: logo('KLB')      },
  { bin: '970419', code: 'NCB',        name: 'Ngân hàng TMCP Quốc Dân',                                shortName: 'NCB',               logoUrl: logo('NCB')      },
  { bin: '970428', code: 'NAB',        name: 'Ngân hàng TMCP Nam Á',                                   shortName: 'Nam A Bank',        logoUrl: logo('NAB')      },
  { bin: '970429', code: 'SCB',        name: 'Ngân hàng TMCP Sài Gòn',                                 shortName: 'SCB',               logoUrl: logo('SCB')      },
  { bin: '970430', code: 'PGB',        name: 'Ngân hàng TMCP Xăng dầu Petrolimex',                     shortName: 'PGBank',            logoUrl: logo('PGB')      },
  { bin: '970438', code: 'BVB',        name: 'Ngân hàng TMCP Bảo Việt',                                shortName: 'BaoViet Bank',      logoUrl: logo('BVB')      },
  { bin: '970434', code: 'IVB',        name: 'Ngân hàng TNHH Indochina',                               shortName: 'Indovina Bank',     logoUrl: logo('IVB')      },
  { bin: '970446', code: 'COOPBANK',   name: 'Ngân hàng Hợp tác xã Việt Nam',                          shortName: 'Co-opBank',         logoUrl: logo('COOPBANK') },
  { bin: '970433', code: 'VIETBANK',   name: 'Ngân hàng TMCP Việt Nam Thương Tín',                     shortName: 'VietBank',          logoUrl: logo('VIETBANK') },
  { bin: '970408', code: 'GPB',        name: 'Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu',        shortName: 'GPBank',            logoUrl: logo('GPB')      },
  { bin: '970444', code: 'CBB',        name: 'Ngân hàng TM TNHH MTV Xây dựng Việt Nam',               shortName: 'CBBank',            logoUrl: logo('CBB')      },
  { bin: '970414', code: 'MBV',        name: 'Ngân hàng TM TNHH MTV Đại Dương',                       shortName: 'OceanBank',         logoUrl: logo('MBV')      },
  { bin: '970400', code: 'SGICB',      name: 'Ngân hàng TMCP Sài Gòn Công Thương',                    shortName: 'SaigonBank',        logoUrl: logo('SGICB')    },
  { bin: '970454', code: 'VCCB',       name: 'Ngân hàng TMCP Bản Việt',                               shortName: 'Viet Capital Bank', logoUrl: logo('VCCB')     },
  { bin: '999888', code: 'VBSP',       name: 'Ngân hàng Chính sách Xã hội',                           shortName: 'VBSP',              logoUrl: logo('VBSP')     },
  // ── Foreign banks ──────────────────────────────────────────────────────────
  { bin: '970457', code: 'WOORI',      name: 'Ngân hàng TNHH MTV Woori Việt Nam',                     shortName: 'Woori Bank',        logoUrl: logo('WVN')      },
  { bin: '970424', code: 'SHINHAN',    name: 'Ngân hàng TNHH MTV Shinhan Việt Nam',                   shortName: 'Shinhan Bank',      logoUrl: logo('SHBVN')    },
  { bin: '970439', code: 'PBVN',       name: 'Ngân hàng TNHH MTV Public Việt Nam',                    shortName: 'PublicBank VN',     logoUrl: logo('PBVN')     },
  { bin: '970458', code: 'UOB',        name: 'Ngân hàng United Overseas Việt Nam',                    shortName: 'UOB',               logoUrl: logo('UOB')      },
  { bin: '970410', code: 'SCVN',       name: 'Ngân hàng TNHH MTV Standard Chartered Việt Nam',       shortName: 'Standard Chartered',logoUrl: logo('SCVN')     },
  { bin: '458761', code: 'HSBC',       name: 'Ngân hàng TNHH MTV HSBC Việt Nam',                      shortName: 'HSBC',              logoUrl: logo('HSBC')     },
  { bin: '533948', code: 'CITIBANK',   name: 'Ngân hàng Citibank Việt Nam',                           shortName: 'Citibank',          logoUrl: logo('CITIBANK') },
  { bin: '970462', code: 'KBHN',       name: 'Ngân hàng Kookmin – Chi nhánh Hà Nội',                  shortName: 'Kookmin Bank',      logoUrl: logo('KBHN')     },
  { bin: '970455', code: 'IBK',        name: 'Ngân hàng IBK – Chi nhánh Hà Nội',                      shortName: 'IBK',               logoUrl: logo('IBK')      },
  { bin: '422589', code: 'CIMB',       name: 'Ngân hàng TNHH MTV CIMB Việt Nam',                      shortName: 'CIMB',              logoUrl: logo('CIMB')     },
  { bin: '970442', code: 'HLBVN',      name: 'Ngân hàng Hong Leong Việt Nam',                         shortName: 'Hong Leong',        logoUrl: logo('HLBVN')    },
  { bin: '668888', code: 'KBANK',      name: 'Ngân hàng KBank Việt Nam',                              shortName: 'KBank',             logoUrl: logo('KBANK')    },
];
