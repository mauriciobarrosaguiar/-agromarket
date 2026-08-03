import LojinhaFeatureGuard from '@/components/LojinhaFeatureGuard';
import AgroGestaoClickableApp from './AgroGestaoClickableApp';

export default function AgroGestaoPage() {
  return (
    <LojinhaFeatureGuard recurso="O AgroGestão">
      <AgroGestaoClickableApp />
    </LojinhaFeatureGuard>
  );
}
