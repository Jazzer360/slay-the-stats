import { useNavigate } from 'react-router';
import { useProfileRunsStore } from '../store/profileRuns';

export function useProfileNav() {
  const navigate = useNavigate();
  const screenName = useProfileRunsStore((s) => s.screenName);
  const base = screenName ? `/u/${screenName}` : '';
  const runsPath = `${base}/runs`;

  function toRunDetail(fileName: string) {
    const encoded = encodeURIComponent(fileName.replace(/\.run$/, ''));
    navigate(`${base}/runs/${encoded}`);
  }

  function toRunsWithCard(cardId: string) {
    navigate(`${base}/runs?card=${encodeURIComponent(cardId)}`);
  }

  function toRunsWithAncient(ancientKey: string) {
    navigate(`${base}/runs?ancient=${encodeURIComponent(ancientKey)}`);
  }

  function toCardDetail(entityId: string) {
    const slug = entityId.replace(/^CARD\./, '').toLowerCase();
    navigate(`${base}/card-elo/${encodeURIComponent(slug)}`);
  }

  function toAncientDetail(entityId: string) {
    navigate(`${base}/ancient-elo/${encodeURIComponent(entityId)}`);
  }

  return {
    toRunDetail,
    toRunsWithCard,
    toRunsWithAncient,
    toCardDetail,
    toAncientDetail,
    runsPath,
    base,
  };
}
