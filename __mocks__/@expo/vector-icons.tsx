import React from 'react';
import { Text } from 'react-native';

const icon =
  (fallbackTestID: string) =>
  ({ testID, name, ...props }: any) =>
    <Text testID={testID ?? name ?? fallbackTestID} {...props} />;

export const MaterialCommunityIcons = icon('MaterialCommunityIcons');
export const Ionicons = icon('Ionicons');
export const FontAwesome = icon('FontAwesome');
export const AntDesign = icon('AntDesign');
