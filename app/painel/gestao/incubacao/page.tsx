import LojinhaFeatureGuard from '@/components/LojinhaFeatureGuard';
import IncubacaoApp from './IncubacaoApp';
import IncubacaoMobileGuard from './IncubacaoMobileGuard';
import IncubacaoOfflineBridge from './IncubacaoOfflineBridge';

export default function IncubacaoPage() {
  return (
    <LojinhaFeatureGuard recurso="A Incubação de ovos">
      <IncubacaoOfflineBridge>
        <IncubacaoMobileGuard>
          <IncubacaoApp />
        </IncubacaoMobileGuard>
      </IncubacaoOfflineBridge>
    </LojinhaFeatureGuard>
  );
}
