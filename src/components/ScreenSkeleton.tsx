import { View } from 'react-native';
import { Skeleton } from './Skeleton';

type Props = {
  /** Number of skeleton cards to render (default 4) */
  count?: number;
  /** Height of each card in px (default 80) */
  cardHeight?: number;
};

export function ScreenSkeleton({ count = 4, cardHeight = 80 }: Props) {
  return (
    <View className="px-4 pt-4 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={cardHeight} borderRadius={16} />
      ))}
    </View>
  );
}
