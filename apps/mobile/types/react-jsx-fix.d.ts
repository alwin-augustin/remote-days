// Fix for React 18 JSX component type compatibility
// Overrides JSX.Element check to be more permissive

import 'react';

declare global {
  // Declare process.env for Expo environment variables
  const process: {
    env: {
      EXPO_PUBLIC_API_URL?: string;
      NODE_ENV?: string;
      [key: string]: string | undefined;
    };
  };

  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface IntrinsicAttributes extends React.Attributes {}
    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {}
  }

  // Extend Error constructor with optional captureStackTrace (V8 only)
  interface ErrorConstructor {
    captureStackTrace?(targetObject: object, constructorOpt?: Function): void;
  }
}

export {};

// Override @expo/vector-icons to use permissive types
declare module '@expo/vector-icons' {
  import { FC } from 'react';
  import { StyleProp, TextStyle } from 'react-native';

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
    testID?: string;
    accessible?: boolean;
    accessibilityLabel?: string;
  }

  type IconComponent = FC<IconProps>;

  export const Ionicons: IconComponent;
  export const MaterialIcons: IconComponent;
  export const MaterialCommunityIcons: IconComponent;
  export const FontAwesome: IconComponent;
  export const FontAwesome5: IconComponent;
  export const Feather: IconComponent;
  export const AntDesign: IconComponent;
  export const Entypo: IconComponent;
  export const EvilIcons: IconComponent;
  export const Foundation: IconComponent;
  export const Octicons: IconComponent;
  export const SimpleLineIcons: IconComponent;
  export const Zocial: IconComponent;
}
