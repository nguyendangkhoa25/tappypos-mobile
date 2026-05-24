import { useState, useEffect } from 'react';
import { View, Text, Image } from 'react-native';

type Props = {
  /** R2 public URL for the avatar, or null to show initials fallback */
  uri: string | null | undefined;
  /** Display name used to derive initials when no image is available */
  name: string;
  /** Diameter of the avatar circle in pixels (default: 44) */
  size?: number;
  /** Background color when showing initials (default: '#4f46e5' = indigo-600) */
  color?: string;
};

/**
 * Circular avatar that shows an image when `uri` is set,
 * falling back to a coloured circle with the first-letter initial.
 *
 * Also falls back to initials when the URI is set but the image
 * fails to load (broken URL, network error, 404).
 */
export function AvatarImage({ uri, name, size = 44, color = '#4f46e5' }: Props) {
  const [hasError, setHasError] = useState(false);
  const radius = size / 2;
  const initial = (name || '?').charAt(0).toUpperCase();
  const fontSize = Math.round(size * 0.4);

  // Reset error state whenever the URI changes (e.g. after a new upload)
  useEffect(() => {
    setHasError(false);
  }, [uri]);

  if (uri && !hasError) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: color + '22', // 13% opacity tint
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}
