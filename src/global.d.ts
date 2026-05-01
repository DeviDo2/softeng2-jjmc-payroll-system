declare module '*.jsx' {
  import * as React from 'react';
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*.js' {
  import * as React from 'react';
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}
