import IncubacaoApp from './IncubacaoApp';
import IncubacaoMobileGuard from './IncubacaoMobileGuard';

export default function IncubacaoPage() {
  return (
    <IncubacaoMobileGuard>
      <IncubacaoApp />
    </IncubacaoMobileGuard>
  );
}
