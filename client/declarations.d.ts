// declarations.d.ts

declare module 'expo-file-system/legacy' {
  export * from 'expo-file-system';
  export { documentDirectory, cacheDirectory, bundleDirectory } from 'expo-file-system/build/legacy/FileSystem';
}

declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.gif' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  const value: any;
  export default value;
}
