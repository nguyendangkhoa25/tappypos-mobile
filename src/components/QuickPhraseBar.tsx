import { ScrollView, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = {
  phrases: string[];
  onSelect: (phrase: string) => void;
  visible: boolean;
};

export function QuickPhraseBar({ phrases, onSelect, visible }: Props) {
  if (!visible || phrases.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
    >
      {phrases.map((phrase) => (
        <TouchableOpacity
          key={phrase}
          className="bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5"
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(phrase);
          }}
        >
          <Text className="text-indigo-700 text-xs font-medium">{phrase}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
