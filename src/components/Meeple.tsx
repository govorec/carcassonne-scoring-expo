import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

interface MeepleProps {
  color: string;
  size?: number;
  className?: string;
  image?: any; // changed to any for require() or uri
}

export const Meeple: React.FC<MeepleProps> = ({ color, size = 48, className = "", image }) => {
  if (image) {
    return (
      <View 
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <Image 
          source={image} 
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
    >
      <Path 
        d="M50 5C42 5 35 12 35 20C35 25 38 29 42 32C35 35 25 40 15 45C10 48 5 55 5 62C5 68 10 72 15 72C20 72 25 68 25 62C25 58 28 55 32 55C35 55 38 58 38 62V85C38 92 42 95 48 95H52C58 95 62 92 62 85V62C62 58 65 55 68 55C72 55 75 58 75 62C75 68 80 72 85 72C90 72 95 68 95 62C95 55 90 48 85 45C75 40 65 35 58 32C62 29 65 25 65 20C65 12 58 5 50 5Z" 
        fill={color}
      />
    </Svg>
  );
};
