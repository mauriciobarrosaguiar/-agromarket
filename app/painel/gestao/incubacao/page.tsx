import IncubacaoApp from './IncubacaoApp';
import IncubacaoMobileGuard from './IncubacaoMobileGuard';
import IncubacaoOfflineBridge from './IncubacaoOfflineBridge';

export default function IncubacaoPage() {
  return (
    <IncubacaoOfflineBridge>
      <IncubacaoMobileGuard>
        <IncubacaoApp />
      </IncubacaoMobileGuard>
    </IncubacaoOfflineBridge>
  );
}
