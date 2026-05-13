import { useRef, useState, forwardRef } from 'react';
import { Animated, TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = Omit<TextInputProps, 'value'> & {
  label: string;
  value: string;
  onClear?: () => void;
};

export const FloatingLabelInput = forwardRef<TextInput, Props>(
  ({ label, value, onFocus, onBlur, onClear, ...rest }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

    const isActive = isFocused || value.length > 0;

    const animate = (toValue: number) => {
      Animated.timing(anim, {
        toValue,
        duration: 180,
        useNativeDriver: false,
      }).start();
    };

    const labelTop  = anim.interpolate({ inputRange: [0, 1], outputRange: [20, -10] });
    const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 12] });
    const labelColor = anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#9ca3af', '#4f46e5'],
    });

    return (
      // marginTop reserves space so the floating label isn't clipped
      <View style={{ marginTop: 8 }}>
        <Animated.Text
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 12,
            top: labelTop,
            fontSize: labelSize,
            color: labelColor,
            backgroundColor: '#f9fafb', // matches bg-gray-50
            paddingHorizontal: 4,
            zIndex: 1,
            fontWeight: isActive ? '600' : '400',
          }}
        >
          {label}
        </Animated.Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: isFocused ? '#4f46e5' : '#e5e7eb',
            borderRadius: 12,
            backgroundColor: '#f9fafb',
            paddingHorizontal: 16,
            paddingVertical: 4,
          }}
        >
          <TextInput
            ref={ref}
            value={value}
            style={{ flex: 1, fontSize: 15, color: '#111827', paddingVertical: 12 }}
            placeholderTextColor="transparent"
            placeholder=" "
            onFocus={(e) => { setIsFocused(true); animate(1); onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); if (!value) animate(0); onBlur?.(e); }}
            {...rest}
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={onClear ?? (() => {})}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  },
);

FloatingLabelInput.displayName = 'FloatingLabelInput';
