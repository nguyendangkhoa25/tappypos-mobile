import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { pawnApi, shopConfigApi, type PawnData, type PawnInterestMode, type ShopInfo } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';

// ── Interest calculation helpers ──────────────────────────────────────────────

const CALC_MODES: PawnInterestMode[] = ['DAILY_30', 'DAILY_25', 'MONTHLY', 'BIWEEKLY'];
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd, formatDate } from '../../utils/format';
import { MoneyInput } from '../../components/MoneyInput';
import { DatePickerInput } from '../../components/DatePickerInput';
import { Skeleton } from '../../components/Skeleton';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { SellingStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<SellingStackParamList>;
type RouteT = RouteProp<SellingStackParamList, 'PawnDetail'>;

// ── Contract HTML template ────────────────────────────────────────────────────

const CALC_MODE_VI: Record<string, string> = {
  DAILY_30: 'Theo ngày – 30 ngày/tháng',
  DAILY_25: 'Theo ngày – tối đa 25 ngày/tháng',
  MONTHLY:  'Theo tháng tròn',
  BIWEEKLY: 'Theo nửa tháng (15 ngày)',
};

const CATEGORY_VI: Record<string, string> = {
  GENERAL: 'Tổng quát', ELECTRONICS: 'Điện tử',
  VEHICLE: 'Phương tiện', WATCH: 'Đồng hồ', REAL_ESTATE: 'Bất động sản',
};

// ── Audit timeline config ─────────────────────────────────────────────────────

type AuditCfg = { labelKey: string; icon: string; color: string; bgColor: string };

const AUDIT_CONFIG: Record<string, AuditCfg> = {
  PAWN_CREATED:       { labelKey: 'pawn.audit.PAWN_CREATED',       icon: 'file-document-plus-outline', color: '#16a34a', bgColor: '#dcfce7' },
  PAWN_UPDATED:       { labelKey: 'pawn.audit.PAWN_UPDATED',       icon: 'pencil-circle-outline',       color: '#2563eb', bgColor: '#dbeafe' },
  PAWN_EXTENDED:      { labelKey: 'pawn.audit.PAWN_EXTENDED',      icon: 'calendar-clock-outline',      color: '#7c3aed', bgColor: '#ede9fe' },
  PAWN_REDEEMED:      { labelKey: 'pawn.audit.PAWN_REDEEMED',      icon: 'check-all',                   color: '#16a34a', bgColor: '#dcfce7' },
  PAWN_FORFEITED:     { labelKey: 'pawn.audit.PAWN_FORFEITED',     icon: 'gavel',                       color: '#ea580c', bgColor: '#ffedd5' },
  PAWN_CANCELLED:     { labelKey: 'pawn.audit.PAWN_CANCELLED',     icon: 'close-circle-outline',        color: '#dc2626', bgColor: '#fee2e2' },
  PAWN_REQUEST_MONEY: { labelKey: 'pawn.audit.PAWN_REQUEST_MONEY', icon: 'cash-plus',                   color: '#0891b2', bgColor: '#cffafe' },
};
const AUDIT_FALLBACK: AuditCfg = { labelKey: '', icon: 'information-outline', color: '#6b7280', bgColor: '#f3f4f6' };

function calcExpectedInterest(pawn: PawnData): number {
  const days = Math.max(0, Math.floor(
    (new Date(pawn.pawnDueDate).getTime() - new Date(pawn.pawnDate).getTime()) / 86_400_000,
  ));
  const r = pawn.interestRate / 100;
  const a = pawn.pawnAmount;
  const mode = pawn.interestCalcMode ?? 'MONTHLY';
  if (mode === 'DAILY_30') return Math.round((a * r / 30) * days);
  if (mode === 'DAILY_25') {
    const full = Math.floor(days / 30); const rem = days % 30;
    return Math.round(a * r / 30 * (25 * full + Math.min(rem, 25)));
  }
  if (mode === 'BIWEEKLY') return Math.round(a * r * Math.ceil(days / 15) / 2);
  return Math.round(a * r * Math.ceil(days / 30));
}

function row(label: string, value: string) {
  return `<tr><td class="lbl">${label}</td><td class="val">${value}</td></tr>`;
}

function buildPawnContractHtml(pawn: PawnData, shop: ShopInfo | null | undefined): string {
  const expectedInterest = calcExpectedInterest(pawn);
  const dueMs = new Date(pawn.pawnDueDate).getTime() - new Date(pawn.pawnDate).getTime();
  const contractDays = Math.max(0, Math.floor(dueMs / 86_400_000));

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const disbursementsHtml = (pawn.reqMoneys?.length ?? 0) > 0
    ? `<tr><td colspan="2" class="section-title">Giải ngân thêm</td></tr>
       ${pawn.reqMoneys!.map((r) => `<tr><td class="lbl">· ${fmtDate(r.requestDate)}</td><td class="val">${formatVnd(r.requestAmount)}</td></tr>`).join('')}`
    : '';

  const detailRows = (() => {
    const el = pawn.electronicsDetail;
    const ve = pawn.vehicleDetail;
    const wa = pawn.watchDetail;
    const re = pawn.realEstateDetail;
    const ge = pawn.generalDetail;
    if (el) return `${row('Hãng / Model', `${el.brand ?? ''} ${el.model ?? ''}`.trim())}
                    ${el.serialNumber ? row('IMEI / Serial', el.serialNumber) : ''}
                    ${el.conditionGrade ? row('Tình trạng', el.conditionGrade) : ''}`;
    if (ve) return `${row('Hãng / Model', `${ve.brand ?? ''} ${ve.model ?? ''}`.trim())}
                    ${ve.licensePlate ? row('Biển số', ve.licensePlate) : ''}
                    ${ve.conditionGrade ? row('Tình trạng', ve.conditionGrade) : ''}`;
    if (wa) return `${row('Hãng / Model', `${wa.brand ?? ''} ${wa.model ?? ''}`.trim())}
                    ${wa.serialNumber ? row('Serial', wa.serialNumber) : ''}
                    ${wa.conditionGrade ? row('Tình trạng', wa.conditionGrade) : ''}`;
    if (re && re.address) return row('Địa chỉ', re.address);
    if (ge) return `${ge.brand ? row('Thương hiệu', ge.brand) : ''}${ge.model ? row('Model', ge.model) : ''}${ge.conditionGrade ? row('Tình trạng', ge.conditionGrade) : ''}`;
    return '';
  })();

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Times New Roman",serif;font-size:13px;color:#000;padding:28px 32px;max-width:640px;margin:0 auto}
  .shop-header{text-align:center;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #000}
  .shop-name{font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
  .shop-sub{font-size:12px;color:#444;margin-top:3px}
  .doc-title{text-align:center;margin:18px 0 14px}
  .doc-title h1{font-size:22px;font-weight:bold;letter-spacing:3px;text-transform:uppercase}
  .doc-title p{font-size:12px;color:#555;margin-top:5px}
  .meta{display:flex;justify-content:space-between;margin-bottom:16px;font-size:12px}
  .section-title{font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:1px;
    background:#f0f0f0;padding:4px 8px;border-left:3px solid #000;margin-bottom:0}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  table.info td{padding:5px 8px;vertical-align:top;border-bottom:1px solid #eee}
  td.lbl{color:#555;width:46%;font-size:12px}
  td.val{font-weight:600;font-size:13px}
  .terms-box{border:2px solid #000;padding:12px 14px;margin-bottom:14px}
  .terms-box table td{border:none;padding:4px 4px}
  .terms-box .highlight{font-size:15px;font-weight:bold;border-top:1px solid #000;padding-top:8px;margin-top:6px}
  .note{font-size:11px;color:#555;font-style:italic;margin-bottom:22px;padding:8px;border:1px dashed #ccc;line-height:1.6}
  .sigs{display:flex;justify-content:space-around;margin-top:36px}
  .sig{text-align:center;width:42%}
  .sig-title{font-weight:bold;font-size:12px;margin-bottom:54px}
  .sig-name{font-size:12px;border-top:1px solid #000;padding-top:4px}
  .footer{text-align:center;font-size:11px;color:#888;margin-top:28px;border-top:1px solid #eee;padding-top:8px}
</style>
</head>
<body>
  ${shop ? `
  <div class="shop-header">
    <div class="shop-name">${shop.shopName}</div>
    ${shop.address ? `<div class="shop-sub">${shop.address}</div>` : ''}
    ${shop.phone ? `<div class="shop-sub">ĐT: ${shop.phone}</div>` : ''}
  </div>` : ''}

  <div class="doc-title">
    <h1>Phiếu Cầm Đồ</h1>
    <p>Hợp đồng cầm cố tài sản</p>
  </div>

  <div class="meta">
    <span>Số phiếu: <strong>#${pawn.pawnId}</strong></span>
    <span>Ngày lập: <strong>${fmtDate(pawn.pawnDate)}</strong></span>
  </div>

  <table class="info">
    <tr><td colspan="2" class="section-title">I. Thông tin khách hàng</td></tr>
    ${row('Tên khách hàng', pawn.customerName || 'Khách vãng lai')}
    ${pawn.phone ? row('Số điện thoại', pawn.phone) : ''}
  </table>

  <table class="info">
    <tr><td colspan="2" class="section-title">II. Tài sản cầm đồ</td></tr>
    ${row('Tên tài sản', pawn.itemName)}
    ${pawn.pawnCategory ? row('Loại tài sản', CATEGORY_VI[pawn.pawnCategory] ?? pawn.pawnCategory) : ''}
    ${pawn.itemBrand ? row('Thương hiệu', pawn.itemBrand) : ''}
    ${detailRows}
    ${pawn.itemWeight ? row('Trọng lượng', `${pawn.itemWeight} g`) : ''}
    ${pawn.itemValue ? row('Giá trị ước tính', formatVnd(pawn.itemValue)) : ''}
    ${pawn.itemDescription ? row('Mô tả', pawn.itemDescription) : ''}
  </table>

  <div class="terms-box">
    <table>
      <tr><td colspan="2" style="font-weight:bold;font-size:13px;padding-bottom:8px">III. Điều khoản hợp đồng</td></tr>
      ${row('Số tiền cầm', formatVnd(pawn.pawnAmount))}
      ${row('Lãi suất', `${pawn.interestRate}%/tháng`)}
      ${row('Cách tính lãi', CALC_MODE_VI[pawn.interestCalcMode ?? 'MONTHLY'] ?? pawn.interestCalcMode ?? '')}
      ${row('Ngày cầm', fmtDate(pawn.pawnDate))}
      ${row('Ngày đáo hạn', `${fmtDate(pawn.pawnDueDate)} (${contractDays} ngày)`)}
      ${disbursementsHtml}
      <tr><td colspan="2" class="highlight" style="display:table-cell"></td></tr>
      <tr class="highlight"><td class="lbl" style="font-size:13px;font-weight:bold;color:#000">Lãi dự kiến (đúng hạn)</td>
        <td class="val" style="font-size:15px">${formatVnd(expectedInterest)}</td></tr>
      <tr class="highlight"><td class="lbl" style="font-size:13px;font-weight:bold;color:#000">Tổng cần chuộc (đúng hạn)</td>
        <td class="val" style="font-size:16px;color:#1a1aff">${formatVnd(pawn.pawnAmount + expectedInterest)}</td></tr>
    </table>
  </div>

  <div class="note">
    ⚠️ Quá ngày đáo hạn mà không chuộc hoặc gia hạn, tài sản sẽ được thanh lý.<br>
    Khách hàng vui lòng liên hệ trước ngày đáo hạn để gia hạn hợp đồng.
  </div>

  <div class="sigs">
    <div class="sig">
      <div class="sig-title">Chữ ký khách hàng</div>
      <div class="sig-name">${pawn.customerName || ''}</div>
    </div>
    <div class="sig">
      <div class="sig-title">Chữ ký nhân viên</div>
      <div class="sig-name">&nbsp;</div>
    </div>
  </div>

  ${shop ? `<div class="footer">${shop.shopName}${shop.phone ? ' · ' + shop.phone : ''}</div>` : ''}
</body>
</html>`;
}

// ── Interest calculation (client-side, mirrors backend) ───────────────────────

function calcInterestForMode(mode: PawnInterestMode, rateMonthly: number, amount: number, days: number): number {
  const r = rateMonthly / 100;
  if (mode === 'DAILY_30') return (amount * r / 30) * days;
  if (mode === 'DAILY_25') {
    const full = Math.floor(days / 30);
    const rem = days % 30;
    return amount * r / 30 * (25 * full + Math.min(rem, 25));
  }
  if (mode === 'BIWEEKLY') return amount * r * Math.ceil(days / 15) / 2;
  return amount * r * Math.ceil(days / 30); // MONTHLY
}

function calcInterestAll(pawn: PawnData, toDate: Date): Record<PawnInterestMode, number> {
  const heldDays = Math.max(0, Math.floor((toDate.getTime() - new Date(pawn.pawnDate).getTime()) / 86_400_000));
  const result = {} as Record<PawnInterestMode, number>;
  for (const mode of CALC_MODES) {
    let total = calcInterestForMode(mode, pawn.interestRate, pawn.pawnAmount, heldDays);
    for (const req of pawn.reqMoneys ?? []) {
      const reqDays = Math.max(0, Math.floor((toDate.getTime() - new Date(req.requestDate).getTime()) / 86_400_000));
      total += calcInterestForMode(mode, pawn.interestRate, req.requestAmount, reqDays);
    }
    result[mode] = Math.round(total);
  }
  return result;
}

function calcInterest(pawn: PawnData, toDate = new Date()): number {
  const mode = pawn.interestCalcMode ?? 'MONTHLY';
  return calcInterestAll(pawn, toDate)[mode];
}

function daysDiff(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const typo = useTypography();
  if (!value) return null;
  return (
    <View className="flex-row py-2.5 border-b border-gray-50 dark:border-gray-700/50">
      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 w-36`}>{label}</Text>
      <Text className={`${typo.caption} text-gray-800 dark:text-white font-medium flex-1`}>{value}</Text>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="mx-3 mb-3 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3">
      {children}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center mb-2">
      <MaterialCommunityIcons name={icon} size={14} color="#6b7280" style={{ marginRight: 4 }} />
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>{title}</Text>
    </View>
  );
}

type AuditChipColor = 'gray' | 'green' | 'blue' | 'orange';
function AuditChip({ label, value, color = 'gray' }: { label: string; value: string; color?: AuditChipColor }) {
  const typo = useTypography();
  const bg: Record<AuditChipColor, string> = {
    gray:   'bg-gray-100 dark:bg-gray-700',
    green:  'bg-green-50 dark:bg-green-900/20',
    blue:   'bg-blue-50 dark:bg-blue-900/20',
    orange: 'bg-orange-50 dark:bg-orange-900/20',
  };
  const txt: Record<AuditChipColor, string> = {
    gray:   'text-gray-600 dark:text-gray-300',
    green:  'text-green-700 dark:text-green-400',
    blue:   'text-blue-700 dark:text-blue-400',
    orange: 'text-orange-700 dark:text-orange-400',
  };
  return (
    <View className={`rounded-lg px-2 py-0.5 ${bg[color]}`}>
      <Text className={`${typo.caption} ${txt[color]}`}>
        {label}: <Text className="font-semibold">{value}</Text>
      </Text>
    </View>
  );
}

// ── Action Sheet modals ───────────────────────────────────────────────────────

function PrintActionSheet({ pawn, shop, onClose }: {
  pawn: PawnData;
  shop: ShopInfo | null | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const [busy, setBusy] = useState<'print' | 'share' | null>(null);

  const html = useMemo(() => buildPawnContractHtml(pawn, shop), [pawn, shop]);

  const handlePrint = async () => {
    setBusy('print');
    try {
      await Print.printAsync({ html });
    } finally {
      setBusy(null);
      onClose();
    }
  };

  const handleShare = async () => {
    setBusy('share');
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
    } finally {
      setBusy(null);
      onClose();
    }
  };

  return (
    <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8">
      <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
      <Text className={`${typo.section} text-gray-900 dark:text-white mb-5`}>{t('pawn.print.title')}</Text>

      <TouchableOpacity
        onPress={handlePrint}
        disabled={!!busy}
        className="flex-row items-center bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-4 mb-3"
        activeOpacity={0.7}
      >
        <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mr-3">
          <MaterialCommunityIcons name="printer-outline" size={22} color="#4f46e5" />
        </View>
        <View className="flex-1">
          <Text className={`${typo.label} text-gray-900 dark:text-white`}>{t('pawn.print.printBtn')}</Text>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>Gửi đến máy in hoặc lưu PDF</Text>
        </View>
        {busy === 'print'
          ? <ActivityIndicator size="small" color="#4f46e5" />
          : <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleShare}
        disabled={!!busy}
        className="flex-row items-center bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-4"
        activeOpacity={0.7}
      >
        <View className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-xl items-center justify-center mr-3">
          <MaterialCommunityIcons name="share-variant-outline" size={22} color="#059669" />
        </View>
        <View className="flex-1">
          <Text className={`${typo.label} text-gray-900 dark:text-white`}>{t('pawn.print.shareBtn')}</Text>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>Chia sẻ qua Zalo, Messenger...</Text>
        </View>
        {busy === 'share'
          ? <ActivityIndicator size="small" color="#059669" />
          : <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />}
      </TouchableOpacity>
    </View>
  );
}

function RedeemModal({ pawn, onClose }: { pawn: PawnData; onClose: () => void }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const showError = useErrorAlert();
  const showToast = useToastStore((s) => s.show);
  const today = new Date().toISOString().slice(0, 10);
  const interest = useMemo(() => calcInterest(pawn), [pawn]);

  const mutation = useMutation({
    mutationFn: () => pawnApi.redeem(pawn.pawnId, today, pawn.interestCalcMode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pawn', pawn.pawnId] });
      qc.invalidateQueries({ queryKey: ['pawns'] });
      qc.invalidateQueries({ queryKey: ['pawnKPIs'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('pawn.redeem.confirm'), undefined, 'success');
      onClose();
    },
    onError: showError,
  });

  return (
    <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8">
      <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
      <Text className={`${typo.section} text-gray-900 dark:text-white mb-4`}>{t('pawn.redeem.title')}</Text>

      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-3`}>
        {t('pawn.redeem.breakdown')}
      </Text>
      <View className="gap-2 mb-5">
        <View className="flex-row justify-between">
          <Text className={`${typo.caption} text-gray-600 dark:text-gray-300`}>{t('pawn.redeem.principal')}</Text>
          <Text className={`${typo.label} text-gray-900 dark:text-white`}>{formatVnd(pawn.pawnAmount)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className={`${typo.caption} text-gray-600 dark:text-gray-300`}>{t('pawn.redeem.interest')}</Text>
          <Text className={`${typo.label} text-blue-600 dark:text-blue-400`}>{formatVnd(interest)}</Text>
        </View>
        <View className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
        <View className="flex-row justify-between">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{t('pawn.redeem.total')}</Text>
          <Text className={`${typo.labelBold} text-primary`}>{formatVnd(pawn.pawnAmount + interest)}</Text>
        </View>
      </View>
      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-4 text-center`}>{t('pawn.detail.pawnDate')}: {formatDate(today)}</Text>

      <TouchableOpacity
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="bg-green-500 rounded-2xl py-4 items-center"
      >
        {mutation.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text className={`${typo.labelBold} text-white`}>{t('pawn.redeem.confirm')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

function ForfeitModal({ pawn, onClose }: { pawn: PawnData; onClose: () => void }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const showError = useErrorAlert();
  const showToast = useToastStore((s) => s.show);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const interest = useMemo(() => calcInterest(pawn), [pawn]);

  const mutation = useMutation({
    mutationFn: () => pawnApi.forfeit(pawn.pawnId, {
      forfeitedDate: new Date().toISOString(),
      forfeitedAmount: parseFloat(amount.replace(/\D/g, '')) || 0,
      forfeitedReason: reason.trim() || undefined,
      totalAmount: pawn.pawnAmount + interest,
      interestAmount: interest,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pawn', pawn.pawnId] });
      qc.invalidateQueries({ queryKey: ['pawns'] });
      qc.invalidateQueries({ queryKey: ['pawnKPIs'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('pawn.forfeit.confirm'), undefined, 'success');
      onClose();
    },
    onError: showError,
  });

  const saleAmount = parseInt(amount || '0', 10);
  const gainLoss = saleAmount - (pawn.pawnAmount + interest);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8">
        <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
        <Text className={`${typo.section} text-gray-900 dark:text-white mb-4`}>{t('pawn.forfeit.title')}</Text>

        <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('pawn.forfeit.forfeitAmount')}</Text>
        <View className="mb-3">
          <MoneyInput rawValue={amount} onChangeRaw={setAmount} placeholder="0" />
        </View>

        {saleAmount > 0 && (
          <View className="flex-row justify-between mb-3 bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3">
            <Text className={`${typo.caption} text-gray-600 dark:text-gray-300`}>{t('pawn.forfeit.gainLoss')}</Text>
            <Text className={`${typo.labelBold} ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gainLoss >= 0 ? '+' : ''}{formatVnd(gainLoss)}
            </Text>
          </View>
        )}

        <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('pawn.forfeit.reason')}</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder={t('pawn.cancel.reasonPlaceholder')}
          placeholderTextColor="#9ca3af"
          className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4`}
        />

        <TouchableOpacity
          onPress={() => mutation.mutate()}
          disabled={!amount.trim() || mutation.isPending}
          className={`rounded-2xl py-4 items-center ${amount.trim() && !mutation.isPending ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text className={`${typo.labelBold} ${amount.trim() ? 'text-white' : 'text-gray-400'}`}>{t('pawn.forfeit.confirm')}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function RequestMoneyModal({ pawn, onClose }: { pawn: PawnData; onClose: () => void }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const showError = useErrorAlert();
  const showToast = useToastStore((s) => s.show);
  const [amount, setAmount] = useState('');

  const mutation = useMutation({
    mutationFn: () => pawnApi.requestMoney(
      pawn.pawnId,
      new Date().toISOString().slice(0, 10),
      parseFloat(amount.replace(/\D/g, '')) || 0,
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pawn', pawn.pawnId] });
      qc.invalidateQueries({ queryKey: ['pawns'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('pawn.requestMoney.confirm'), undefined, 'success');
      onClose();
    },
    onError: showError,
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8">
        <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
        <Text className={`${typo.section} text-gray-900 dark:text-white mb-4`}>{t('pawn.requestMoney.title')}</Text>

        <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('pawn.requestMoney.amount')}</Text>
        <View className="mb-4">
          <MoneyInput rawValue={amount} onChangeRaw={setAmount} placeholder="0" autoFocus />
        </View>

        <TouchableOpacity
          onPress={() => mutation.mutate()}
          disabled={!amount.trim() || mutation.isPending}
          className={`rounded-2xl py-4 items-center ${amount.trim() && !mutation.isPending ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text className={`${typo.labelBold} ${amount.trim() ? 'text-white' : 'text-gray-400'}`}>{t('pawn.requestMoney.confirm')}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function ExtendModal({ pawn, onClose }: { pawn: PawnData; onClose: () => void }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const showError = useErrorAlert();
  const showToast = useToastStore((s) => s.show);

  const today = new Date().toISOString().slice(0, 10);
  const currentInterest = useMemo(() => calcInterest(pawn), [pawn]);

  function addDaysFromToday(n: number) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  const [newDueDate, setNewDueDate] = useState(() => addDaysFromToday(30));
  const [newRate, setNewRate] = useState(String(pawn.interestRate));
  const [settleInterest, setSettleInterest] = useState(false);

  const mutation = useMutation({
    mutationFn: () => pawnApi.extend(pawn.pawnId, {
      pawnDueDate: new Date(newDueDate).toISOString(),
      interestRate: parseFloat(newRate) || pawn.interestRate,
      ...(settleInterest ? { pawnDate: new Date(today).toISOString() } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pawn', pawn.pawnId] });
      qc.invalidateQueries({ queryKey: ['pawns'] });
      qc.invalidateQueries({ queryKey: ['pawnKPIs'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('pawn.extend.success'), undefined, 'success');
      onClose();
    },
    onError: showError,
  });

  const isValid = newDueDate.length === 10 && !isNaN(new Date(newDueDate).getTime());

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8">
        <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
        <Text className={`${typo.section} text-gray-900 dark:text-white mb-4`}>{t('pawn.extend.title')}</Text>

        {/* Current interest summary */}
        <View className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 mb-4">
          <View className="flex-row justify-between py-1">
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('pawn.extend.interestToDate')}</Text>
            <Text className={`${typo.label} text-blue-600 dark:text-blue-400`}>{formatVnd(currentInterest)}</Text>
          </View>
          <View className="flex-row justify-between py-1">
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('pawn.extend.totalDue')}</Text>
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{formatVnd(pawn.pawnAmount + currentInterest)}</Text>
          </View>
        </View>

        {/* New due date */}
        <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('pawn.extend.newDueDate')}</Text>
        <View className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 mb-2">
          <DatePickerInput value={newDueDate} onChange={setNewDueDate} minimumDate={new Date()} />
        </View>
        {/* Quick-add pills */}
        <View className="flex-row gap-2 mb-4">
          {[30, 60, 90].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setNewDueDate(addDaysFromToday(n))}
              className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg py-2 items-center"
            >
              <Text className={`${typo.captionBold} text-gray-600 dark:text-gray-300`}>+{n} {t('common.day')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* New rate */}
        <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('pawn.extend.newRate')}</Text>
        <View className="flex-row items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden mb-4">
          <TextInput
            value={newRate}
            onChangeText={setNewRate}
            keyboardType="decimal-pad"
            placeholder={String(pawn.interestRate)}
            placeholderTextColor="#9ca3af"
            className={`flex-1 ${typo.inputSize} text-gray-900 dark:text-white px-4 py-3 bg-gray-50 dark:bg-gray-700`}
          />
          <View className="px-3 py-3 bg-gray-100 dark:bg-gray-600">
            <Text className={`${typo.label} text-gray-500 dark:text-gray-300`}>%</Text>
          </View>
        </View>

        {/* Settle interest toggle */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`${typo.caption} font-medium text-gray-800 dark:text-white flex-1 mr-3`}>{t('pawn.extend.settleInterest')}</Text>
          <Switch
            value={settleInterest}
            onValueChange={setSettleInterest}
            trackColor={{ true: '#4f46e5' }}
          />
        </View>
        {settleInterest && (
          <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-2.5 mb-4">
            <Text className={`${typo.caption} text-indigo-700 dark:text-indigo-300`}>
              {t('pawn.extend.settleInterestHint', { amount: formatVnd(currentInterest) })}
            </Text>
          </View>
        )}
        {!settleInterest && <View className="mb-4" />}

        <TouchableOpacity
          onPress={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
          className={`rounded-2xl py-4 items-center ${isValid && !mutation.isPending ? 'bg-primary active:opacity-80' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text className={`${typo.labelBold} ${isValid ? 'text-white' : 'text-gray-400'}`}>{t('pawn.extend.confirm')}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function CancelModal({ pawn, onClose, navigation }: { pawn: PawnData; onClose: () => void; navigation: Nav }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const showError = useErrorAlert();
  const showToast = useToastStore((s) => s.show);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => pawnApi.cancel(pawn.pawnId, reason.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pawns'] });
      qc.invalidateQueries({ queryKey: ['pawnKPIs'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('pawn.cancel.confirm'), undefined, 'success');
      onClose();
      navigation.goBack();
    },
    onError: showError,
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8">
        <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
        <Text className={`${typo.section} text-gray-900 dark:text-white mb-4`}>{t('pawn.cancel.title')}</Text>

        <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('pawn.cancel.reason')}</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder={t('pawn.cancel.reasonPlaceholder')}
          placeholderTextColor="#9ca3af"
          autoFocus
          multiline
          numberOfLines={3}
          className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4`}
          style={{ textAlignVertical: 'top', minHeight: 72 }}
        />

        <TouchableOpacity
          onPress={() => mutation.mutate()}
          disabled={!reason.trim() || mutation.isPending}
          className={`rounded-2xl py-4 items-center ${reason.trim() && !mutation.isPending ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text className={`${typo.labelBold} ${reason.trim() ? 'text-white' : 'text-gray-400'}`}>{t('pawn.cancel.confirm')}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type ActiveModal = 'print' | 'redeem' | 'extend' | 'forfeit' | 'requestMoney' | 'cancel' | null;

export function PawnDetailScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { pawnId } = route.params;
  const qc = useQueryClient();
  const showError = useErrorAlert();
  const showAlert = useAlertStore((s) => s.show);
  const showToast = useToastStore((s) => s.show);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [calcDate, setCalcDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: pawn, isLoading } = useQuery({
    queryKey: ['pawn', pawnId],
    queryFn: () => pawnApi.getById(pawnId).then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: shopInfo } = useQuery({
    queryKey: ['shopInfo'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const visibleMutation = useMutation({
    mutationFn: (visible: boolean) => pawnApi.setVisible(pawnId, visible),
    onSuccess: (_, visible) => {
      qc.invalidateQueries({ queryKey: ['pawn', pawnId] });
      qc.invalidateQueries({ queryKey: ['pawns'] });
      showToast(visible ? t('pawn.detail.visible') : t('pawn.detail.hidden'), undefined, 'success');
    },
    onError: showError,
  });

  const calcDateObj = useMemo(() => {
    const d = new Date(calcDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [calcDate]);

  const modeInterests = useMemo(
    () => pawn ? calcInterestAll(pawn, calcDateObj) : null,
    [pawn, calcDateObj],
  );

  const activeMode = (pawn?.interestCalcMode ?? 'MONTHLY') as PawnInterestMode;
  const interest = modeInterests ? modeInterests[activeMode] : 0;
  const calcHeldDays = pawn
    ? Math.max(0, Math.floor((calcDateObj.getTime() - new Date(pawn.pawnDate).getTime()) / 86_400_000))
    : 0;

  const daysLeft = pawn ? daysDiff(pawn.pawnDueDate) : 0;
  const isOverdue = pawn?.pawnStatus === 'PAWNED' && daysLeft < 0;

  if (isLoading || !pawn) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
          <Skeleton width={160} height={24} />
        </View>
        <View className="p-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={100} borderRadius={16} />)}
        </View>
      </View>
    );
  }

  const isPawned = pawn.pawnStatus === 'PAWNED';

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white flex-1`}>
            {t('pawn.contractId', { id: pawn.pawnId })}
          </Text>
          {isPawned && (
            <TouchableOpacity
              onPress={() => navigation.navigate('PawnForm', { pawnId: pawn.pawnId })}
              className="p-1 mr-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setActiveModal('print')}
            className="p-1 mr-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="printer-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => showAlert(
              pawn.visible ? t('pawn.actions.hide') : t('pawn.actions.show'),
              '',
              [
                { label: t('common.cancel'), style: 'cancel' },
                {
                  label: pawn.visible ? t('pawn.actions.hide') : t('pawn.actions.show'),
                  onPress: () => visibleMutation.mutate(!pawn.visible),
                },
              ],
            )}
            className="p-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name={pawn.visible ? 'eye-outline' : 'eye-off-outline'}
              size={20} color="#6b7280"
            />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('pawn.detailHint')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 4, paddingTop: 12, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View className={`mx-3 mb-3 rounded-2xl px-4 py-3 flex-row items-center ${
          isOverdue ? 'bg-red-50 dark:bg-red-900/20' :
          isPawned ? 'bg-blue-50 dark:bg-blue-900/20' :
          pawn.pawnStatus === 'REDEEMED' ? 'bg-green-50 dark:bg-green-900/20' :
          'bg-gray-50 dark:bg-gray-800'
        }`}>
          <MaterialCommunityIcons
            name={isOverdue ? 'alert-circle' : isPawned ? 'clock-outline' : pawn.pawnStatus === 'REDEEMED' ? 'check-circle' : 'close-circle'}
            size={22}
            color={isOverdue ? '#dc2626' : isPawned ? '#2563eb' : pawn.pawnStatus === 'REDEEMED' ? '#059669' : '#9ca3af'}
          />
          <View className="ml-3 flex-1">
            <Text className={`${typo.labelBold} ${
              isOverdue ? 'text-red-700 dark:text-red-400' :
              isPawned ? 'text-blue-700 dark:text-blue-400' :
              pawn.pawnStatus === 'REDEEMED' ? 'text-green-700 dark:text-green-400' :
              'text-gray-600 dark:text-gray-300'
            }`}>
              {t(`pawn.status.${pawn.pawnStatus}`)}
              {isOverdue ? ` · ${t('pawn.overdueLabel', { days: Math.abs(daysLeft) })}` : ''}
            </Text>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
              {t('pawn.detail.pawnAmount')}: {formatVnd(pawn.pawnAmount)} · {pawn.interestRate}%{t('pawn.perMonth')}
            </Text>
          </View>
        </View>

        {/* Interest calculator (PAWNED only) */}
        {isPawned && modeInterests && (
          <SectionCard>
            <SectionTitle icon="calculator-variant-outline" title={t('pawn.detail.interestMeter')} />

            {/* Date selector */}
            <View className="flex-row items-center mb-3">
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mr-2 shrink-0`}>
                {t('pawn.detail.calcToDate')}
              </Text>
              <View className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-700">
                <DatePickerInput value={calcDate} onChange={setCalcDate} />
              </View>
            </View>

            {/* Summary chips */}
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-3 items-center">
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('pawn.detail.heldDays')}</Text>
                <Text className={`${typo.section} text-gray-900 dark:text-white mt-1`}>{calcHeldDays}</Text>
              </View>
              <View className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 items-center">
                <Text className={`${typo.caption} text-blue-600 dark:text-blue-400`}>{t('pawn.detail.accruedInterest')}</Text>
                <Text className={`${typo.section} text-blue-700 dark:text-blue-400 mt-1`}>{formatVnd(interest)}</Text>
              </View>
              <View className="flex-1 bg-primary/10 dark:bg-primary/20 rounded-xl p-3 items-center">
                <Text className={`${typo.caption} text-primary`}>{t('pawn.detail.totalToRedeem')}</Text>
                <Text className={`${typo.section} text-primary mt-1`}>{formatVnd(pawn.pawnAmount + interest)}</Text>
              </View>
            </View>

            {/* 4-mode comparison */}
            <View className="border-t border-gray-100 dark:border-gray-700 pt-3">
              {CALC_MODES.map((mode) => {
                const isActive = mode === activeMode;
                const modeInterest = modeInterests[mode];
                return (
                  <View
                    key={mode}
                    className={`flex-row items-center py-2 ${
                      isActive ? '-mx-4 px-4 bg-primary/5 dark:bg-primary/10 rounded-xl' : ''
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={isActive ? 'check-circle' : 'circle-outline'}
                      size={14}
                      color={isActive ? '#4f46e5' : '#d1d5db'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className={`${typo.caption} flex-1 ${
                        isActive ? 'text-primary font-semibold' : 'text-gray-500 dark:text-gray-400'
                      }`}
                      numberOfLines={1}
                    >
                      {t(`pawn.settings.calcMode_${mode}`)}
                    </Text>
                    <View className="items-end ml-2">
                      <Text className={`${typo.captionBold} ${isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                        +{formatVnd(modeInterest)}
                      </Text>
                      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                        = {formatVnd(pawn.pawnAmount + modeInterest)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </SectionCard>
        )}

        {/* Customer */}
        <SectionCard>
          <SectionTitle icon="account-outline" title={t('pawn.detail.customer')} />
          <InfoRow label={t('common.name')} value={pawn.customerName ?? t('pawn.noCustomer')} />
          <InfoRow label={t('common.phone')} value={pawn.phone} />
        </SectionCard>

        {/* Item */}
        <SectionCard>
          <SectionTitle icon="package-variant-closed" title={t('pawn.detail.item')} />
          <InfoRow label={t('pawn.form.itemName')} value={pawn.itemName} />
          <InfoRow label={t('pawn.form.itemBrand')} value={pawn.itemBrand} />
          <InfoRow label={t('pawn.form.itemType')} value={pawn.itemType} />
          <InfoRow label={t('pawn.detail.weight')} value={pawn.itemWeight ? `${pawn.itemWeight}g` : undefined} />
          <InfoRow label={t('pawn.detail.value')} value={pawn.itemValue ? formatVnd(pawn.itemValue) : undefined} />
          <InfoRow label={t('pawn.form.itemDescription')} value={pawn.itemDescription} />
          {pawn.pawnCategory && (
            <InfoRow label={t('pawn.form.category')} value={t(`pawn.category.${pawn.pawnCategory}`)} />
          )}
          {/* Electronics detail */}
          {pawn.electronicsDetail && (
            <>
              <InfoRow label={t('pawn.form.model')} value={pawn.electronicsDetail.model} />
              <InfoRow label={t('pawn.form.serialNumber')} value={pawn.electronicsDetail.serialNumber} />
              <InfoRow label={t('pawn.form.conditionGrade')} value={pawn.electronicsDetail.conditionGrade} />
            </>
          )}
          {/* Vehicle detail */}
          {pawn.vehicleDetail && (
            <>
              <InfoRow label={t('pawn.form.model')} value={pawn.vehicleDetail.model} />
              <InfoRow label={t('pawn.form.licensePlate')} value={pawn.vehicleDetail.licensePlate} />
              <InfoRow label={t('pawn.form.conditionGrade')} value={pawn.vehicleDetail.conditionGrade} />
            </>
          )}
        </SectionCard>

        {/* Contract */}
        <SectionCard>
          <SectionTitle icon="file-document-outline" title={t('pawn.detail.contract')} />
          <InfoRow label={t('pawn.detail.pawnDate')} value={formatDate(pawn.pawnDate)} />
          <InfoRow label={t('pawn.detail.dueDate')} value={formatDate(pawn.pawnDueDate)} />
          <InfoRow label={t('pawn.detail.pawnAmount')} value={formatVnd(pawn.pawnAmount)} />
          <InfoRow label={t('pawn.detail.interestRate')} value={`${pawn.interestRate}%${t('pawn.perMonth')}`} />
          <InfoRow
            label={t('pawn.detail.interestCalcMode')}
            value={pawn.interestCalcMode ? t(`pawn.settings.calcMode_${pawn.interestCalcMode}`) : '—'}
          />
          {pawn.redeemDate && <InfoRow label={t('pawn.detail.pawnDate')} value={formatDate(pawn.redeemDate)} />}
          {pawn.forfeitedDate && <InfoRow label={t('pawn.forfeit.forfeitDate')} value={formatDate(pawn.forfeitedDate)} />}
          {pawn.canceledReason && <InfoRow label={t('pawn.cancel.reason')} value={pawn.canceledReason} />}
          {pawn.forfeitedReason && <InfoRow label={t('pawn.forfeit.reason')} value={pawn.forfeitedReason} />}
        </SectionCard>

        {/* Disbursements */}
        {(pawn.reqMoneys?.length ?? 0) > 0 && (
          <SectionCard>
            <SectionTitle icon="cash-plus" title={t('pawn.detail.disbursements')} />
            {pawn.reqMoneys!.map((req) => (
              <View key={req.requestId} className="flex-row justify-between py-2.5 border-b border-gray-50 dark:border-gray-700/50">
                <View>
                  <Text className={`${typo.caption} font-medium text-gray-800 dark:text-white`}>{formatVnd(req.requestAmount)}</Text>
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{formatDate(req.requestDate)}</Text>
                </View>
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 self-center`}>
                  {req.heldDays}{t('pawn.daysHeld', { count: '' }).trim()}
                </Text>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Timeline */}
        {(pawn.audits?.length ?? 0) > 0 && (
          <SectionCard>
            <SectionTitle icon="timeline-outline" title={t('pawn.detail.timeline')} />
            {pawn.audits!.map((audit, i) => {
              const cfg = AUDIT_CONFIG[audit.actionType] ?? AUDIT_FALLBACK;
              const label = cfg.labelKey ? t(cfg.labelKey) : audit.actionType;
              const isLast = i === pawn.audits!.length - 1;
              const isCreatedOrUpdated = audit.actionType === 'PAWN_CREATED' || audit.actionType === 'PAWN_UPDATED';
              return (
                <View key={audit.actionId} className="flex-row">
                  {/* Icon column + connector */}
                  <View className="items-center mr-3" style={{ width: 32 }}>
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: cfg.bgColor }}
                    >
                      <MaterialCommunityIcons name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    {!isLast && <View className="w-0.5 flex-1 bg-gray-100 dark:bg-gray-700 mt-1" style={{ minHeight: 12 }} />}
                  </View>

                  {/* Content */}
                  <View className={`flex-1 ${isLast ? 'pb-1' : 'pb-4'}`}>
                    <View className="flex-row items-center justify-between mb-0.5">
                      <Text className={`${typo.label} text-gray-800 dark:text-white flex-1 mr-2`}>{label}</Text>
                      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{formatDate(audit.actionTime)}</Text>
                    </View>
                    <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-1`}>
                      {t('pawn.audit.by')} {audit.createdBy}
                    </Text>

                    {/* Context chips */}
                    {isCreatedOrUpdated && (
                      <View className="flex-row flex-wrap gap-1.5 mt-0.5">
                        <AuditChip label={t('pawn.audit.principal')} value={formatVnd(audit.pawnAmount)} />
                        <AuditChip label={t('pawn.audit.rate')} value={`${audit.interestRate}%`} />
                      </View>
                    )}
                    {audit.actionType === 'PAWN_EXTENDED' && (
                      <View className="flex-row flex-wrap gap-1.5 mt-0.5">
                        <AuditChip label={t('pawn.audit.principal')} value={formatVnd(audit.pawnAmount)} color="blue" />
                        <AuditChip label={t('pawn.audit.rate')} value={`${audit.interestRate}%`} color="blue" />
                      </View>
                    )}
                    {audit.actionType === 'PAWN_REDEEMED' && (
                      <View className="flex-row flex-wrap gap-1.5 mt-0.5">
                        {audit.interestAmount != null && (
                          <AuditChip label={t('pawn.audit.interest')} value={formatVnd(audit.interestAmount)} />
                        )}
                        {audit.totalAmount != null && (
                          <AuditChip label={t('pawn.audit.total')} value={formatVnd(audit.totalAmount)} color="green" />
                        )}
                      </View>
                    )}
                    {audit.actionType === 'PAWN_FORFEITED' && (
                      <View className="mt-0.5">
                        {audit.forfeitedAmount != null && (
                          <View className="flex-row flex-wrap gap-1.5">
                            <AuditChip label={t('pawn.audit.saleAmount')} value={formatVnd(audit.forfeitedAmount)} color="orange" />
                          </View>
                        )}
                        {audit.forfeitedReason ? (
                          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1`}>{audit.forfeitedReason}</Text>
                        ) : null}
                      </View>
                    )}
                    {audit.actionType === 'PAWN_REQUEST_MONEY' && (
                      <View className="flex-row flex-wrap gap-1.5 mt-0.5">
                        <AuditChip label={t('pawn.audit.disbursed')} value={formatVnd(audit.pawnAmount)} color="blue" />
                      </View>
                    )}
                    {audit.canceledReason ? (
                      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1`}>{audit.canceledReason}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </SectionCard>
        )}
      </ScrollView>

      {/* Action buttons — PAWNED only */}
      {isPawned && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {/* Primary: Redeem + Extend */}
          <View className="flex-row gap-2 mb-2">
            <TouchableOpacity
              onPress={() => setActiveModal('redeem')}
              className="flex-1 bg-green-500 rounded-xl py-3 items-center"
            >
              <Text className={`${typo.labelBold} text-white`}>{t('pawn.actions.redeem')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveModal('extend')}
              className="flex-1 bg-primary rounded-xl py-3 items-center"
            >
              <Text className={`${typo.labelBold} text-white`}>{t('pawn.actions.extend')}</Text>
            </TouchableOpacity>
          </View>
          {/* Secondary: Request Money + Forfeit */}
          <View className="flex-row gap-2 mb-2">
            <TouchableOpacity
              onPress={() => setActiveModal('requestMoney')}
              className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl py-3 items-center"
            >
              <Text className={`${typo.labelBold} text-blue-600 dark:text-blue-400`}>{t('pawn.actions.requestMoney')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveModal('forfeit')}
              className="flex-1 bg-orange-100 dark:bg-orange-900/20 rounded-xl py-3 items-center"
            >
              <Text className={`${typo.labelBold} text-orange-600 dark:text-orange-400`}>{t('pawn.actions.forfeit')}</Text>
            </TouchableOpacity>
          </View>
          {/* Danger: Cancel */}
          <TouchableOpacity
            onPress={() => setActiveModal('cancel')}
            className="bg-red-50 dark:bg-red-900/20 rounded-xl py-3 items-center"
          >
            <Text className={`${typo.labelBold} text-red-600 dark:text-red-400`}>{t('pawn.actions.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action modals */}
      <Modal visible={activeModal === 'print'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => setActiveModal(null)} />
        {pawn && <PrintActionSheet pawn={pawn} shop={shopInfo} onClose={() => setActiveModal(null)} />}
      </Modal>

      <Modal visible={activeModal === 'extend'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => setActiveModal(null)} />
        {pawn && <ExtendModal pawn={pawn} onClose={() => setActiveModal(null)} />}
      </Modal>

      <Modal visible={activeModal === 'redeem'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => setActiveModal(null)} />
        {pawn && <RedeemModal pawn={pawn} onClose={() => setActiveModal(null)} />}
      </Modal>

      <Modal visible={activeModal === 'forfeit'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => setActiveModal(null)} />
        {pawn && <ForfeitModal pawn={pawn} onClose={() => setActiveModal(null)} />}
      </Modal>

      <Modal visible={activeModal === 'requestMoney'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => setActiveModal(null)} />
        {pawn && <RequestMoneyModal pawn={pawn} onClose={() => setActiveModal(null)} />}
      </Modal>

      <Modal visible={activeModal === 'cancel'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => setActiveModal(null)} />
        {pawn && <CancelModal pawn={pawn} onClose={() => setActiveModal(null)} navigation={navigation} />}
      </Modal>
    </View>
  );
}
