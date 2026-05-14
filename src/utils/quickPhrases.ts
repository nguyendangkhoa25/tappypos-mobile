const QUICK_PHRASES: Record<string, string[]> = {
  BARBER_SHOP:     ['Cắt ngắn', 'Cắt dài', 'Tỉa râu', 'Hàn Quốc'],
  BARBER_SHOP_MEN: ['Cắt fade', 'Undercut', 'Cạo râu', 'Hàn Quốc'],
  HAIR_SALON:      ['Uốn', 'Nhuộm', 'Duỗi', 'Gội đầu'],
  NAIL_SHOP:       ['Móng tay', 'Móng chân', 'Vẽ thêm', 'Đính đá'],
  LASH_PMU_STUDIO: ['Nối mi', 'Xăm mày', 'Xăm môi', 'Xăm mí'],
  SPA_SHOP:        ['Thư giãn', 'Trị liệu', 'Thêm dầu', 'Đặc biệt'],
  MASSAGE_SHOP:    ['Thư giãn', 'Trị liệu', 'Massage chân', 'Thêm giờ'],
  BEAUTY_CLINIC:   ['Chăm sóc da', 'Laser', 'HIFU', 'Triệt lông'],
  MAKEUP_STUDIO:   ['Đi tiệc', 'Cô dâu', 'Chụp ảnh', 'Dự sự kiện'],
  COFFEE_SHOP:     ['Ít đá', 'Nhiều đá', 'Không đường', 'Ít ngọt'],
  RESTAURANT:      ['Ít cay', 'Không hành', 'Thêm rau', 'Đóng gói'],
};

export function getQuickPhrases(shopTypeCode: string): string[] {
  return QUICK_PHRASES[shopTypeCode] ?? [];
}
