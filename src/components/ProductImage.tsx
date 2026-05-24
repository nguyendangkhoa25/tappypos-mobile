import { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import type { StyleProp, ImageStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  /** R2 public URL for the product image, or null/undefined to show placeholder */
  uri: string | null | undefined;
  /** Style applied to both the Image and the placeholder View (width, height, borderRadius, etc.) */
  style: StyleProp<ImageStyle>;
  /** Icon size for the placeholder (default: 32) */
  iconSize?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
};

/**
 * Product image with a styled placeholder fallback.
 *
 * Shows the image from `uri` when available; falls back to a
 * grey-blue icon placeholder if `uri` is null/undefined **or**
 * if the image fails to load (broken URL, 404, network error).
 */
export function ProductImage({ uri, style, iconSize = 32, resizeMode = 'cover' }: Props) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when the URI changes (e.g. after a new upload)
  useEffect(() => {
    setHasError(false);
  }, [uri]);

  if (uri && !hasError) {
    return (
      <Image
        source={{ uri }}
        style={style}
        resizeMode={resizeMode}
        onError={() => setHasError(true)}
      />
    );
  }

  // Extract layout props from style to apply to the placeholder View
  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <View
      style={{
        width: flat.width,
        height: flat.height,
        borderRadius: flat.borderRadius,
        borderTopLeftRadius: flat.borderTopLeftRadius,
        borderTopRightRadius: flat.borderTopRightRadius,
        borderBottomLeftRadius: flat.borderBottomLeftRadius,
        borderBottomRightRadius: flat.borderBottomRightRadius,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name="image-outline" size={iconSize} color="#c7d2fe" />
    </View>
  );
}
