import { useTranslation } from 'react-i18next';
import { useAlertStore } from '../store/alertStore';

export function useErrorAlert() {
  const { show } = useAlertStore();
  const { t } = useTranslation();
  return (err?: unknown) => {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    show(t('common.error'), msg ?? t('common.errorStateMsg'), [{ label: t('common.close'), style: 'cancel' }]);
  };
}
