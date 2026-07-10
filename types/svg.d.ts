declare module '*.svg' {
  import type { FC, SVGProps } from 'react';
  const Icon: FC<SVGProps<SVGSVGElement>>;
  export default Icon;
}
